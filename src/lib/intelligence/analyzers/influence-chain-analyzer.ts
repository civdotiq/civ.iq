/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Chain Analyzer
 *
 * Stitches existing analyzers into end-to-end narratives showing how
 * lobbying money flows through contributions, committees, and votes.
 * Each chain traces: lobbying → contribution → committee → bill_match → vote.
 *
 * Flow: check cache → fetch data → build chains → peer comparison → narrative → cache
 * Pattern: vote-finance-analyzer.ts
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import {
  resolveFilingEntities,
  getResolvedCommittees,
} from '../entity-resolution/lobbying-committee-resolver';
import { peerComparison, confidenceScore, MIN_PEERS } from '../statistics/civic-stats';
import { LINK_CONFIDENCE } from '../confidence-constants';
import {
  getCurrentElectionCycle,
  freshestDate,
  getBillSectors,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
} from './shared';
import type {
  InfluenceChainInsight,
  InfluenceChain,
  InfluenceChainLink,
  PeerComparison,
} from '../types';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import type { LobbyingFiling } from '@/lib/data-sources/senate-lobbying-api';
import {
  normalizeCompanyName,
  similarityRatio,
  validateTokenOverlap,
} from '@civiq/entity-resolution';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max votes to fetch per session */
const MAX_VOTES = 200;

/** Max contributions to sample from FEC */
const MAX_CONTRIBUTIONS = 500;

/** Max chains to return */
const MAX_CHAINS = 10;

/** Minimum chain confidence to keep */
const MIN_CHAIN_CONFIDENCE = 0.5;

/** Fuzzy match threshold for organization names */
const FUZZY_MATCH_THRESHOLD = 0.8;

/**
 * Map LDA (Lobbying Disclosure Act) issue codes to Congress.gov policyArea strings.
 * These codes appear on Senate lobbying filings (filing.issues[].code).
 * Mapped to policyArea strings so we can reuse getIndustrySectorsForPolicyArea().
 */
const LDA_ISSUE_TO_POLICY_AREA: Record<string, string> = {
  ACC: 'Economics and Public Finance',
  ADV: 'Commerce',
  AER: 'Transportation and Public Works',
  AGR: 'Agriculture and Food',
  ALC: 'Commerce',
  ANI: 'Animals',
  APP: 'Economics and Public Finance',
  ART: 'Arts, Culture, Religion',
  AUT: 'Transportation and Public Works',
  AVI: 'Transportation and Public Works',
  BAN: 'Finance and Financial Sector',
  BNK: 'Finance and Financial Sector',
  BUD: 'Economics and Public Finance',
  CHM: 'Environmental Protection',
  CIV: 'Civil Rights and Liberties, Minority Issues',
  COM: 'Science, Technology, Communications',
  CON: 'Congress',
  CAW: 'Commerce',
  CPT: 'Science, Technology, Communications',
  CSP: 'Science, Technology, Communications',
  DEF: 'Armed Forces and National Security',
  DIS: 'Emergency Management',
  DOC: 'Government Operations and Politics',
  ECN: 'Economics and Public Finance',
  EDU: 'Education',
  ENG: 'Energy',
  ENV: 'Environmental Protection',
  FAM: 'Families',
  FIN: 'Finance and Financial Sector',
  FIR: 'Armed Forces and National Security',
  FOO: 'Agriculture and Food',
  FOR: 'International Affairs',
  FUE: 'Energy',
  GAM: 'Commerce',
  GOV: 'Government Operations and Politics',
  HCR: 'Health',
  HOM: 'Immigration',
  HOU: 'Housing and Community Development',
  IMM: 'Immigration',
  IND: 'Native Americans',
  INS: 'Finance and Financial Sector',
  INT: 'Foreign Trade and International Finance',
  LBR: 'Labor and Employment',
  LAW: 'Law',
  MAN: 'Commerce',
  MAR: 'Transportation and Public Works',
  MED: 'Health',
  MIA: 'Armed Forces and National Security',
  MMM: 'Public Lands and Natural Resources',
  MON: 'Finance and Financial Sector',
  NAT: 'Public Lands and Natural Resources',
  PHA: 'Health',
  POS: 'Government Operations and Politics',
  RES: 'Science, Technology, Communications',
  RET: 'Labor and Employment',
  ROD: 'Transportation and Public Works',
  RRR: 'Transportation and Public Works',
  SCI: 'Science, Technology, Communications',
  SMB: 'Commerce',
  SPO: 'Sports and Recreation',
  TAR: 'Foreign Trade and International Finance',
  TAX: 'Taxation',
  TEC: 'Science, Technology, Communications',
  TOB: 'Health',
  TOR: 'Law',
  TRD: 'Foreign Trade and International Finance',
  TRA: 'Transportation and Public Works',
  TRU: 'Commerce',
  URB: 'Housing and Community Development',
  UNM: 'Labor and Employment',
  UTI: 'Energy',
  VET: 'Armed Forces and National Security',
  WAS: 'Environmental Protection',
  WEL: 'Social Welfare',
};

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis traces public data through lobbying filings, campaign contributions, ' +
  'and voting records. Lobbying and campaign contributions are legal. These patterns do ' +
  'not indicate wrongdoing or improper behavior. Correlation does not indicate causation.';

// ── Main Analyzer ───────────────────────────────────────────────────

/**
 * Analyze influence chains for a legislator.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * On any failure, returns null.
 */
export async function analyzeInfluenceChains(
  bioguideId: string
): Promise<InfluenceChainInsight | null> {
  const cacheKey = `insight:influence_chain:${bioguideId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<InfluenceChainInsight>(cacheKey);
    if (cached) {
      logger.info('[InfluenceChain] Cache hit', { bioguideId });
      trackInsightCacheHit('influence-chains');
      return cached;
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2-10. Fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('influence-chains', () =>
    withTimeout(computeAndCache(bioguideId, cacheKey), ANALYZER_TIMEOUT_MS, 'InfluenceChain')
  );
}

// ── Internal Types ──────────────────────────────────────────────────

interface RepData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  committeeNames: Set<string>;
  committeeCodesByName: Map<string, string>;
}

interface LobbyingOrgSummary {
  name: string;
  registrantId?: string;
  totalSpending: number;
  filingCount: number;
  issueCodes: string[];
  directCommitteeMatch: boolean;
  targetedCommittees: Set<string>; // which of the rep's committees this org targeted
}

interface ContributionMatch {
  organization: string;
  amount: number;
  isExactMatch: boolean;
}

interface RawVote {
  billType: string;
  billNumber: string;
  billCongress: number;
  billTitle: string;
  position: string;
  date: string;
}

interface ClassifiedVote extends RawVote {
  billId: string;
  sectors: IndustrySector[];
}

// ── Core Pipeline ───────────────────────────────────────────────────

async function computeAndCache(
  bioguideId: string,
  cacheKey: string
): Promise<InfluenceChainInsight | null> {
  // 2. Fetch representative data
  const rep = await fetchRepresentative(bioguideId);
  if (!rep) return null;

  // 3. Fetch and filter lobbying filings
  const lobbyingOrgs = await fetchLobbyingOrgs(rep);
  if (lobbyingOrgs.length === 0) {
    logger.info('[InfluenceChain] No lobbying orgs targeting rep committees', { bioguideId });
    return null;
  }

  // 4. Cross-reference with FEC contributions
  const contributionMatches = await fetchContributionMatches(bioguideId, lobbyingOrgs);

  // 5. Fetch and classify votes
  const votes = await fetchAndClassifyVotes(bioguideId, rep.chamber);

  // 6. (Text similarity — null for now)

  // 7. Assemble chains
  const { chains, totalDetected, dropped } = assembleChains(
    lobbyingOrgs,
    contributionMatches,
    rep,
    votes
  );

  if (chains.length === 0) {
    logger.info('[InfluenceChain] No chains met confidence threshold', { bioguideId });
    return null;
  }

  // 8. Peer comparison
  const peer = await computePeerComparison(bioguideId, chains.length, rep.chamber);

  // Compute confidence
  const conf = confidenceScore({
    sampleSize: chains.length,
    minimumSampleSize: 3,
    dataCompleteness:
      contributionMatches.size > 0 && votes.length > 0
        ? Math.min(contributionMatches.size / lobbyingOrgs.length, 1)
        : 0,
    peerCount: peer?.peerCount ?? 0,
  });

  // 9. Generate narrative
  const { narrative, source } = await generateNarrative(rep, chains, peer);

  const sc = new SourceCollector();
  sc.add('Senate LDA filings', '119th Congress');
  sc.add('FEC individual filings', `${getCurrentElectionCycle()} cycle`);
  sc.add('Congress.gov roll calls', '119th Congress', votes.length);

  const insight: InfluenceChainInsight = {
    bioguideId,
    chains,
    totalChainsDetected: totalDetected,
    chainsDropped: dropped,
    peerComparison: peer ?? {
      value: chains.length,
      peerAverage: chains.length,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
    confidenceMethod: 'mixed',
    dataAsOf: freshestDate(...votes.map(v => v.date)),
    methodology:
      'Traces lobbying filings → campaign contributions → committee membership → ' +
      'bill sector classification → voting records. Organization names matched via ' +
      'Levenshtein similarity (threshold > 0.8). Bills classified by sector using ' +
      'AI summaries with keyword fallback.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: chains.length,
      peerAverage: peer?.peerAverage,
      percentileRank: peer?.percentileRank,
      confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
      hasAnomaly: chains.some(c => c.chainConfidence >= 0.8),
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 10. Cache
  await cacheInsight(cacheKey, insight);

  return insight;
}

// ── Step 2: Fetch Representative ────────────────────────────────────

async function fetchRepresentative(bioguideId: string): Promise<RepData | null> {
  try {
    const rep = await getEnhancedRepresentative(bioguideId);
    if (!rep) {
      logger.info('[InfluenceChain] Representative not found', { bioguideId });
      return null;
    }

    const committeeNames = new Set<string>();
    const committeeCodesByName = new Map<string, string>();

    for (const c of rep.committees ?? []) {
      committeeNames.add(c.name);
      const code = (c as Record<string, unknown>).thomas_id ?? (c as Record<string, unknown>).id;
      if (typeof code === 'string' && code) {
        committeeCodesByName.set(c.name, code);
      }
    }

    return {
      name: rep.name,
      party: rep.party,
      state: rep.state,
      chamber: rep.chamber,
      committeeNames,
      committeeCodesByName,
    };
  } catch (error) {
    logger.warn('[InfluenceChain] Failed to fetch representative', {
      bioguideId,
      error: (error as Error).message,
    });
    return null;
  }
}

// ── Step 3: Fetch Lobbying Orgs ─────────────────────────────────────

// Process-level cache for aggregated filings (avoids re-fetching for each rep)
let cachedFilings: import('@/lib/data-sources/senate-lobbying-api').LobbyingFiling[] | null = null;
let cachedFilingsTimestamp = 0;
const FILING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes in-memory

/** Reset in-memory filing cache (exposed for testing) */
export function _resetFilingsCache(): void {
  cachedFilings = null;
  cachedFilingsTimestamp = 0;
}

async function fetchLobbyingOrgs(rep: RepData): Promise<LobbyingOrgSummary[]> {
  try {
    const now = Date.now();
    if (!cachedFilings || now - cachedFilingsTimestamp > FILING_CACHE_TTL) {
      cachedFilings = await senateLobbyingAPI.fetchRecentFilings();
      cachedFilingsTimestamp = now;
    }
    const filings = cachedFilings;
    if (filings.length === 0) return [];

    // Filter filings that target this representative's committees
    const orgMap = new Map<string, LobbyingOrgSummary>();

    for (const filing of filings) {
      const { directMatch, resolved, matchedCommittees } = matchFilingToCommittees(filing, rep);
      if (!directMatch && !resolved) continue;

      const orgName = filing.client.name;
      const existing = orgMap.get(orgName);

      // Track registrant ID for orgs that lobby on their own behalf
      const isSelfLobby =
        filing.registrant?.name &&
        filing.registrant.name.toLowerCase() === filing.client.name.toLowerCase();
      const selfRegistrantId = isSelfLobby ? filing.registrant.id : undefined;

      if (existing) {
        existing.totalSpending += filing.income ?? 0;
        existing.filingCount += 1;
        if (selfRegistrantId && !existing.registrantId) {
          existing.registrantId = selfRegistrantId;
        }
        for (const issue of filing.issues) {
          if (!existing.issueCodes.includes(issue.code)) {
            existing.issueCodes.push(issue.code);
          }
        }
        for (const c of matchedCommittees) existing.targetedCommittees.add(c);
        if (directMatch) existing.directCommitteeMatch = true;
      } else {
        orgMap.set(orgName, {
          name: orgName,
          registrantId: selfRegistrantId,
          totalSpending: filing.income ?? 0,
          filingCount: 1,
          issueCodes: filing.issues.map(i => i.code),
          directCommitteeMatch: directMatch,
          targetedCommittees: new Set(matchedCommittees),
        });
      }
    }

    // Sort by total spending, take top organizations
    return Array.from(orgMap.values())
      .sort((a, b) => b.totalSpending - a.totalSpending)
      .slice(0, 50);
  } catch (error) {
    logger.warn('[InfluenceChain] Lobbying fetch failed', {
      error: (error as Error).message,
    });
    return [];
  }
}

/**
 * Check whether a filing targets any of the representative's committees.
 * Returns whether the match is direct (government_entities mention committee)
 * or resolved (via entity resolution).
 */
function matchFilingToCommittees(
  filing: LobbyingFiling,
  rep: RepData
): { directMatch: boolean; resolved: boolean; matchedCommittees: string[] } {
  const matchedCommittees: string[] = [];

  // Direct check: government_entities mention committee name
  const govEntitiesLower = filing.government_entities.map(e => e.toLowerCase());
  let directMatch = false;

  for (const committeeName of rep.committeeNames) {
    const nameNormalized = committeeName.toLowerCase();
    if (govEntitiesLower.some(e => e.includes(nameNormalized) || nameNormalized.includes(e))) {
      directMatch = true;
      matchedCommittees.push(committeeName);
    }
  }

  if (directMatch) return { directMatch: true, resolved: false, matchedCommittees };

  // Entity resolution: resolve filing entities to committee names
  let resolved = false;
  try {
    const resolutions = resolveFilingEntities(filing.government_entities);
    const resolvedCommittees = getResolvedCommittees(resolutions);
    for (const rc of resolvedCommittees) {
      if (rep.committeeNames.has(rc.committeeName)) {
        resolved = true;
        matchedCommittees.push(rc.committeeName);
      }
    }
  } catch {
    // Resolution failed — skip
  }

  return { directMatch: false, resolved, matchedCommittees };
}

// ── Step 4: Cross-Reference with FEC Contributions ──────────────────

async function fetchContributionMatches(
  bioguideId: string,
  lobbyingOrgs: LobbyingOrgSummary[]
): Promise<Map<string, ContributionMatch>> {
  const matches = new Map<string, ContributionMatch>();

  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) {
    logger.info('[InfluenceChain] No FEC mapping', { bioguideId });
    return matches;
  }

  try {
    const contributions = await fecApiService.getSampleContributions(
      fecId,
      getCurrentElectionCycle(),
      MAX_CONTRIBUTIONS
    );

    if (!contributions || contributions.length === 0) return matches;

    // Normalize all employer names from contributions
    const employerContributions = new Map<string, number>();
    const employerRawNames = new Map<string, string>();

    for (const c of contributions) {
      const employer = c.contributor_employer;
      if (!employer) continue;

      const normalized = normalizeCompanyName(employer);
      if (normalized.length === 0) continue;

      const existing = employerContributions.get(normalized) ?? 0;
      employerContributions.set(normalized, existing + (c.contribution_receipt_amount ?? 0));
      if (!employerRawNames.has(normalized)) {
        employerRawNames.set(normalized, employer);
      }
    }

    // For each lobbying org, find matching employer contributions
    for (const org of lobbyingOrgs) {
      const normalizedOrg = normalizeCompanyName(org.name);
      if (normalizedOrg.length === 0) continue;

      // Check exact match first
      if (employerContributions.has(normalizedOrg)) {
        matches.set(org.name, {
          organization: org.name,
          amount: employerContributions.get(normalizedOrg) ?? 0,
          isExactMatch: true,
        });
        continue;
      }

      // Fuzzy match against all employer names
      let bestRatio = 0;
      let bestEmployer = '';
      let bestAmount = 0;

      for (const [normalized, amount] of employerContributions) {
        const ratio = similarityRatio(normalizedOrg, normalized);
        if (ratio > bestRatio) {
          bestRatio = ratio;
          bestEmployer = normalized;
          bestAmount = amount;
        }
      }

      if (
        bestRatio >= FUZZY_MATCH_THRESHOLD &&
        bestEmployer.length > 0 &&
        validateTokenOverlap(normalizedOrg, bestEmployer)
      ) {
        matches.set(org.name, {
          organization: org.name,
          amount: bestAmount,
          isExactMatch: false,
        });
      }
    }
  } catch (error) {
    logger.warn('[InfluenceChain] Contribution fetch failed', {
      bioguideId,
      error: (error as Error).message,
    });
  }

  return matches;
}

// ── Step 5: Fetch and Classify Votes ────────────────────────────────

async function fetchAndClassifyVotes(
  bioguideId: string,
  chamber: 'House' | 'Senate'
): Promise<ClassifiedVote[]> {
  try {
    const rawVotes = await fetchVotes(bioguideId, chamber);
    if (rawVotes.length === 0) return [];

    const classified: ClassifiedVote[] = [];
    const batchSize = 10;

    for (let i = 0; i < rawVotes.length; i += batchSize) {
      const batch = rawVotes.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async vote => {
          const billId = `${vote.billType}${vote.billNumber}-${vote.billCongress}`;
          const sectors = await getBillSectors(billId, vote.billTitle);
          if (sectors.length === 0) return null;
          return { ...vote, billId, sectors };
        })
      );

      for (const item of results) {
        if (item) classified.push(item);
      }
    }

    return classified;
  } catch (error) {
    logger.warn('[InfluenceChain] Vote classification failed', {
      bioguideId,
      error: (error as Error).message,
    });
    return [];
  }
}

async function fetchVotes(bioguideId: string, chamber: 'House' | 'Senate'): Promise<RawVote[]> {
  try {
    const fetchSession = async (session: 1 | 2) => {
      const rawVotes =
        chamber === 'House'
          ? await batchVotingService.getHouseMemberVotes(bioguideId, 119, session, MAX_VOTES)
          : await batchVotingService.getSenateMemberVotes(bioguideId, 119, session, MAX_VOTES);
      return rawVotes
        .filter(v => v.bill && v.position)
        .map(v => ({
          billType: v.bill?.type ?? '',
          billNumber: String(v.bill?.number ?? ''),
          billCongress: v.bill?.congress ?? 0,
          billTitle: v.bill?.title ?? '',
          position: v.position,
          date: v.date,
        }));
    };

    const [session1, session2] = await Promise.all([fetchSession(1), fetchSession(2)]);
    return [...session1, ...session2];
  } catch (error) {
    logger.warn('[InfluenceChain] Vote fetch failed', {
      bioguideId,
      error: (error as Error).message,
    });
    return [];
  }
}

// ── Step 7: Assemble Chains ─────────────────────────────────────────

interface ChainAssemblyResult {
  chains: InfluenceChain[];
  totalDetected: number;
  dropped: number;
}

function assembleChains(
  lobbyingOrgs: LobbyingOrgSummary[],
  contributionMatches: Map<string, ContributionMatch>,
  rep: RepData,
  votes: ClassifiedVote[]
): ChainAssemblyResult {
  const allChains: InfluenceChain[] = [];

  // Build a sector-to-votes index for efficient lookup
  const sectorVotes = new Map<IndustrySector, ClassifiedVote[]>();
  for (const vote of votes) {
    for (const sector of vote.sectors) {
      const existing = sectorVotes.get(sector) ?? [];
      existing.push(vote);
      sectorVotes.set(sector, existing);
    }
  }

  for (const org of lobbyingOrgs) {
    const contribution = contributionMatches.get(org.name);

    // Get sectors lobbied by this org via issue code → bill sector classification
    const orgSectors = getOrgLobbiedSectors(org);

    // Find votes matching lobbied sectors
    const matchingVotes = findMatchingVotes(orgSectors, sectorVotes);

    for (const vote of matchingVotes) {
      const links = buildChainLinks(org, contribution, rep, vote);
      const hasContributionEvidence = contribution !== undefined;
      let chainConfidence = Math.min(...links.map(l => l.confidence));

      // Chains without contribution evidence are misleading to citizens —
      // they show lobbying → committee → bill → vote links but no evidence
      // that money actually flowed to this representative. Cap confidence
      // below MIN_CHAIN_CONFIDENCE so these chains are filtered out.
      if (!hasContributionEvidence) {
        chainConfidence = Math.min(chainConfidence, 0.4);
      }

      const votePosition = normalizeVotePosition(vote.position);

      allChains.push({
        organization: org.name,
        registrantId: org.registrantId,
        lobbyingSpending: org.totalSpending,
        contributionAmount: contribution?.amount ?? 0,
        billId: vote.billId,
        billTitle: vote.billTitle,
        vote: votePosition,
        textSimilarity: null, // Step 6: null for now
        links,
        chainConfidence,
        hasContributionEvidence,
      });
    }
  }

  const totalDetected = allChains.length;

  // Filter by confidence threshold and cap at MAX_CHAINS
  const validChains = allChains
    .filter(c => c.chainConfidence >= MIN_CHAIN_CONFIDENCE)
    .sort((a, b) => b.chainConfidence - a.chainConfidence)
    .slice(0, MAX_CHAINS);

  return {
    chains: validChains,
    totalDetected,
    dropped: totalDetected - validChains.length,
  };
}

function normalizeVotePosition(position: string): 'yea' | 'nay' | 'not_voting' {
  const lower = position.toLowerCase();
  if (lower === 'yea' || lower === 'aye' || lower === 'yes') return 'yea';
  if (lower === 'nay' || lower === 'no') return 'nay';
  return 'not_voting';
}

/**
 * Determine which sectors an org lobbies on by mapping their LDA issue codes
 * to industry sectors via the policy-area-map.
 *
 * Each lobbying filing carries LDA issue codes (e.g., "HCR" = Healthcare,
 * "DEF" = Defense). We map these to Congress.gov policyArea strings, then
 * use the existing policy-area-map to get corresponding IndustrySector values.
 * This ensures a pharma lobbyist only matches health-sector bills, not defense bills.
 */
function getOrgLobbiedSectors(org: LobbyingOrgSummary): Set<IndustrySector> {
  const sectors = new Set<IndustrySector>();

  for (const code of org.issueCodes) {
    const policyArea = LDA_ISSUE_TO_POLICY_AREA[code];
    if (!policyArea) continue;

    const mappedSectors = getIndustrySectorsForPolicyArea(policyArea);
    for (const s of mappedSectors) {
      sectors.add(s);
    }
  }

  return sectors;
}

/**
 * Find votes whose sectors overlap with the lobbied sectors.
 * Deduplicates by billId to avoid multiple chains per bill per org.
 */
function findMatchingVotes(
  orgSectors: Set<IndustrySector>,
  sectorVotes: Map<IndustrySector, ClassifiedVote[]>
): ClassifiedVote[] {
  const seen = new Set<string>();
  const result: ClassifiedVote[] = [];

  for (const sector of orgSectors) {
    const votesForSector = sectorVotes.get(sector);
    if (!votesForSector) continue;

    for (const vote of votesForSector) {
      if (!seen.has(vote.billId)) {
        seen.add(vote.billId);
        result.push(vote);
      }
    }
  }

  return result;
}

/**
 * Build the chain of links for a single org → bill → vote path.
 */
function buildChainLinks(
  org: LobbyingOrgSummary,
  contribution: ContributionMatch | undefined,
  rep: RepData,
  vote: ClassifiedVote
): InfluenceChainLink[] {
  const links: InfluenceChainLink[] = [];

  // Link 1: Lobbying
  links.push({
    type: 'lobbying',
    label: `${org.name} lobbied committees with $${org.totalSpending.toLocaleString()} in spending`,
    confidence: org.directCommitteeMatch ? 0.9 : 0.7,
    data: {
      organization: org.name,
      spending: org.totalSpending,
      filingCount: org.filingCount,
      issueCodes: org.issueCodes,
    },
  });

  // Link 2: Contribution (if matched)
  if (contribution) {
    links.push({
      type: 'contribution',
      label: `Employees of ${org.name} contributed $${contribution.amount.toLocaleString()}`,
      confidence: contribution.isExactMatch ? 0.9 : 0.6,
      data: {
        amount: contribution.amount,
        matchType: contribution.isExactMatch ? 'exact' : 'fuzzy',
      },
    });
  }

  // Link 3: Committee — use the committee this org actually targeted
  const committeeName = findMatchingCommittee(org, rep);
  const committeeCode = rep.committeeCodesByName.get(committeeName);

  links.push({
    type: 'committee',
    label: `${rep.name} sits on ${committeeName}`,
    confidence: LINK_CONFIDENCE.committee,
    data: {
      committeeName,
      committeeCode: committeeCode ?? null,
    },
  });

  // Link 4: Bill match
  links.push({
    type: 'bill_match',
    label: `${vote.billTitle} classified in lobbied sectors`,
    confidence: LINK_CONFIDENCE.billSectorMatch,
    data: {
      billId: vote.billId,
      billTitle: vote.billTitle,
      sectors: vote.sectors,
    },
  });

  // Link 5: Vote
  links.push({
    type: 'vote',
    label: `${rep.name} voted ${vote.position} on ${vote.billId}`,
    confidence: LINK_CONFIDENCE.vote,
    data: {
      position: vote.position,
      date: vote.date,
      billId: vote.billId,
    },
  });

  return links;
}

/**
 * Return the committee that this lobbying org actually targeted.
 * Falls back to the rep's first committee if no specific match is tracked.
 */
function findMatchingCommittee(org: LobbyingOrgSummary, rep: RepData): string {
  // Prefer the committee this specific org targeted via lobbying filings
  for (const name of org.targetedCommittees) {
    if (rep.committeeNames.has(name)) return name;
  }
  // Fallback: first committee
  for (const name of rep.committeeNames) {
    return name;
  }
  return 'Unknown Committee';
}

// ── Step 8: Peer Comparison ─────────────────────────────────────────

async function computePeerComparison(
  bioguideId: string,
  chainCount: number,
  chamber: 'House' | 'Senate'
): Promise<PeerComparison | null> {
  const myKey = `influence-chain-count:${chamber}:${bioguideId}`;

  // Cache this rep's chain count
  try {
    await getRedisCache().set(myKey, chainCount, CACHE_TTL);
  } catch {
    // Non-fatal
  }

  // Look up cached chain counts for peers in same chamber
  const pattern = `influence-chain-count:${chamber}:*`;

  try {
    const keys = await getRedisCache().keys(pattern);
    const peerKeys = keys.filter(k => !k.endsWith(`:${bioguideId}`));

    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(chainCount, peerScores, `${chamber} members`);
  } catch {
    return null;
  }
}

// ── Step 9: Narrative ───────────────────────────────────────────────

async function generateNarrative(
  rep: RepData,
  chains: InfluenceChain[],
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns in lobbying, ' +
    'campaign finance, and voting records. Never claim causation. ';

  const uniqueOrgs = [...new Set(chains.map(c => c.organization))];
  const totalLobbyingSpending = chains.reduce((sum, c) => sum + c.lobbyingSpending, 0);
  const totalContributions = chains.reduce((sum, c) => sum + c.contributionAmount, 0);
  const avgConfidence =
    chains.length > 0 ? chains.reduce((sum, c) => sum + c.chainConfidence, 0) / chains.length : 0;

  const topChainLines = chains
    .slice(0, 5)
    .map(
      c =>
        `- ${c.organization}: $${c.lobbyingSpending.toLocaleString()} lobbying, ` +
        `$${c.contributionAmount.toLocaleString()} contributions, ` +
        `voted ${c.vote} on ${c.billId} (confidence: ${(c.chainConfidence * 100).toFixed(0)}%)`
    )
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: ${chains.length} chains detected. ` +
      `The average for ${peer.peerGroupLabel} is ${peer.peerAverage.toFixed(1)} ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from other members).';

  const userPrompt = `LEGISLATOR: ${rep.name} (${rep.party}-${rep.state}), ${rep.chamber}
INFLUENCE CHAINS DETECTED: ${chains.length}
UNIQUE ORGANIZATIONS: ${uniqueOrgs.length}
TOTAL LOBBYING SPENDING: $${totalLobbyingSpending.toLocaleString()}
TOTAL EMPLOYEE CONTRIBUTIONS: $${totalContributions.toLocaleString()}
AVERAGE CHAIN CONFIDENCE: ${(avgConfidence * 100).toFixed(1)}%

TOP CHAINS:
${topChainLines || 'No chains available.'}

${peerLine}

Write a 2-3 sentence plain-language summary. Describe the patterns found between lobbying activity, campaign contributions, and voting records. If peer comparison is available, note how this legislator compares. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalFallback(rep, chains, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[InfluenceChain]');
}

function buildStatisticalFallback(
  rep: RepData,
  chains: InfluenceChain[],
  peer: PeerComparison | null
): string {
  const uniqueOrgs = [...new Set(chains.map(c => c.organization))];
  const totalLobbyingSpending = chains.reduce((sum, c) => sum + c.lobbyingSpending, 0);

  let summary =
    `${chains.length} association chains were traced between lobbying organizations, ` +
    `campaign contributions, and voting records for ${rep.name}. ` +
    `${uniqueOrgs.length} organizations with $${totalLobbyingSpending.toLocaleString()} in ` +
    `lobbying spending were associated with bills the legislator voted on.`;

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary +=
      ` The average for ${peer.peerGroupLabel} is ` + `${peer.peerAverage.toFixed(1)} chains.`;
  }

  return summary;
}

// ── Cache Helper ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: InfluenceChainInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[InfluenceChain] Cached insight', {
      bioguideId: insight.bioguideId,
      confidence: insight.confidence,
      chainCount: insight.chains.length,
    });
  } catch {
    // Non-fatal
  }
}

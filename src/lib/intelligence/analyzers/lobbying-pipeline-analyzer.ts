/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Lobbying-Committee-Legislation Pipeline Analyzer (Insight 4)
 *
 * Traces: lobbying expenditures → committee activity → legislative output.
 * Answers: "Who is lobbying this committee, on what issues, and what bills
 * align with those lobbied issues?"
 *
 * Flow: check cache → fetch filings → resolve entities → filter to committee →
 *       group by issue → fetch bills → match bills to issues → peer comparison →
 *       AI narrative → cache → fallback
 *
 * Pattern: finance-jurisdiction-analyzer.ts
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { cachedFetch } from '@/lib/cache';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import {
  freshestDate,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
  peerComparisonUnavailable,
} from './shared';
import {
  ALL_COMMITTEE_MAPPINGS,
  type CommitteeMapping,
} from '@/lib/connections/committee-agency-map';
import { senateLobbyingAPI, type LobbyingFiling } from '@/lib/data-sources/senate-lobbying-api';
import {
  resolveFilingEntities,
  getResolvedCommittees,
} from '../entity-resolution/lobbying-committee-resolver';
import {
  getLDAIssueLabel,
  getPolicyAreasForLDAIssue,
} from '../entity-resolution/lda-issue-policy-map';
import {
  peerComparison,
  confidenceScore,
  MIN_FILINGS_LOBBYING,
  MIN_PEERS,
} from '../statistics/civic-stats';
import { classifyStance } from '../embeddings/stance-classifier';
import type {
  LobbyingPipelineInsight,
  LobbyingOrganizationActivity,
  MatchedBill,
  TimelineAlignment,
  PeerComparison,
  StanceClassification,
} from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public lobbying disclosure data. ' +
  'Lobbying is legal and protected by the First Amendment. ' +
  'The presence of lobbying activity does not indicate improper behavior. ' +
  'Bill introduction may be unrelated to lobbying activity. ' +
  'Correlation does not indicate causation.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze the lobbying pipeline for a congressional committee.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * Returns null if insufficient data (fewer than MIN_FILINGS_LOBBYING filings).
 */
export async function analyzeLobbyingPipeline(
  committeeCode: string
): Promise<LobbyingPipelineInsight | null> {
  const cacheKey = `insight:lobbying_pipeline:${committeeCode}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<LobbyingPipelineInsight>(cacheKey);
    if (cached) {
      logger.info('[LobbyingPipeline] Cache hit', { committeeCode });
      trackInsightCacheHit('lobbying-pipeline');
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-8. Validate, fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('lobbying-pipeline', () =>
    withTimeout(computeAndCache(committeeCode, cacheKey), ANALYZER_TIMEOUT_MS, 'LobbyingPipeline')
  );
}

async function computeAndCache(
  committeeCode: string,
  cacheKey: string
): Promise<LobbyingPipelineInsight | null> {
  // 2. Validate committee
  const committeeMapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === committeeCode);
  if (!committeeMapping) {
    logger.warn('[LobbyingPipeline] Unknown committee code', { committeeCode });
    return null;
  }

  // 3. Fetch and process data
  const data = await fetchAndResolve(committeeCode, committeeMapping);
  if (!data) {
    return null;
  }

  // 4. Compute statistics
  const stats = await computeStatistics(data);

  // 5. Peer comparison
  const peer = await computePeerComparison(committeeCode, stats.totalSpending, committeeMapping);

  // 5b. Recompute confidence with actual peer count
  if (peer) {
    stats.confidence = confidenceScore({
      sampleSize: stats.topOrganizations.reduce((sum, o) => sum + o.filingCount, 0),
      minimumSampleSize: MIN_FILINGS_LOBBYING,
      dataCompleteness: Math.min(stats.issueAlignments.length / 3, 1),
      peerCount: peer.peerCount,
    });
  }

  // 6. Fetch and match bills to enrich issue alignments
  const { alignments, totalMatchedBills } = await fetchAndMatchBills(stats.issueAlignments);
  stats.issueAlignments = alignments;
  stats.matchedBillCount = totalMatchedBills;

  // 7. Generate insight
  const { narrative, source } = await generateNarrative(committeeMapping, stats, peer);

  const sc = new SourceCollector();
  sc.add('Senate LDA filings', '119th Congress', data.matchedFilings.length);
  sc.add('Congress.gov bills', '119th Congress', stats.matchedBillCount);

  const insight: LobbyingPipelineInsight = {
    committeeCode,
    committeeName: committeeMapping.committeeName,
    chamber: committeeMapping.chamber,
    totalSpending: stats.totalSpending,
    organizationCount: stats.organizationCount,
    matchedBillCount: stats.matchedBillCount,
    topOrganizations: stats.topOrganizations,
    issueAlignments: stats.issueAlignments,
    peerComparison: peer,
    ...(peer
      ? {}
      : {
          peerComparisonUnavailableReason: peerComparisonUnavailable(
            `other ${committeeMapping.chamber} committees`
          ),
        }),
    narrative,
    confidence:
      source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(
      ...stats.issueAlignments.flatMap(a => a.matchedBills.map(b => b.introducedDate)),
      ...data.matchedFilings.map(f => `${f.filingYear}-12-31`)
    )!,
    methodology:
      'Lobbying filings matched to committees via entity resolution of LDA government_entities field. ' +
      'Bills matched via LDA issue code to Congress.gov policyArea mapping. ' +
      'Data from Senate LDA disclosures and Congress.gov.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: stats.totalSpending,
      peerAverage: peer?.peerAverage,
      percentileRank: peer?.percentileRank,
      confidence:
        source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 8. Cache
  await cacheInsight(cacheKey, insight);
  await cacheLobbyingScore(committeeCode, stats.totalSpending);

  return insight;
}

// ── Data Fetching & Resolution ───────────────────────────────────────

interface ResolvedData {
  matchedFilings: LobbyingFiling[];
  totalFilings: number;
}

async function fetchAndResolve(
  committeeCode: string,
  _mapping: CommitteeMapping
): Promise<ResolvedData | null> {
  let allFilings: LobbyingFiling[];
  try {
    allFilings = await senateLobbyingAPI.fetchRecentFilings();
  } catch {
    logger.warn('[LobbyingPipeline] Failed to fetch LDA filings', { committeeCode });
    return null;
  }

  if (allFilings.length === 0) {
    logger.info('[LobbyingPipeline] No filings available', { committeeCode });
    return null;
  }

  // Resolve government_entities in each filing and filter to those mentioning target committee
  const matchedFilings: LobbyingFiling[] = [];

  for (const filing of allFilings) {
    if (!Array.isArray(filing.government_entities) || filing.government_entities.length === 0) {
      continue;
    }

    const resolutions = resolveFilingEntities(filing.government_entities);
    const resolvedCommittees = getResolvedCommittees(resolutions);

    const mentionsTarget = resolvedCommittees.some(c => c.committeeCode === committeeCode);
    if (mentionsTarget) {
      matchedFilings.push(filing);
    }
  }

  if (matchedFilings.length < MIN_FILINGS_LOBBYING) {
    logger.info('[LobbyingPipeline] Insufficient filings for committee', {
      committeeCode,
      matchedCount: matchedFilings.length,
      minimum: MIN_FILINGS_LOBBYING,
    });
    return null;
  }

  logger.info('[LobbyingPipeline] Entity resolution complete', {
    committeeCode,
    totalFilings: allFilings.length,
    matchedFilings: matchedFilings.length,
  });

  return { matchedFilings, totalFilings: allFilings.length };
}

// ── Statistical Computation ──────────────────────────────────────────

interface ComputedStats {
  totalSpending: number;
  organizationCount: number;
  matchedBillCount: number;
  topOrganizations: LobbyingOrganizationActivity[];
  issueAlignments: TimelineAlignment[];
  confidence: number;
}

async function computeStatistics(data: ResolvedData): Promise<ComputedStats> {
  const { matchedFilings } = data;

  // Group by organization
  const orgMap = new Map<
    string,
    { spending: number; filingCount: number; issueCodes: Set<string>; registrantId?: string }
  >();

  for (const filing of matchedFilings) {
    const orgName = filing.client.name;
    const existing = orgMap.get(orgName) ?? { spending: 0, filingCount: 0, issueCodes: new Set() };
    existing.spending += filing.income || 0;
    existing.filingCount += 1;
    // Track registrant ID for self-lobbying orgs (registrant === client)
    if (
      !existing.registrantId &&
      filing.registrant?.name &&
      filing.registrant.name.toLowerCase() === filing.client.name.toLowerCase()
    ) {
      existing.registrantId = filing.registrant.id;
    }
    for (const issue of filing.issues) {
      existing.issueCodes.add(issue.code);
    }
    orgMap.set(orgName, existing);
  }

  const topOrganizations: LobbyingOrganizationActivity[] = Array.from(orgMap.entries())
    .map(([name, data]) => ({
      name,
      registrantId: data.registrantId,
      totalSpending: data.spending,
      filingCount: data.filingCount,
      issueCodes: Array.from(data.issueCodes),
    }))
    .sort((a, b) => b.totalSpending - a.totalSpending)
    .slice(0, 15);

  // Classify stance for top organizations using their specific_issues text
  await classifyOrganizationStances(topOrganizations, matchedFilings);

  const totalSpending = Array.from(orgMap.values()).reduce((sum, o) => sum + o.spending, 0);
  const organizationCount = orgMap.size;

  // Group by LDA issue code
  const issueMap = new Map<string, { spending: number; orgs: Set<string> }>();

  for (const filing of matchedFilings) {
    for (const issue of filing.issues) {
      const existing = issueMap.get(issue.code) ?? { spending: 0, orgs: new Set() };
      existing.spending += filing.income || 0;
      existing.orgs.add(filing.client.name);
      issueMap.set(issue.code, existing);
    }
  }

  // Build issue alignments (bills fetched separately)
  const issueAlignments: TimelineAlignment[] = Array.from(issueMap.entries())
    .map(([code, data]) => ({
      issueCode: code,
      issueLabel: getLDAIssueLabel(code),
      lobbyingSpending: data.spending,
      organizationCount: data.orgs.size,
      matchedBills: [], // Populated in fetchAndMatchBills
    }))
    .sort((a, b) => b.lobbyingSpending - a.lobbyingSpending);

  const confidence = confidenceScore({
    sampleSize: matchedFilings.length,
    minimumSampleSize: MIN_FILINGS_LOBBYING,
    dataCompleteness: Math.min(issueAlignments.length / 3, 1),
    peerCount: 0, // Updated after peer comparison
  });

  return {
    totalSpending,
    organizationCount,
    matchedBillCount: 0, // Updated after bill fetch
    topOrganizations,
    issueAlignments,
    confidence,
  };
}

// ── Stance Classification ────────────────────────────────────────────

async function classifyOrganizationStances(
  orgs: LobbyingOrganizationActivity[],
  filings: LobbyingFiling[]
): Promise<void> {
  // Build a map of org name → concatenated specific_issues text
  const orgIssueText = new Map<string, string>();
  for (const filing of filings) {
    const issues = Array.isArray(filing.specific_issues) ? filing.specific_issues : [];
    if (issues.length === 0) continue;
    const orgName = filing.client.name;
    const existing = orgIssueText.get(orgName) ?? '';
    orgIssueText.set(orgName, existing + ' ' + issues.join(' '));
  }

  // Classify stance for each top org (non-blocking, best-effort)
  const stancePromises = orgs.map(async org => {
    const text = orgIssueText.get(org.name)?.trim();
    if (!text || text.length < 20) return; // Skip if insufficient text

    try {
      const stance = await classifyStance(text.substring(0, 1000), 'lobbying');
      if (stance) {
        org.stance = stance;
      }
    } catch {
      // Non-fatal — org just won't have stance data
    }
  });

  await Promise.all(stancePromises);
}

// ── Bill Fetching & Matching ─────────────────────────────────────────

interface CongressBillListItem {
  congress: number;
  type: string;
  number: number;
  title: string;
  introducedDate: string;
  policyArea?: { name: string };
  latestAction?: { actionDate: string; text: string };
  url: string;
}

/**
 * Fetch recent bills and match to lobbied issues via policyArea.
 * Uses the overfetch-and-filter pattern from spending/agency/[agencySlug]/bills/route.ts.
 */
async function fetchAndMatchBills(
  issueAlignments: TimelineAlignment[]
): Promise<{ alignments: TimelineAlignment[]; totalMatchedBills: number }> {
  // Collect all policyAreas needed from issue codes
  const neededPolicyAreas = new Set<string>();
  const issueToPolicy = new Map<string, Set<string>>();

  for (const alignment of issueAlignments) {
    const policyAreas = getPolicyAreasForLDAIssue(alignment.issueCode);
    const normalized = new Set(policyAreas.map(pa => pa.toLowerCase()));
    issueToPolicy.set(alignment.issueCode, normalized);
    for (const pa of policyAreas) {
      neededPolicyAreas.add(pa.toLowerCase());
    }
  }

  if (neededPolicyAreas.size === 0) {
    return { alignments: issueAlignments, totalMatchedBills: 0 };
  }

  // Fetch bills from Congress.gov
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    logger.warn('[LobbyingPipeline] No Congress.gov API key, skipping bill matching');
    return { alignments: issueAlignments, totalMatchedBills: 0 };
  }

  let allBills: CongressBillListItem[] = [];
  try {
    allBills = await cachedFetch(
      'lobbying-pipeline-bills-recent',
      async () => {
        const url = new URL('https://api.congress.gov/v3/bill');
        url.searchParams.set('format', 'json');
        url.searchParams.set('limit', '250');
        url.searchParams.set('sort', 'updateDate+desc');

        const response = await fetch(url.toString(), {
          headers: {
            'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
            Accept: 'application/json',
            'X-API-Key': apiKey,
          },
          // Bound the request: without a timeout a hung/slow Congress.gov
          // connection can consume the full function budget. 15s is generous
          // for a single 250-bill list call; on timeout the outer catch
          // degrades gracefully to "no matched bills".
          signal: AbortSignal.timeout(15000),
        });

        if (!response.ok) {
          throw new Error(`Congress.gov API returned ${response.status}`);
        }

        const data = await response.json();
        return (data.bills ?? []) as CongressBillListItem[];
      },
      2 * 60 * 60 * 1000 // 2 hour cache
    );
  } catch (error) {
    logger.warn('[LobbyingPipeline] Congress.gov bill fetch failed', {
      error: (error as Error).message,
    });
    return { alignments: issueAlignments, totalMatchedBills: 0 };
  }

  // Filter bills by policyArea and assign to issue alignments
  const billsByPolicyArea = new Map<string, CongressBillListItem[]>();
  for (const bill of allBills) {
    const pa = bill.policyArea?.name?.toLowerCase();
    if (pa && neededPolicyAreas.has(pa)) {
      const existing = billsByPolicyArea.get(pa) ?? [];
      existing.push(bill);
      billsByPolicyArea.set(pa, existing);
    }
  }

  let totalMatchedBills = 0;
  const seenBillIds = new Set<string>();

  const updatedAlignments = issueAlignments.map(alignment => {
    const policyAreas = issueToPolicy.get(alignment.issueCode);
    if (!policyAreas) return alignment;

    const matchedBills: MatchedBill[] = [];

    for (const pa of policyAreas) {
      const bills = billsByPolicyArea.get(pa) ?? [];
      for (const bill of bills) {
        const billId = `${bill.congress}-${bill.type.toLowerCase()}-${bill.number}`;
        if (!seenBillIds.has(billId)) {
          seenBillIds.add(billId);
          matchedBills.push({
            id: billId,
            title: bill.title,
            type: bill.type,
            number: bill.number.toString(),
            congress: bill.congress,
            policyArea: bill.policyArea?.name ?? '',
            introducedDate: bill.introducedDate,
            matchedIssueCodes: [alignment.issueCode],
          });
        }
      }
    }

    totalMatchedBills += matchedBills.length;

    return {
      ...alignment,
      matchedBills: matchedBills.slice(0, 10), // Top 10 per issue
    };
  });

  return { alignments: updatedAlignments, totalMatchedBills };
}

// ── Peer Comparison ──────────────────────────────────────────────────

function lobbyingScoreCacheKey(committeeCode: string): string {
  return `lobbying-score:${committeeCode}`;
}

async function cacheLobbyingScore(committeeCode: string, totalSpending: number): Promise<void> {
  try {
    await getRedisCache().set(lobbyingScoreCacheKey(committeeCode), totalSpending, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  committeeCode: string,
  totalSpending: number,
  mapping: CommitteeMapping
): Promise<PeerComparison | null> {
  const chamber = mapping.chamber;
  const sameChamber = ALL_COMMITTEE_MAPPINGS.filter(
    m => m.chamber === chamber && m.committeeCode !== committeeCode
  );

  try {
    const peerCacheKeys = sameChamber.map(p => lobbyingScoreCacheKey(p.committeeCode));
    if (peerCacheKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerCacheKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) {
      return null;
    }

    return peerComparison(totalSpending, peerScores, `${chamber} committees`);
  } catch {
    return null;
  }
}

// ── AI Narrative ─────────────────────────────────────────────────────

async function generateNarrative(
  mapping: CommitteeMapping,
  stats: ComputedStats,
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    'lobbying activity and legislative output. ';

  const topIssueLines = stats.issueAlignments
    .slice(0, 5)
    .map(
      a =>
        `- ${a.issueLabel} (${a.issueCode}): $${a.lobbyingSpending.toLocaleString()} from ${a.organizationCount} organizations, ${a.matchedBills.length} related bills`
    )
    .join('\n');

  const topOrgLines = stats.topOrganizations
    .slice(0, 5)
    .map(o => `- ${o.name}: $${o.totalSpending.toLocaleString()} across ${o.filingCount} filings`)
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: Total lobbying spending mentioning the ${mapping.committeeName} committee is $${stats.totalSpending.toLocaleString()}. ` +
      `The average for ${peer.peerGroupLabel} is $${peer.peerAverage.toLocaleString()} ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from other committees).';

  const userPrompt = `COMMITTEE: ${mapping.chamber} ${mapping.committeeName} Committee (${mapping.committeeCode})

LOBBYING SUMMARY:
- Total spending mentioning this committee: $${stats.totalSpending.toLocaleString()}
- Unique organizations: ${stats.organizationCount}
- Matched bills: ${stats.matchedBillCount}

TOP LOBBYING ISSUES:
${topIssueLines}

TOP ORGANIZATIONS:
${topOrgLines}

${peerLine}

Write a 2-3 sentence plain-language summary of these factual patterns. State the total lobbying spending and number of organizations. Note which issues receive the most lobbying activity. If bills match lobbied issues, note how many. If peer comparison is available, note whether this committee receives more or less lobbying than the average. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(mapping, stats, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[LobbyingPipeline]');
}

// ── Fallback ─────────────────────────────────────────────────────────

function buildStatisticalSummary(
  mapping: CommitteeMapping,
  stats: ComputedStats,
  peer: PeerComparison | null
): string {
  const topIssue = stats.issueAlignments[0];

  let summary =
    `${stats.organizationCount} organizations spent a total of $${stats.totalSpending.toLocaleString()} ` +
    `on lobbying that mentions the ${mapping.chamber} ${mapping.committeeName} Committee.`;

  if (topIssue) {
    summary +=
      ` The most lobbied issue is ${topIssue.issueLabel}, with $${topIssue.lobbyingSpending.toLocaleString()} ` +
      `from ${topIssue.organizationCount} organizations.`;
  }

  if (stats.matchedBillCount > 0) {
    summary += ` ${stats.matchedBillCount} recent bills align with lobbied issue areas.`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary += ` The average lobbying spending for ${peer.peerGroupLabel} is $${peer.peerAverage.toLocaleString()}.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: LobbyingPipelineInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[LobbyingPipeline] Cached insight', {
      committeeCode: insight.committeeCode,
      confidence: insight.confidence,
    });
  } catch {
    // Non-fatal
  }
}

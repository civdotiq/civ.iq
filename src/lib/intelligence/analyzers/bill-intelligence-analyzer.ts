/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Intelligence Analyzer
 *
 * Analyzes sponsor/cosponsor funding sources relative to the bill's
 * policy area, and summarizes related lobbying activity.
 * Answers: "Who funds the sponsors of this bill, and do those funders
 * align with the bill's affected sectors?"
 *
 * Flow: check cache → fetch bill → map sectors → analyze sponsor → analyze cosponsors → AI narrative → cache
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateByIndustrySector, type IndustrySector } from '@/lib/fec/industry-taxonomy';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { analyzeLobbyingPipeline } from './lobbying-pipeline-analyzer';
import { computeBillLobbyingSimilarity } from '../embeddings/bill-lobbying-similarity';
import { senateLobbyingAPI } from '@/lib/data-sources/senate-lobbying-api';
import { reportedFilingAmount } from '@/lib/data-sources/lda-filing-amounts';
import {
  getCurrentElectionCycle,
  findCommitteeMapping,
  freshestDate,
  generateInsightNarrative,
  withTimeout,
  getBillSectors,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
} from './shared';
import { classifyBillSectors } from '../embeddings';
import { confidenceScore } from '../statistics/civic-stats';
import type { BillIntelligenceInsight, BillLobbyingSimilarity } from '../types';
import type { Bill, BillVote } from '@/types/bill';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max cosponsors to analyze (top by date) */
const MAX_COSPONSORS = 10;

/** Story context extracted from bill data — zero additional API calls. */
interface StoryContext {
  voteOutcome?: BillIntelligenceInsight['voteOutcome'];
  billProgress?: BillIntelligenceInsight['billProgress'];
  fiscalImpact?: string;
  relatedBillCount: number;
  bipartisanCosponsorship: boolean;
  topLobbyingOrgNames: string[];
}

const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'Campaign contributions are legal and do not indicate wrongdoing. ' +
  'Sponsor funding sources do not imply improper motivation for legislation. ' +
  'Correlation does not indicate causation or improper behavior.';

// ── Main Analyzer ────────────────────────────────────────────────────

export async function analyzeBillIntelligence(
  billId: string
): Promise<BillIntelligenceInsight | null> {
  const cacheKey = `insight:bill_intelligence:${billId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<BillIntelligenceInsight>(cacheKey);
    if (cached) {
      logger.info('[BillIntelligence] Cache hit', { billId });
      trackInsightCacheHit('bill-intelligence');
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-9. Fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('bill-intelligence', () =>
    withTimeout(computeAndCache(billId, cacheKey), ANALYZER_TIMEOUT_MS, 'BillIntelligence')
  );
}

async function computeAndCache(
  billId: string,
  cacheKey: string
): Promise<BillIntelligenceInsight | null> {
  // 2. Fetch bill data
  const bill = await fetchBillFromCongress(billId);
  if (!bill) {
    logger.info('[BillIntelligence] Bill not found', { billId });
    return null;
  }

  const policyArea = bill.policyArea;

  // 3. Map policy area to industry sectors
  // Step A: Try embedding classifier (gives both sectors AND confidence scores for UI)
  const mlClassification = await classifyBillSectors(bill.title).catch(
    () => [] as Array<{ sector: IndustrySector; confidence: number }>
  );
  const mlSectors = mlClassification.map(c => c.sector);

  // Step B: Only run broader fallback chain if embedding returned nothing
  let affectedSectors: IndustrySector[];
  let usedMLClassification = false;

  if (mlSectors.length > 0) {
    affectedSectors = mlSectors;
    usedMLClassification = true;
  } else {
    // Broader fallback: embedding → zero-shot → keyword inference
    const mlFallback = await getBillSectors(bill.number || billId, bill.title).catch(
      () => [] as IndustrySector[]
    );
    const staticSectors = policyArea ? getIndustrySectorsForPolicyArea(policyArea) : [];
    affectedSectors = mlFallback.length > 0 ? mlFallback : staticSectors;
  }

  if (affectedSectors.length === 0) {
    logger.info('[BillIntelligence] No sectors from ML or static', { billId });
    return null;
  }

  // Confidence-scored sectors for the UI — only when affectedSectors came from
  // the same ML classification, so pills and analysis always agree
  const classifiedSectors = usedMLClassification ? mlClassification : [];

  // 4. Analyze sponsor, cosponsors, enrichment, and lobbying — all in parallel
  const sponsorBioguide = bill.sponsor.representative.bioguideId;
  const cycle = getCurrentElectionCycle();
  const cosponsorsToAnalyze = bill.cosponsors.filter(c => !c.withdrawn).slice(0, MAX_COSPONSORS);

  const [
    sponsorAnalysis,
    financialSummary,
    enhancedRep,
    cosponsorResults,
    lobbyingData,
    lobbyingSimilarity,
  ] = await Promise.all([
    analyzeMemberSectorDonations(
      sponsorBioguide,
      bill.sponsor.representative.name,
      bill.sponsor.representative.party,
      affectedSectors
    ),
    fetchFinancialSummary(sponsorBioguide, cycle),
    fetchEnhancedRepresentative(sponsorBioguide),
    Promise.all(
      cosponsorsToAnalyze.map(c =>
        analyzeMemberSectorDonations(
          c.representative.bioguideId,
          c.representative.name,
          c.representative.party,
          affectedSectors
        ).catch(() => null)
      )
    ),
    getRelatedLobbyingData(bill.committees),
    policyArea
      ? fetchLobbyingSimilarity(billId, bill.title, policyArea).catch(() => null)
      : Promise.resolve(null),
  ]);

  const validCosponsorResults = cosponsorResults.filter(
    (r): r is NonNullable<typeof r> => r !== null
  );
  const avgCosponsorPct =
    validCosponsorResults.length > 0
      ? validCosponsorResults.reduce((sum, r) => sum + r.sectorDonationPercentage, 0) /
        validCosponsorResults.length
      : 0;

  const cosponsorSummary = {
    totalCosponsors: bill.cosponsors.filter(c => !c.withdrawn).length,
    analyzedCosponsors: validCosponsorResults.length,
    avgSectorDonationPercentage: avgCosponsorPct,
  };

  const { lobbyingSpending, lobbyingOrgs, topOrgNames } = lobbyingData;

  // 6b. Extract story context from bill object (zero additional API calls)
  const storyContext = computeStoryContext(bill, topOrgNames);

  // 6c. Compute sponsor-committee connection
  const sponsorCommitteeConnection = computeSponsorCommitteeConnection(
    bill.committees,
    enhancedRep?.committees
  );

  // 6d. Sponsor funding context
  const sponsorFundingContext = financialSummary
    ? { totalRaised: financialSummary, cycle }
    : undefined;

  // 7. Compute confidence — enriched data increases completeness
  const dataCompleteness = computeDataCompleteness(
    sponsorAnalysis,
    storyContext,
    sponsorCommitteeConnection,
    sponsorFundingContext
  );
  const conf = confidenceScore({
    sampleSize: affectedSectors.length,
    minimumSampleSize: 1,
    dataCompleteness,
    peerCount: validCosponsorResults.length,
  });

  // 8. Generate narrative with enriched context
  // Use policyArea when available; fall back to sector names so narrative reads naturally
  const effectivePolicyArea = policyArea ?? affectedSectors.slice(0, 2).join(' and ');
  const { narrative, source } = await generateNarrative(
    bill.title,
    effectivePolicyArea,
    affectedSectors,
    sponsorAnalysis,
    cosponsorSummary,
    lobbyingSpending,
    lobbyingOrgs,
    storyContext,
    sponsorCommitteeConnection,
    sponsorFundingContext,
    lobbyingSimilarity
  );

  const sc = new SourceCollector();
  sc.add('FEC individual filings', `${getCurrentElectionCycle()} cycle`);
  sc.add('Congress.gov bills', '119th Congress');
  sc.add('Senate LDA filings', '119th Congress', lobbyingOrgs);
  if (storyContext.voteOutcome) sc.add('Congress.gov roll calls', '119th Congress');

  const insight: BillIntelligenceInsight = {
    billId,
    billTitle: bill.title,
    policyArea: effectivePolicyArea,
    affectedSectors,
    sponsorAnalysis,
    cosponsorSummary,
    relatedLobbyingSpending: lobbyingSpending,
    relatedLobbyingOrgs: lobbyingOrgs,
    narrative,
    confidence: conf,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(bill.introducedDate, bill.status.lastAction.date)!,
    methodology:
      'Sponsor/cosponsor campaign contributions aggregated by industry sector from FEC filings. ' +
      (usedMLClassification
        ? 'Sectors identified by analyzing the bill text with an embedding model. '
        : 'Sectors mapped via Congress.gov policy areas. ') +
      'Lobbying data from Senate LDA disclosures matched to bill committees.' +
      (storyContext.voteOutcome ? ' Vote data from Congress.gov roll calls.' : '') +
      (storyContext.fiscalImpact ? ' Fiscal estimates from CBO.' : ''),
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      confidence: conf,
      hasAnomaly: lobbyingSimilarity?.hasStrongMatches,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
    // Story context fields
    voteOutcome: storyContext.voteOutcome,
    billProgress: storyContext.billProgress,
    fiscalImpact: storyContext.fiscalImpact,
    sponsorCommitteeConnection,
    sponsorFundingContext,
    relatedBillCount: storyContext.relatedBillCount,
    bipartisanCosponsorship: storyContext.bipartisanCosponsorship,
    topLobbyingOrgs:
      storyContext.topLobbyingOrgNames.length > 0 ? storyContext.topLobbyingOrgNames : undefined,
    lobbyingSimilarity: lobbyingSimilarity ?? undefined,
    classifiedSectors: classifiedSectors.length > 0 ? classifiedSectors : undefined,
  };

  // 9. Cache
  try {
    await getRedisCache().set(cacheKey, insight, CACHE_TTL);
  } catch {
    logger.warn('[BillIntelligence] Cache write failed', { billId });
  }

  return insight;
}

// ── Story Context Extraction ──────────────────────────────────────

function computeStoryContext(bill: Bill, topOrgNames: string[]): StoryContext {
  // Vote outcome — pick the most recent recorded vote
  let voteOutcome: StoryContext['voteOutcome'];
  const lastVote = bill.votes.length > 0 ? bill.votes[bill.votes.length - 1] : undefined;
  if (lastVote?.votes && !lastVote.votesUnavailable) {
    voteOutcome = {
      chamber: lastVote.chamber,
      result: lastVote.result,
      yea: lastVote.votes.yea,
      nay: lastVote.votes.nay,
      partyLine: isPartyLineVote(lastVote),
      bipartisan: isBipartisanVote(lastVote),
    };
  }

  // Bill progress
  const daysSinceIntroduction = Math.floor(
    (Date.now() - new Date(bill.introducedDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const passedCommittee = [
    'reported',
    'passed_house',
    'passed_senate',
    'passed_both',
    'enacted',
  ].includes(bill.status.current);
  const billProgress = {
    status: bill.status.current,
    daysSinceIntroduction,
    passedCommittee,
  };

  // CBO fiscal impact
  let fiscalImpact: string | undefined;
  const firstEstimate = bill.cboCostEstimates?.[0];
  if (firstEstimate) {
    fiscalImpact = firstEstimate.description;
  }

  // Bipartisan cosponsorship
  const activeCosponsors = bill.cosponsors.filter(c => !c.withdrawn);
  const parties = new Set(activeCosponsors.map(c => c.representative.party));
  const bipartisanCosponsorship = parties.size >= 2;

  return {
    voteOutcome,
    billProgress,
    fiscalImpact,
    relatedBillCount: bill.relatedBills.length,
    bipartisanCosponsorship,
    topLobbyingOrgNames: topOrgNames,
  };
}

function isPartyLineVote(vote: BillVote): boolean {
  if (!vote.breakdown) return false;
  const { democratic, republican } = vote.breakdown;
  // Party-line if >80% of each party voted opposite directions
  const demYeaRate = democratic.yea / Math.max(democratic.yea + democratic.nay, 1);
  const repYeaRate = republican.yea / Math.max(republican.yea + republican.nay, 1);
  return (demYeaRate > 0.8 && repYeaRate < 0.2) || (demYeaRate < 0.2 && repYeaRate > 0.8);
}

function isBipartisanVote(vote: BillVote): boolean {
  if (!vote.breakdown) return false;
  const { democratic, republican } = vote.breakdown;
  // Bipartisan if >30% of each party voted the same way
  const demYeaRate = democratic.yea / Math.max(democratic.yea + democratic.nay, 1);
  const repYeaRate = republican.yea / Math.max(republican.yea + republican.nay, 1);
  return (demYeaRate > 0.3 && repYeaRate > 0.3) || (demYeaRate < 0.7 && repYeaRate < 0.7);
}

// ── Enrichment API Calls ──────────────────────────────────────────

async function fetchFinancialSummary(bioguideId: string, cycle: number): Promise<number | null> {
  try {
    const fecId = getFECIdFromBioguide(bioguideId);
    if (!fecId) return null;
    const summary = await fecApiService.getFinancialSummary(fecId, cycle);
    return summary?.receipts ?? null;
  } catch {
    return null;
  }
}

async function fetchEnhancedRepresentative(
  bioguideId: string
): Promise<{ committees?: Array<{ name: string; role?: string }> } | null> {
  try {
    return await getEnhancedRepresentative(bioguideId);
  } catch {
    return null;
  }
}

function computeSponsorCommitteeConnection(
  billCommittees: Bill['committees'],
  sponsorCommittees?: Array<{ name: string; role?: string; title?: string }>
): BillIntelligenceInsight['sponsorCommitteeConnection'] | undefined {
  if (!sponsorCommittees?.length || billCommittees.length === 0) return undefined;

  for (const bc of billCommittees) {
    const bcName = bc.name.toLowerCase();
    for (const sc of sponsorCommittees) {
      const scName = sc.name.toLowerCase();
      if (bcName.includes(scName) || scName.includes(bcName)) {
        return {
          connected: true,
          committeeName: bc.name,
          sponsorRole: sc.role ?? sc.title,
        };
      }
    }
  }

  return { connected: false };
}

function computeDataCompleteness(
  sponsorAnalysis: MemberSectorResult | null,
  storyContext: StoryContext,
  sponsorCommitteeConnection?: BillIntelligenceInsight['sponsorCommitteeConnection'],
  sponsorFundingContext?: BillIntelligenceInsight['sponsorFundingContext']
): number {
  let score = sponsorAnalysis ? 0.5 : 0.2;
  if (storyContext.voteOutcome) score += 0.1;
  if (storyContext.fiscalImpact) score += 0.05;
  if (sponsorCommitteeConnection) score += 0.1;
  if (sponsorFundingContext) score += 0.1;
  if (storyContext.topLobbyingOrgNames.length > 0) score += 0.05;
  return Math.min(score, 1);
}

// ── Member Sector Analysis ───────────────────────────────────────────

interface MemberSectorResult {
  bioguideId: string;
  name: string;
  party: string;
  sectorDonationPercentage: number;
  sectorDonationAmount: number;
  totalDonations: number;
}

async function analyzeMemberSectorDonations(
  bioguideId: string,
  name: string,
  party: string,
  sectors: IndustrySector[]
): Promise<MemberSectorResult | null> {
  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) return null;

  let contributions;
  try {
    contributions = await fecApiService.getSampleContributions(
      fecId,
      getCurrentElectionCycle(),
      250
    );
  } catch {
    return null;
  }

  if (contributions.length === 0) return null;

  const sectorAggregation = aggregateByIndustrySector(contributions);
  let totalDonations = 0;
  let sectorDonationAmount = 0;

  for (const entry of sectorAggregation) {
    totalDonations += entry.totalAmount;
    if (sectors.includes(entry.sector)) {
      sectorDonationAmount += entry.totalAmount;
    }
  }

  if (totalDonations === 0) return null;

  return {
    bioguideId,
    name,
    party,
    sectorDonationPercentage: (sectorDonationAmount / totalDonations) * 100,
    sectorDonationAmount,
    totalDonations,
  };
}

// ── Lobbying Data ────────────────────────────────────────────────────

async function getRelatedLobbyingData(
  committees: Array<{
    committeeId: string;
    name: string;
    chamber: 'House' | 'Senate';
    activities: Array<{ date: string; activity: string }>;
  }>
): Promise<{ lobbyingSpending: number; lobbyingOrgs: number; topOrgNames: string[] }> {
  const mappedCommittees = committees
    .map(c => findCommitteeMapping(c.name))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  const lobbyingResults = await Promise.all(
    mappedCommittees.map(m => analyzeLobbyingPipeline(m.committeeCode).catch(() => null))
  );

  let totalSpending = 0;
  let totalOrgs = 0;
  const allOrgs: Array<{ name: string; totalSpending: number }> = [];

  for (const lobbyingInsight of lobbyingResults) {
    if (lobbyingInsight) {
      totalSpending += lobbyingInsight.totalSpending;
      totalOrgs += lobbyingInsight.organizationCount;
      for (const org of lobbyingInsight.topOrganizations) {
        allOrgs.push(org);
      }
    }
  }

  const topOrgNames = allOrgs
    .sort((a, b) => b.totalSpending - a.totalSpending)
    .slice(0, 3)
    .map(o => o.name);

  return { lobbyingSpending: totalSpending, lobbyingOrgs: totalOrgs, topOrgNames };
}

// ── Lobbying Similarity ──────────────────────────────────────────────

async function fetchLobbyingSimilarity(billId: string, billTitle: string, _policyArea: string) {
  try {
    // Fetch recent lobbying filings for the bill's policy area
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3);

    // Fetch last 4 quarters
    const filings = [];
    let year = currentYear;
    let quarter = currentQuarter;
    for (let i = 0; i < 4; i++) {
      try {
        const qFilings = await senateLobbyingAPI.fetchFilingsByQuarter(year, quarter);
        filings.push(...qFilings);
      } catch {
        // Skip failed quarters
      }
      quarter--;
      if (quarter < 1) {
        quarter = 4;
        year--;
      }
    }

    if (filings.length === 0) return null;

    // Use bill title as proxy for bill text (avoids expensive text fetch)
    const formattedFilings = filings
      .filter(f => f.specific_issues?.length)
      .slice(0, 100)
      .map(f => ({
        id: f.id,
        client: f.client.name,
        registrant: f.registrant.name,
        specificIssues: Array.isArray(f.specific_issues) ? f.specific_issues : [],
        income: reportedFilingAmount(f),
        period: `${f.filingPeriod} ${f.filingYear}`,
      }));

    return computeBillLobbyingSimilarity(billId, billTitle, formattedFilings);
  } catch (error) {
    logger.warn('[BillIntelligence] Lobbying similarity failed', {
      billId,
      error: (error as Error).message,
    });
    return null;
  }
}

// ── Narrative Generation ─────────────────────────────────────────────

async function generateNarrative(
  billTitle: string,
  policyArea: string,
  sectors: IndustrySector[],
  sponsor: MemberSectorResult | null,
  cosponsorSummary: BillIntelligenceInsight['cosponsorSummary'],
  lobbyingSpending: number,
  lobbyingOrgs: number,
  storyContext: StoryContext,
  sponsorCommitteeConnection?: BillIntelligenceInsight['sponsorCommitteeConnection'],
  sponsorFundingContext?: BillIntelligenceInsight['sponsorFundingContext'],
  lobbyingSimilarity?: BillLobbyingSimilarity | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const sectorList = sectors.slice(0, 5).join(', ');
  const sponsorInfo = sponsor
    ? `The sponsor, ${sponsor.name} (${sponsor.party}), received $${sponsor.sectorDonationAmount.toLocaleString()} from these sectors, representing ${sponsor.sectorDonationPercentage.toFixed(1)}% of their total $${sponsor.totalDonations.toLocaleString()} in contributions.`
    : 'Sponsor contribution data is not available.';

  const cosponsorInfo =
    cosponsorSummary.analyzedCosponsors > 0
      ? `Among ${cosponsorSummary.analyzedCosponsors} analyzed cosponsors (of ${cosponsorSummary.totalCosponsors} total), the average sector-related contribution percentage was ${cosponsorSummary.avgSectorDonationPercentage.toFixed(1)}%.`
      : `Cosponsor contribution data is not available.`;

  const lobbyingInfo =
    lobbyingSpending > 0
      ? `${lobbyingOrgs} organizations spent $${lobbyingSpending.toLocaleString()} lobbying the committees this bill was referred to.`
      : '';

  // Build structured story facts block from enrichment data
  const storyFacts = buildStoryFactsBlock(
    storyContext,
    sponsorCommitteeConnection,
    sponsorFundingContext
  );

  const lobbyingLanguageBlock = lobbyingSimilarity?.hasStrongMatches
    ? `\nLOBBYING LANGUAGE ANALYSIS:\nThis bill's language shows high semantic similarity to lobbying filings:\n${lobbyingSimilarity.matches
        .slice(0, 3)
        .map(
          m => `- ${m.client}: ${(m.similarity * 100).toFixed(0)}% similarity, ${m.period} filing`
        )
        .join('\n')}\n`
    : '';

  const prompt =
    `Write a 3-5 sentence narrative about this bill's story: who introduced it, the funding picture, and any notable connections.\n\n` +
    `${PLAIN_LANGUAGE_RULES}\n\n` +
    `Bill: "${billTitle}"\n` +
    `Policy area: ${policyArea}\n` +
    `Affected industry sectors: ${sectorList}\n` +
    `${sponsorInfo}\n` +
    `${cosponsorInfo}\n` +
    `${lobbyingInfo}\n` +
    `${storyFacts}\n` +
    `${lobbyingLanguageBlock}\n` +
    `Use "pattern", "correlation", or "association" — never "caused", "influenced", or "resulted in". ` +
    `State facts only. Lead with the most notable finding.`;

  const fallback = buildStatisticalNarrative(
    billTitle,
    policyArea,
    sectors,
    sponsor,
    cosponsorSummary,
    lobbyingSpending,
    lobbyingOrgs,
    storyContext,
    sponsorCommitteeConnection,
    sponsorFundingContext,
    lobbyingSimilarity
  );

  return generateInsightNarrative(
    'You summarize bill funding patterns and legislative context for CIV.IQ. ',
    prompt,
    fallback,
    '[BillIntelligence]'
  );
}

function buildStoryFactsBlock(
  storyContext: StoryContext,
  sponsorCommitteeConnection?: BillIntelligenceInsight['sponsorCommitteeConnection'],
  sponsorFundingContext?: BillIntelligenceInsight['sponsorFundingContext']
): string {
  const facts: string[] = [];

  if (storyContext.voteOutcome) {
    const v = storyContext.voteOutcome;
    const voteType = v.partyLine ? 'party-line' : v.bipartisan ? 'bipartisan' : '';
    facts.push(
      `Vote: ${v.result} in the ${v.chamber} (${v.yea}-${v.nay}${voteType ? ', ' + voteType : ''}).`
    );
  }

  if (storyContext.billProgress) {
    const p = storyContext.billProgress;
    facts.push(
      `Status: ${p.status}, ${p.daysSinceIntroduction} days since introduction${p.passedCommittee ? ', passed committee' : ''}.`
    );
  }

  if (sponsorCommitteeConnection?.connected) {
    facts.push(
      `The sponsor sits on the ${sponsorCommitteeConnection.committeeName} committee${sponsorCommitteeConnection.sponsorRole ? ' as ' + sponsorCommitteeConnection.sponsorRole : ''}, which has jurisdiction over this bill.`
    );
  }

  if (sponsorFundingContext) {
    const totalFormatted = formatCompactDollars(sponsorFundingContext.totalRaised);
    facts.push(
      `Sponsor total raised: ${totalFormatted} in the ${sponsorFundingContext.cycle} cycle.`
    );
  }

  if (storyContext.fiscalImpact) {
    facts.push(`CBO estimate: ${storyContext.fiscalImpact}`);
  }

  if (storyContext.bipartisanCosponsorship) {
    facts.push('Cosponsorship is bipartisan.');
  }

  if (storyContext.topLobbyingOrgNames.length > 0) {
    facts.push(`Top lobbying organizations: ${storyContext.topLobbyingOrgNames.join(', ')}.`);
  }

  if (storyContext.relatedBillCount > 0) {
    facts.push(`${storyContext.relatedBillCount} related bills.`);
  }

  return facts.length > 0 ? `\nStory context:\n${facts.join('\n')}` : '';
}

function formatCompactDollars(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

// ── Fallback Narratives ──────────────────────────────────────────────

function buildStatisticalNarrative(
  _billTitle: string,
  policyArea: string,
  sectors: IndustrySector[],
  sponsor: MemberSectorResult | null,
  cosponsorSummary: BillIntelligenceInsight['cosponsorSummary'],
  lobbyingSpending: number,
  lobbyingOrgs: number,
  storyContext: StoryContext,
  sponsorCommitteeConnection?: BillIntelligenceInsight['sponsorCommitteeConnection'],
  sponsorFundingContext?: BillIntelligenceInsight['sponsorFundingContext'],
  lobbyingSimilarity?: BillLobbyingSimilarity | null
): string {
  const sectorList = sectors.slice(0, 3).join(', ');
  const parts: string[] = [];

  // Lead with sponsor + committee connection if notable
  if (sponsor && sponsorCommitteeConnection?.connected) {
    const totalContext = sponsorFundingContext
      ? ` out of ${formatCompactDollars(sponsorFundingContext.totalRaised)} total raised`
      : '';
    parts.push(
      `${sponsor.name} introduced this ${policyArea.toLowerCase()} bill and sits on the ${sponsorCommitteeConnection.committeeName}, which oversees it. ` +
        `${sponsor.name} received $${sponsor.sectorDonationAmount.toLocaleString()} from ${sectorList} industries${totalContext}.`
    );
  } else if (sponsor) {
    const totalContext = sponsorFundingContext
      ? ` of ${formatCompactDollars(sponsorFundingContext.totalRaised)} total raised`
      : '';
    parts.push(
      `${sponsor.name} received ${sponsor.sectorDonationPercentage.toFixed(1)}% of campaign contributions from ${sectorList} sectors${totalContext}.`
    );
  } else {
    parts.push(
      `This bill addresses ${policyArea}, which relates to the ${sectorList} sector${sectors.length > 1 ? 's' : ''}.`
    );
  }

  // Lobbying with org names
  if (lobbyingSpending > 0) {
    const orgDetail =
      storyContext.topLobbyingOrgNames.length > 0
        ? `, led by ${storyContext.topLobbyingOrgNames[0]}`
        : '';
    parts.push(
      `${lobbyingOrgs} organizations spent $${lobbyingSpending.toLocaleString()} lobbying related committees${orgDetail}.`
    );
  }

  // Vote outcome
  if (storyContext.voteOutcome) {
    const v = storyContext.voteOutcome;
    const voteDesc = v.partyLine
      ? 'along party lines'
      : v.bipartisan
        ? 'with bipartisan support'
        : '';
    parts.push(
      `The bill ${v.result.toLowerCase()} in the ${v.chamber} ${v.yea}-${v.nay}${voteDesc ? ' ' + voteDesc : ''}.`
    );
  } else {
    parts.push('The bill has no recorded votes yet.');
  }

  // Cosponsorship
  if (cosponsorSummary.analyzedCosponsors > 0 && cosponsorSummary.avgSectorDonationPercentage > 0) {
    const bipartisan = storyContext.bipartisanCosponsorship ? 'bipartisan ' : '';
    parts.push(
      `Among ${cosponsorSummary.analyzedCosponsors} ${bipartisan}cosponsors analyzed, the average sector contribution was ${cosponsorSummary.avgSectorDonationPercentage.toFixed(1)}%.`
    );
  }

  // CBO
  if (storyContext.fiscalImpact) {
    parts.push(`CBO estimates: ${storyContext.fiscalImpact}`);
  }

  // Lobbying language similarity
  if (lobbyingSimilarity?.hasStrongMatches) {
    const topMatch = lobbyingSimilarity.matches[0];
    if (topMatch) {
      parts.push(
        `The bill's language shows ${(topMatch.similarity * 100).toFixed(0)}% semantic similarity to lobbying filings from ${topMatch.client}.`
      );
    }
  }

  return parts.join(' ');
}

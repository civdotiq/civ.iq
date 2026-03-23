/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote-Finance Correlation Analyzer (Insight 2)
 *
 * Correlates a legislator's campaign finance donors (by industry sector)
 * with their voting record (by bill industry classification). Answers:
 * "What percentage of this legislator's votes align with their top
 * donor industries?"
 *
 * Flow: check cache → fetch data → compute statistics → AI narrative → cache → fallback
 * Pattern: CivicAlignmentAnalyzer (src/features/legislation/services/ai/civic-alignment-analyzer.ts)
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateByIndustrySector, IndustrySector } from '@/lib/fec/industry-taxonomy';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import {
  correlation,
  peerComparison,
  confidenceScore,
  MIN_VOTES_PER_SECTOR,
  MIN_PEERS,
} from '../statistics/civic-stats';
import {
  getCurrentElectionCycle,
  freshestDate,
  getBillSectors,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
} from './shared';
import type { VoteFinanceInsight, IndustryCorrelation, PeerComparison } from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max votes to fetch for analysis */
const MAX_VOTES = 200;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'Campaign contributions are legal and do not indicate wrongdoing. ' +
  'Voting alignment with donor industries is common across all legislators. ' +
  'Correlation does not indicate causation or improper behavior.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze vote-finance correlation for a legislator.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * On any failure, returns a statistical fallback without AI narrative.
 */
export async function analyzeVoteFinance(bioguideId: string): Promise<VoteFinanceInsight | null> {
  const cacheKey = `insight:vote_finance:${bioguideId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<VoteFinanceInsight>(cacheKey);
    if (cached) {
      logger.info('[VoteFinance] Cache hit', { bioguideId });
      trackInsightCacheHit('vote-finance');
      return cached;
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2-6. Fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('vote-finance', () =>
    withTimeout(computeAndCache(bioguideId, cacheKey), ANALYZER_TIMEOUT_MS, 'VoteFinance')
  );
}

async function computeAndCache(
  bioguideId: string,
  cacheKey: string
): Promise<VoteFinanceInsight | null> {
  // 2. Fetch data
  const data = await fetchData(bioguideId);
  if (!data) {
    return null;
  }

  // 3. Compute statistics
  const stats = computeStatistics(data);
  if (!stats) {
    logger.info('[VoteFinance] Insufficient data for analysis', { bioguideId });
    return null;
  }

  // 4. Peer comparison
  const peer = await computePeerComparison(bioguideId, stats, data);

  // 4b. Recompute confidence with actual peer count
  if (peer) {
    const totalVotes = stats.correlations.reduce((sum, c) => sum + c.billsVotedOn, 0);
    const sectorsWithEnoughData = stats.correlations.filter(c => c.meetsSampleSize).length;
    const baseConfidence = confidenceScore({
      sampleSize: totalVotes,
      minimumSampleSize: MIN_VOTES_PER_SECTOR * 3,
      dataCompleteness:
        data.votes.length > 0
          ? data.votes.filter(v => v.sectors.length > 0).length / data.votes.length
          : 0,
      peerCount: peer.peerCount,
    });
    stats.confidence = sectorsWithEnoughData >= 2 ? baseConfidence : Math.min(baseConfidence, 0.5);
  }

  // 5. Generate insight
  const { narrative, source } = await generateNarrative(data, stats, peer);

  const insight: VoteFinanceInsight = {
    bioguideId,
    correlations: stats.correlations,
    overallCorrelation: stats.overallCorrelation,
    peerComparison: peer ?? {
      value: stats.overallAlignment,
      peerAverage: stats.overallAlignment,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence:
      source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    dataAsOf: freshestDate(...data.votes.map(v => v.date)),
    methodology:
      'Correlation between campaign donor sectors and voting alignment on sector-relevant bills. ' +
      'Bills classified by AI-generated affectedIndustries or policy-area-map fallback. ' +
      'Spearman rank correlation across sectors with 10+ votes.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 6. Cache
  await cacheInsight(cacheKey, insight);
  await cacheAlignmentScore(bioguideId, stats.overallAlignment, data);

  return insight;
}

// ── Data Fetching ────────────────────────────────────────────────────

interface VoteWithIndustries {
  billId: string;
  billTitle: string;
  position: string;
  date: string;
  sectors: IndustrySector[];
}

interface FetchedData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  votes: VoteWithIndustries[];
  sectorDonations: Map<IndustrySector, number>;
  totalDonations: number;
}

async function fetchData(bioguideId: string): Promise<FetchedData | null> {
  // Get representative data
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    logger.info('[VoteFinance] Representative not found', { bioguideId });
    return null;
  }

  // Get FEC candidate ID
  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) {
    logger.info('[VoteFinance] No FEC mapping', { bioguideId });
    return null;
  }

  // Fetch votes and contributions in parallel
  const [rawVotes, contributions] = await Promise.all([
    fetchVotes(bioguideId, rep.chamber),
    fetchContributions(fecId),
  ]);

  if (!rawVotes.length || !contributions.length) {
    logger.info('[VoteFinance] Insufficient vote or finance data', {
      bioguideId,
      votes: rawVotes.length,
      contributions: contributions.length,
    });
    return null;
  }

  // Classify votes by industry
  const votes = await classifyVoteIndustries(rawVotes);

  // Aggregate contributions by sector
  const sectorAggregation = aggregateByIndustrySector(contributions);
  const sectorDonations = new Map<IndustrySector, number>();
  let totalDonations = 0;
  for (const entry of sectorAggregation) {
    sectorDonations.set(entry.sector, entry.totalAmount);
    totalDonations += entry.totalAmount;
  }

  return {
    name: rep.name,
    party: rep.party,
    state: rep.state,
    chamber: rep.chamber,
    votes,
    sectorDonations,
    totalDonations,
  };
}

interface RawVote {
  billType: string;
  billNumber: string;
  billCongress: number;
  billTitle: string;
  position: string;
  date: string;
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
          billType: v.bill!.type,
          billNumber: v.bill!.number,
          billCongress: v.bill!.congress,
          billTitle: v.bill!.title,
          position: v.position,
          date: v.date,
        }));
    };

    const [session1, session2] = await Promise.all([fetchSession(1), fetchSession(2)]);
    return [...session1, ...session2];
  } catch (error) {
    logger.warn('[VoteFinance] Vote fetch failed', { bioguideId, error: (error as Error).message });
    return [];
  }
}

async function fetchContributions(fecId: string) {
  try {
    return await fecApiService.getSampleContributions(fecId, getCurrentElectionCycle(), 500);
  } catch {
    return [];
  }
}

/**
 * Classify each vote's bill by industry sector.
 * Uses cached bill summary affectedIndustries first, falls back to policy-area-map.
 */
async function classifyVoteIndustries(rawVotes: RawVote[]): Promise<VoteWithIndustries[]> {
  const results: VoteWithIndustries[] = [];

  // Batch lookup bill summaries (limit concurrency)
  const batchSize = 10;
  for (let i = 0; i < rawVotes.length; i += batchSize) {
    const batch = rawVotes.slice(i, i + batchSize);
    const classified = await Promise.all(
      batch.map(async vote => {
        const billId = `${vote.billType}${vote.billNumber}-${vote.billCongress}`;
        const sectors = await getBillSectors(billId, vote.billTitle);

        if (sectors.length === 0) return null;

        return {
          billId,
          billTitle: vote.billTitle,
          position: vote.position,
          date: vote.date,
          sectors,
        };
      })
    );

    for (const item of classified) {
      if (item) results.push(item);
    }
  }

  return results;
}

// ── Statistical Computation ──────────────────────────────────────────

interface ComputedStats {
  correlations: IndustryCorrelation[];
  overallCorrelation: number | null;
  overallAlignment: number;
  confidence: number;
}

function computeStatistics(data: FetchedData): ComputedStats | null {
  // Group votes by sector
  const sectorVotes = new Map<IndustrySector, { yea: number; nay: number; total: number }>();

  for (const vote of data.votes) {
    const isYea = vote.position === 'Yea';
    const isNay = vote.position === 'Nay';
    if (!isYea && !isNay) continue; // Skip "Present" / "Not Voting"

    for (const sector of vote.sectors) {
      const existing = sectorVotes.get(sector) ?? { yea: 0, nay: 0, total: 0 };
      existing.total++;
      if (isYea) existing.yea++;
      if (isNay) existing.nay++;
      sectorVotes.set(sector, existing);
    }
  }

  if (sectorVotes.size === 0) return null;

  // Compute per-sector alignment and correlations
  const correlations: IndustryCorrelation[] = [];
  const donationAmounts: number[] = [];
  const alignmentScores: number[] = [];

  for (const [sector, votes] of sectorVotes) {
    const donationAmount = data.sectorDonations.get(sector) ?? 0;
    const meetsSampleSize = votes.total >= MIN_VOTES_PER_SECTOR;

    // Alignment = fraction of yea votes on sector bills
    // (Simplified: "yea" = supportive of sector. This is a rough proxy.
    // A more nuanced approach would classify each bill's impact direction.)
    const alignmentScore = votes.total > 0 ? votes.yea / votes.total : 0;

    correlations.push({
      sector,
      donationAmount,
      billsVotedOn: votes.total,
      alignmentScore,
      meetsSampleSize,
    });

    // Only include sectors with sufficient data in the correlation calculation
    if (meetsSampleSize && donationAmount > 0) {
      donationAmounts.push(donationAmount);
      alignmentScores.push(alignmentScore);
    }
  }

  // Compute overall correlation between donation amounts and alignment scores
  const overallCorrelation = correlation(donationAmounts, alignmentScores, {
    method: 'spearman',
    minimumSampleSize: 3, // Need at least 3 sectors for meaningful correlation
  });

  // Overall alignment: weighted average across all sectors
  let totalWeightedAlignment = 0;
  let totalVotesAcrossSectors = 0;
  for (const c of correlations) {
    totalWeightedAlignment += c.alignmentScore * c.billsVotedOn;
    totalVotesAcrossSectors += c.billsVotedOn;
  }
  const overallAlignment =
    totalVotesAcrossSectors > 0 ? totalWeightedAlignment / totalVotesAcrossSectors : 0;

  const sectorsWithEnoughData = correlations.filter(c => c.meetsSampleSize).length;

  const confidence = confidenceScore({
    sampleSize: totalVotesAcrossSectors,
    minimumSampleSize: MIN_VOTES_PER_SECTOR * 3, // Want data across multiple sectors
    dataCompleteness:
      data.votes.length > 0
        ? data.votes.filter(v => v.sectors.length > 0).length / data.votes.length
        : 0,
    peerCount: 0, // Updated after peer comparison
  });

  return {
    correlations: correlations.sort((a, b) => b.donationAmount - a.donationAmount),
    overallCorrelation: overallCorrelation?.coefficient ?? null,
    overallAlignment,
    confidence: sectorsWithEnoughData >= 2 ? confidence : Math.min(confidence, 0.5),
  };
}

// ── Peer Comparison ──────────────────────────────────────────────────

async function cacheAlignmentScore(
  bioguideId: string,
  alignmentScore: number,
  data: FetchedData
): Promise<void> {
  const key = `alignment-score:${data.chamber}:${data.state}:${bioguideId}`;
  try {
    await getRedisCache().set(key, alignmentScore, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  bioguideId: string,
  stats: ComputedStats,
  data: FetchedData
): Promise<PeerComparison | null> {
  // Look up cached alignment scores for peers in same chamber + state
  const pattern = `alignment-score:${data.chamber}:${data.state}:*`;

  try {
    const keys = await getRedisCache().keys(pattern);

    const peerKeys = keys.filter(k => !k.endsWith(`:${bioguideId}`));
    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(
      stats.overallAlignment,
      peerScores,
      `${data.state} ${data.chamber} delegation`
    );
  } catch {
    return null;
  }
}

// ── AI Narrative Generation ──────────────────────────────────────────

async function generateNarrative(
  data: FetchedData,
  stats: ComputedStats,
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    'campaign finance and voting records. ';

  // Build sector detail lines (top 5 by donation amount)
  const topCorrelations = stats.correlations.filter(c => c.meetsSampleSize).slice(0, 5);

  const sectorLines = topCorrelations
    .map(
      c =>
        `- ${c.sector}: $${c.donationAmount.toLocaleString()} donated, ` +
        `${c.billsVotedOn} bills voted on, ` +
        `${(c.alignmentScore * 100).toFixed(1)}% yea rate`
    )
    .join('\n');

  const correlationLine =
    stats.overallCorrelation !== null
      ? `Overall Spearman rank correlation between donation amounts and yea rates: ` +
        `${stats.overallCorrelation.toFixed(3)} ` +
        `(${describeCorrelation(stats.overallCorrelation)}).`
      : 'Insufficient data to compute overall correlation (need 3+ sectors with 10+ votes each).';

  const peerLine = peer
    ? `Peer comparison: This legislator's overall alignment score is ` +
      `${(stats.overallAlignment * 100).toFixed(1)}%. ` +
      `The average for the ${peer.peerGroupLabel} is ` +
      `${(peer.peerAverage * 100).toFixed(1)}% ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from other delegation members).';

  const userPrompt = `LEGISLATOR: ${data.name} (${data.party}-${data.state}), ${data.chamber}
TOTAL VOTES ANALYZED: ${data.votes.length}
TOTAL DONATIONS ANALYZED: $${data.totalDonations.toLocaleString()}

TOP SECTOR CORRELATIONS (sectors with 10+ votes):
${sectorLines || 'No sectors have enough votes (10+) for analysis.'}

${correlationLine}

${peerLine}

Write a 2-3 sentence plain-language summary. State the overall alignment pattern. If correlation data is available, describe it in plain language (e.g., "There is a weak/moderate/strong pattern between..."). If peer comparison is available, note how this legislator compares. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalFallback(data, stats, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[VoteFinance]');
}

function describeCorrelation(r: number): string {
  const abs = Math.abs(r);
  const direction = r >= 0 ? 'positive' : 'negative';
  if (abs < 0.1) return 'negligible';
  if (abs < 0.3) return `weak ${direction}`;
  if (abs < 0.5) return `moderate ${direction}`;
  if (abs < 0.7) return `moderately strong ${direction}`;
  return `strong ${direction}`;
}

function buildStatisticalFallback(
  data: FetchedData,
  stats: ComputedStats,
  peer: PeerComparison | null
): string {
  const alignPct = (stats.overallAlignment * 100).toFixed(1);
  const sectorsAnalyzed = stats.correlations.filter(c => c.meetsSampleSize).length;

  let summary =
    `Across ${data.votes.length} votes, ${data.name} voted yea ${alignPct}% of the time ` +
    `on bills related to their donor industries (${sectorsAnalyzed} sectors with sufficient data).`;

  if (stats.overallCorrelation !== null) {
    summary +=
      ` The correlation between donation amounts and voting alignment is ` +
      `${describeCorrelation(stats.overallCorrelation)} (${stats.overallCorrelation.toFixed(3)}).`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary +=
      ` The average for the ${peer.peerGroupLabel} is ` +
      `${(peer.peerAverage * 100).toFixed(1)}%.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: VoteFinanceInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[VoteFinance] Cached insight', {
      bioguideId: insight.bioguideId,
      confidence: insight.confidence,
      overallCorrelation: insight.overallCorrelation,
    });
  } catch {
    // Non-fatal
  }
}

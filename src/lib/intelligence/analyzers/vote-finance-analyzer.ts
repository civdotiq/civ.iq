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
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
  createPhaseTimer,
  SENATE_UPSTREAM_BLOCKED_REASON,
  peerComparisonUnavailable,
} from './shared';
import type { VoteFinanceInsight, IndustryCorrelation, PeerComparison } from '../types';

/**
 * Outcome shape that carries a human-readable `unavailableReason` when the
 * analyzer returns null. Used by the money-report orchestrator (MR5) to
 * surface honest per-metric states in the UI. Existing callers continue to
 * use `analyzeVoteFinance` which returns `T | null` directly.
 */
export interface VoteFinanceOutcome {
  insight: VoteFinanceInsight | null;
  unavailableReason?: string;
}

/**
 * Vote-finance classifies hundreds of bills by sector and computes peer
 * comparison. Vercel enforces a 60s HTTP function ceiling, so the analyzer
 * must complete in <55s on a cold path to leave headroom for the cache
 * write. See `PLAN-money-report-restoration-2026-04.md` (MR2) for the
 * trim rationale: billId-level sector cache in shared.ts, reduced vote
 * cap, pooled concurrency, and a short LLM narrative timeout.
 */
const VOTE_FINANCE_TIMEOUT_MS = 55_000;

/** LLM narrative budget. Exceeds this → fall back to statistical narrative. */
const LLM_NARRATIVE_TIMEOUT_MS = 7_000;

/** Max parallel bill-sector classifications. CPU-bound on zero-shot fallback. */
const CLASSIFY_CONCURRENCY = 8;

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/**
 * Max votes to fetch and classify for vote-finance correlation.
 *
 * Lowered from 200 → 120 as part of MR2 (see
 * `PLAN-money-report-restoration-2026-04.md`). Spearman correlation and
 * per-sector yea-rate stabilize well before 120 votes for a full-session
 * rep; the MIN_VOTES_PER_SECTOR = 10 floor still gates thin sectors, so
 * trimming just drops tail latency without meaningfully changing the
 * insight. Only applies here — other analyzers keep their own cap.
 */
// Post-MR15/MR16 (2026-05-18): raised back to 120. The MR12-era 50 cap was
// driven by two budget pressures that have since been resolved:
//   - MR13 tightened the httpClient retry tail so individual /members fetches
//     no longer burn 30s on retries.
//   - MR16 cut FEC `getSampleContributions` cold path from ~25s → ~10s by
//     dropping sample size 500 → 250 and deriving page count from count.
//   - MR15 widened bill-sector classification from ~12% → ~30%, so each raw
//     vote produces more usable sector signal.
// Verified on preview deploy 998caed7 (Sherman, Lieu): MAX_VOTES=120 cold
// compute finishes in 17-28s on production deploy 69b8a33e — well under the
// 55s budget. Produces ~180 classified votes / 6 sectors meeting the
// 10-vote sample floor for typical House reps (was 0-2 sectors at MAX_VOTES=50).
const MAX_VOTES = 120;

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
  const { insight } = await analyzeVoteFinanceWithReason(bioguideId);
  return insight;
}

/**
 * Richer entry point that surfaces an `unavailableReason` when the analyzer
 * returns null. Used by the money-report orchestrator so the UI can render
 * "insufficient-data" with a specific explanation instead of a silent dash.
 */
export async function analyzeVoteFinanceWithReason(
  bioguideId: string
): Promise<VoteFinanceOutcome> {
  // v4: bumped in MR15 because the classifier now sees bill subjects + policyArea,
  // so v3-cached "insufficient-data" results would otherwise mask the new
  // sector coverage and keep `overallCorrelation` stuck at null.
  const cacheKey = `insight:vote_finance:v4:${bioguideId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<VoteFinanceInsight>(cacheKey);
    if (cached) {
      logger.info('[VoteFinance] Cache hit', { bioguideId });
      trackInsightCacheHit('vote-finance');
      return { insight: cached };
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2-6. Fetch, compute, narrate, cache — all under timeout. Use
  // `withInsightTracking` on the insight only (null ↔ insufficient-data) and
  // surface `unavailableReason` via the returned outcome.
  let reason: string | undefined;
  const insight = await withInsightTracking('vote-finance', () =>
    withTimeout(
      (async () => {
        const outcome = await computeAndCache(bioguideId, cacheKey);
        reason = outcome.unavailableReason;
        return outcome.insight;
      })(),
      VOTE_FINANCE_TIMEOUT_MS,
      'VoteFinance'
    )
  );
  return insight ? { insight } : { insight: null, unavailableReason: reason };
}

async function computeAndCache(bioguideId: string, cacheKey: string): Promise<VoteFinanceOutcome> {
  const timer = createPhaseTimer(`[VoteFinance] ${bioguideId}`);

  // 2. Fetch data
  const fetched = await fetchData(bioguideId, timer);
  if ('unavailableReason' in fetched) {
    return { insight: null, unavailableReason: fetched.unavailableReason };
  }
  const data = fetched;

  // 3. Compute statistics
  const stats = computeStatistics(data);
  if ('unavailableReason' in stats) {
    timer.mark('computeStatistics', { sectors: 0 });
    logger.info('[VoteFinance] Insufficient data for analysis', {
      bioguideId,
      reason: stats.unavailableReason,
    });
    return { insight: null, unavailableReason: stats.unavailableReason };
  }
  timer.mark('computeStatistics', { sectors: stats.correlations.length });

  // 4. Peer comparison
  const peer = await computePeerComparison(bioguideId, stats, data);
  timer.mark('computePeerComparison', { peerCount: peer?.peerCount ?? 0 });

  // 4b. Recompute confidence with actual peer count. Sample size counts
  // only sectors that meet the 10-vote floor, matching overallAlignment.
  if (peer) {
    const totalVotes = stats.correlations
      .filter(c => c.meetsSampleSize)
      .reduce((sum, c) => sum + c.billsVotedOn, 0);
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
  timer.mark('generateNarrative', { narrativeSource: source });

  const sc = new SourceCollector();
  sc.add('FEC individual filings', `${getCurrentElectionCycle()} cycle`);
  sc.add('Congress.gov roll calls', '119th Congress', data.votes.length);

  const insight: VoteFinanceInsight = {
    bioguideId,
    correlations: stats.correlations,
    overallCorrelation: stats.overallCorrelation,
    overallAlignment: stats.overallAlignment,
    peerComparison: peer,
    ...(peer
      ? {}
      : {
          peerComparisonUnavailableReason: peerComparisonUnavailable(
            `other members of the ${data.state} ${data.chamber} delegation`
          ),
        }),
    narrative,
    confidence:
      source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...data.votes.map(v => v.date))!,
    methodology:
      'For each bill we fetched, we identify the industry sectors it touches using its policy area ' +
      'and the industries named in its summary. For each sector that donated to this representative, ' +
      'we count how often they voted yea on bills touching that sector. Sectors with fewer than 10 ' +
      'recorded votes are excluded. A yea vote is not the same as a vote "for" an industry — a single ' +
      'bill can help or hurt a sector — so this is a raw yea-rate, not a support score.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: stats.overallAlignment,
      peerAverage: peer?.peerAverage,
      percentileRank: peer?.percentileRank,
      confidence:
        source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 6. Cache
  await cacheInsight(cacheKey, insight);
  await cacheAlignmentScore(bioguideId, stats.overallAlignment, data);
  timer.mark('cacheInsight');

  return { insight };
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

type FetchResult = FetchedData | { unavailableReason: string };

type PhaseTimer = ReturnType<typeof createPhaseTimer>;

async function fetchData(bioguideId: string, timer?: PhaseTimer): Promise<FetchResult> {
  // Get representative data
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    const unavailableReason = 'Representative not found in current dataset';
    logger.info('[VoteFinance] Representative not found', { bioguideId, unavailableReason });
    return { unavailableReason };
  }
  timer?.mark('fetchRep');

  // Senate roll-call XML is blocked by Akamai for Vercel cloud IPs (MR10).
  // Bail out before issuing the slow XML fetches so Senate reps return
  // `unavailable` immediately rather than burning the full 55s budget.
  if (rep.chamber === 'Senate') {
    logger.info('[VoteFinance] Senate blocked by upstream CDN', { bioguideId });
    return { unavailableReason: SENATE_UPSTREAM_BLOCKED_REASON };
  }

  // Get FEC candidate ID
  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) {
    const unavailableReason = 'No FEC candidate mapping for this representative';
    logger.info('[VoteFinance] No FEC mapping', { bioguideId, unavailableReason });
    return { unavailableReason };
  }

  // Fetch votes and contributions in parallel
  const votesStart = performance.now();
  const contribStart = performance.now();
  const [rawVotes, contributions] = await Promise.all([
    fetchVotes(bioguideId, rep.chamber).then(v => {
      timer?.record('fetchVotes', performance.now() - votesStart, { voteCount: v.length });
      return v;
    }),
    fetchContributions(fecId).then(c => {
      timer?.record('fetchContributions', performance.now() - contribStart, {
        contributionCount: c.length,
      });
      return c;
    }),
  ]);
  timer?.mark('fetchUpstream', { votes: rawVotes.length, contributions: contributions.length });

  if (!rawVotes.length || !contributions.length) {
    const unavailableReason = !rawVotes.length
      ? 'No voting record available for the 119th Congress'
      : 'No FEC contribution data for this cycle';
    logger.info('[VoteFinance] Insufficient vote or finance data', {
      bioguideId,
      votes: rawVotes.length,
      contributions: contributions.length,
      unavailableReason,
    });
    return { unavailableReason };
  }

  // Classify votes by industry
  const votes = await classifyVoteIndustries(rawVotes);
  timer?.mark('classifyVoteIndustries', {
    classifiedCount: votes.length,
    rawCount: rawVotes.length,
  });

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
  billPolicyArea?: string;
  billSubjects?: string[];
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
          billType: v.bill?.type ?? '',
          billNumber: String(v.bill?.number ?? ''),
          billCongress: v.bill?.congress ?? 0,
          billTitle: v.bill?.title ?? '',
          billPolicyArea: v.bill?.policyArea,
          billSubjects: v.bill?.subjects,
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
    return await fecApiService.getSampleContributions(fecId, getCurrentElectionCycle(), 250);
  } catch {
    return [];
  }
}

/**
 * Classify each vote's bill by industry sector.
 *
 * Previously batched in serial groups of 10, which pays a full tail-latency
 * stall at the end of every batch. Now runs a bounded worker pool at
 * `CLASSIFY_CONCURRENCY` (8) across the entire vote list — the slowest
 * classification no longer blocks unrelated fast ones. Concurrency is
 * capped because the zero-shot fallback classifier is CPU-bound on the
 * serverless runtime and unbounded parallelism thrashes it.
 */
async function classifyVoteIndustries(rawVotes: RawVote[]): Promise<VoteWithIndustries[]> {
  const results: VoteWithIndustries[] = [];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    while (true) {
      const index = cursor++;
      if (index >= rawVotes.length) return;
      const vote = rawVotes[index]!;
      const billId = `${vote.billType}${vote.billNumber}-${vote.billCongress}`;
      const sectors = await getBillSectors(billId, vote.billTitle, {
        policyArea: vote.billPolicyArea,
        subjects: vote.billSubjects,
      });
      if (sectors.length === 0) continue;
      results.push({
        billId,
        billTitle: vote.billTitle,
        position: vote.position,
        date: vote.date,
        sectors,
      });
    }
  };

  const poolSize = Math.min(CLASSIFY_CONCURRENCY, rawVotes.length);
  await Promise.all(Array.from({ length: poolSize }, () => worker()));

  return results;
}

// ── Statistical Computation ──────────────────────────────────────────

interface ComputedStats {
  correlations: IndustryCorrelation[];
  overallCorrelation: number | null;
  overallAlignment: number;
  confidence: number;
}

/**
 * Compute per-sector and overall statistics, or return an honest
 * `unavailableReason` when the data cannot support the headline number.
 */
function computeStatistics(data: FetchedData): ComputedStats | { unavailableReason: string } {
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

  if (sectorVotes.size === 0) {
    return {
      unavailableReason:
        "None of this representative's yea or nay votes matched a donor industry sector.",
    };
  }

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

  // Overall alignment: weighted average across sectors that meet the
  // 10-vote sample floor. Sub-threshold sectors are excluded so the
  // headline number is consistent with the per-sector methodology
  // (which already hides sectors below MIN_VOTES_PER_SECTOR).
  let totalWeightedAlignment = 0;
  let totalVotesAcrossSectors = 0;
  for (const c of correlations) {
    if (!c.meetsSampleSize) continue;
    totalWeightedAlignment += c.alignmentScore * c.billsVotedOn;
    totalVotesAcrossSectors += c.billsVotedOn;
  }

  // When no sector reaches the floor there is no honest headline number —
  // report insufficient data instead of fabricating one from thin sectors.
  if (totalVotesAcrossSectors === 0) {
    return {
      unavailableReason:
        `No donor industry sector has ${MIN_VOTES_PER_SECTOR} or more recorded votes. ` +
        `We need at least ${MIN_VOTES_PER_SECTOR} votes in a sector to show a pattern.`,
    };
  }
  const overallAlignment = totalWeightedAlignment / totalVotesAcrossSectors;

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

/**
 * Peer comparison uses the state delegation only — not the full chamber.
 *
 * MR2 considered sampling 40 peers chamber-wide (prompt §Step 4), but the
 * premise that peer comparison dominates wall-clock is false: this path
 * issues one Redis KEYS + one MGET against keys scoped to
 * `alignment-score:{chamber}:{state}:*`. State delegations cap at ~50
 * members (House, CA) and often fall below MIN_PEERS (Senate, small
 * states), which the MIN_PEERS guard already handles by returning null.
 * Keeping state-scoped delegation preserves the "same-state peer" framing
 * citizens expect and avoids reshaping the semantic meaning of
 * `peerGroupLabel` during a performance phase.
 */
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

  // LLM call has variable latency; cap it so narrative never eats the cold
  // compute budget. On timeout we degrade to the pre-built statistical
  // fallback, which is correct enough for a first-visit render — the
  // cache-warm cron (MR4) will eventually populate AI narratives.
  try {
    return await withTimeout(
      generateInsightNarrative(systemContext, userPrompt, fallback, '[VoteFinance]'),
      LLM_NARRATIVE_TIMEOUT_MS,
      'VoteFinanceNarrative'
    );
  } catch {
    return { narrative: fallback, source: 'statistical-fallback' };
  }
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

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Temporal Vote Pattern Shifts Analyzer (Insight 3)
 *
 * Detects significant changes in a legislator's party-line voting alignment
 * over calendar quarters of the 119th Congress. Correlates detected shifts
 * with external events: new committee assignments, large contributions,
 * election proximity.
 *
 * Party alignment is computed from the roll-call corpus: each member's vote
 * is compared to their party's majority position on that same roll call.
 *
 * Flow: check cache → read chamber corpus → compute party alignment → partition
 * into quarters → detect shifts → correlate context → peer comparison → AI narrative → cache
 *
 * Pattern: finance-jurisdiction-analyzer.ts
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { getGeneralElectionDay } from '@/lib/data/election-dates';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import {
  freshestDate,
  generateInsightNarrative,
  getCurrentElectionCycle,
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
  peerComparisonUnavailable,
} from './shared';
import {
  computeChamberAlignment,
  derivePartyMajority,
  normalizePartyLabel,
  MIN_VOTES_FOR_ALIGNMENT,
} from './party-line-analyzer';
import { MIN_CORPUS_COVERAGE, readChamberCorpus } from './roll-corpus-reader';
import {
  confidenceScore,
  peerComparison,
  MIN_PEERS,
  MIN_QUARTERS_TEMPORAL,
} from '../statistics/civic-stats';
import type { TemporalVoteInsight, QuarterData, VoteShift, PeerComparison } from '../types';

/** Redis cache TTL: 14 days (temporal data changes slowly per roadmap). */
const CACHE_TTL = 14 * 24 * 60 * 60;

/** Shift detection threshold: 10 percentage points from trailing average. */
const SHIFT_THRESHOLD = 0.1;

/** Standard disclaimer for all temporal vote insights. */
const DISCLAIMER =
  'This analysis shows factual patterns in public voting data. ' +
  'Changes in voting alignment are common and reflect many factors including bill content, ' +
  'party strategy, and constituent preferences. ' +
  'Correlation with external events does not indicate causation.';

/** v2: built from the roll-call corpus. v1 entries came from a 250-vote
 *  sample fetched twice (once per session argument the fetchers ignored). */
export function temporalInsightCacheKey(bioguideId: string): string {
  return `insight:temporal_votes:v2:${bioguideId}`;
}

// ── Quarter Utilities ───────────────────────────────────────────────

/** Get quarter label for a date string, e.g., "2025-Q1". */
function getQuarterLabel(dateStr: string): string | null {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/** Sort quarter labels chronologically. */
function sortQuarters(a: string, b: string): number {
  return a.localeCompare(b);
}

// ── Main Analyzer ───────────────────────────────────────────────────

/**
 * Analyze temporal vote pattern shifts for a legislator.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * Returns null when the member can't be analyzed: not found, no D/R party
 * majority to compare against, a corpus below MIN_CORPUS_COVERAGE, or fewer
 * than MIN_QUARTERS_TEMPORAL quarters of votes.
 */
export async function analyzeTemporalVotes(
  bioguideId: string
): Promise<TemporalVoteInsight | null> {
  const cacheKey = temporalInsightCacheKey(bioguideId);

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<TemporalVoteInsight>(cacheKey);
    if (cached) {
      logger.info('[TemporalVotes] Cache hit', { bioguideId });
      trackInsightCacheHit('temporal-votes');
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-8. Compute — tracked
  return withInsightTracking('temporal-votes', () => computeAndCache(bioguideId, cacheKey));
}

async function computeAndCache(
  bioguideId: string,
  cacheKey: string
): Promise<TemporalVoteInsight | null> {
  // 2. Read the member's votes and party majorities from the corpus
  const data = await fetchData(bioguideId);
  if (!data) return null;

  // 3. Compute quarterly alignment
  const quarters = computeQuarterlyAlignment(data.votes);
  if (quarters.length < MIN_QUARTERS_TEMPORAL) {
    logger.info('[TemporalVotes] Insufficient quarters', {
      bioguideId,
      quartersFound: quarters.length,
      minimum: MIN_QUARTERS_TEMPORAL,
    });
    return null;
  }

  // 4. Detect shifts
  const shifts = await detectShifts(quarters, data, bioguideId);

  // 5. Classify overall trend
  const overallTrend = classifyTrend(quarters, shifts);

  // 6. Peer comparison: same-party members of the chamber, same corpus
  const peer = peerComparison(data.overallAlignment, data.peerScores, data.peerGroupLabel);

  // 7. Confidence
  const conf = confidenceScore({
    sampleSize: data.votes.length,
    minimumSampleSize: 40, // ~10 votes per quarter * 4 quarters
    dataCompleteness: data.corpusCoverage,
    peerCount: peer?.peerCount ?? 0,
  });

  // 8. Generate insight
  const { narrative, source } = await generateNarrative(data, quarters, shifts, overallTrend, peer);

  const sc = new SourceCollector();
  sc.add(
    data.chamber === 'House'
      ? 'Congress.gov House roll calls'
      : 'Senate.gov roll-call XML (mirrored)',
    `${getCurrentCongressNumber()}th Congress`,
    data.rollCount
  );

  const insight: TemporalVoteInsight = {
    bioguideId,
    quarters,
    shifts,
    overallTrend,
    peerComparison: peer,
    ...(peer
      ? {}
      : {
          peerComparisonUnavailableReason: peerComparisonUnavailable(data.peerGroupLabel),
        }),
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...data.votes.map(v => v.date)) ?? new Date().toISOString(),
    methodology:
      `Party alignment computed from ${data.rollCount} ${data.chamber} roll calls of the ` +
      `${getCurrentCongressNumber()}th Congress: a vote aligns when it matches the party majority ` +
      'among same-party Yea/Nay votes on that roll call (at least 5 voting, ties skipped). ' +
      'Present and Not Voting are excluded. Votes partitioned into calendar quarters. ' +
      'Shifts detected when quarterly alignment deviates >10 percentage points from the trailing ' +
      `4-quarter average. Peer baseline: ${data.peerGroupLabel} with at least ` +
      `${MIN_VOTES_FOR_ALIGNMENT} qualifying votes.`,
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
      trend: overallTrend,
      hasAnomaly: shifts.length > 0,
    }),
    sources: sc.toSources(),
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  await cacheInsight(cacheKey, insight);
  await cachePeerScore(bioguideId, data.overallAlignment, data.chamber, data.state, data.party);

  return insight;
}

// ── Data Fetching ───────────────────────────────────────────────────

interface AlignedVote {
  date: string;
  quarter: string;
  withParty: boolean;
}

interface FetchedData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  nextElection?: string;
  /** The member's Yea/Nay votes on rolls where their party had a clear majority. */
  votes: AlignedVote[];
  /** Share of all qualifying votes cast with the party majority. */
  overallAlignment: number;
  /** Same-party chamber members' overall alignment, excluding this member. */
  peerScores: number[];
  peerGroupLabel: string;
  /** Roll calls read from the corpus. */
  rollCount: number;
  corpusCoverage: number;
}

async function fetchData(bioguideId: string): Promise<FetchedData | null> {
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    logger.info('[TemporalVotes] Representative not found', { bioguideId });
    return null;
  }

  // Party alignment needs a party majority to compare against; independents
  // caucus with a party but have no majority of their own.
  const party = normalizePartyLabel(rep.party);
  if (!party) {
    logger.info('[TemporalVotes] No D/R party to align against', {
      bioguideId,
      party: rep.party,
    });
    return null;
  }

  const corpus = await readChamberCorpus(rep.chamber, getCurrentCongressNumber());
  if (corpus.rolls.length === 0 || corpus.coverage < MIN_CORPUS_COVERAGE) {
    logger.warn('[TemporalVotes] Roll-call corpus incomplete — temporal analysis unavailable', {
      bioguideId,
      chamber: rep.chamber,
      rolls: corpus.rolls.length,
      expected: corpus.expected,
      minimumCoverage: MIN_CORPUS_COVERAGE,
    });
    return null;
  }

  const votes: AlignedVote[] = [];
  for (const roll of corpus.rolls) {
    const own = roll.memberVotes.find(mv => mv.bioguideId === bioguideId);
    if (!own || (own.position !== 'Yea' && own.position !== 'Nay')) continue;

    const quarter = getQuarterLabel(roll.date);
    if (!quarter) continue;

    const majority = derivePartyMajority(roll.memberVotes, party);
    if (!majority) continue;

    votes.push({ date: roll.date, quarter, withParty: own.position === majority.position });
  }

  if (votes.length === 0) {
    logger.info('[TemporalVotes] No qualifying votes in corpus', { bioguideId });
    return null;
  }

  const chamberAlignment = computeChamberAlignment(corpus.rolls, party);
  const peerScores: number[] = [];
  for (const [id, entry] of chamberAlignment) {
    if (id === bioguideId || entry.votesAnalyzed < MIN_VOTES_FOR_ALIGNMENT) continue;
    peerScores.push(entry.alignmentRate);
  }

  const withParty = votes.filter(v => v.withParty).length;

  return {
    name: rep.name,
    party: rep.party,
    state: rep.state,
    chamber: rep.chamber,
    nextElection: rep.nextElection,
    votes,
    overallAlignment: withParty / votes.length,
    peerScores,
    peerGroupLabel: `other ${rep.chamber} ${party === 'Democratic' ? 'Democrats' : 'Republicans'}`,
    rollCount: corpus.rolls.length,
    corpusCoverage: corpus.coverage,
  };
}

// ── Quarterly Alignment Computation ─────────────────────────────────

function computeQuarterlyAlignment(votes: AlignedVote[]): QuarterData[] {
  // Partition into quarters
  const quarterMap = new Map<string, { withParty: number; total: number }>();
  for (const vote of votes) {
    const existing = quarterMap.get(vote.quarter) ?? { withParty: 0, total: 0 };
    if (vote.withParty) existing.withParty++;
    existing.total++;
    quarterMap.set(vote.quarter, existing);
  }

  // Build sorted quarter data with rolling averages
  const sortedQuarters = Array.from(quarterMap.entries()).sort(([a], [b]) => sortQuarters(a, b));

  const quarterData: QuarterData[] = [];
  for (let i = 0; i < sortedQuarters.length; i++) {
    const [quarter, counts] = sortedQuarters[i]!;
    const alignmentScore = counts.total > 0 ? counts.withParty / counts.total : 0;

    // Trailing 4-quarter average over PRIOR quarters only. Including the
    // current quarter damped every measured deviation by 25% (deviation
    // became 0.75 × the true distance from the trailing average).
    let rollingAverage: number | null = null;
    if (i >= 4) {
      const window = quarterData.slice(i - 4, i);
      rollingAverage = window.reduce((sum, q) => sum + q.alignmentScore, 0) / window.length;
    }

    quarterData.push({
      quarter,
      alignmentScore,
      voteCount: counts.total,
      rollingAverage,
    });
  }

  return quarterData;
}

// ── Shift Detection ─────────────────────────────────────────────────

async function detectShifts(
  quarters: QuarterData[],
  data: FetchedData,
  bioguideId: string
): Promise<VoteShift[]> {
  const shifts: VoteShift[] = [];

  for (let i = 0; i < quarters.length; i++) {
    const q = quarters[i]!;
    if (q.rollingAverage === null) continue;

    const deviation = q.alignmentScore - q.rollingAverage;
    const magnitude = Math.abs(deviation);

    if (magnitude >= SHIFT_THRESHOLD) {
      shifts.push({
        quarter: q.quarter,
        magnitude: Math.round(magnitude * 1000) / 10, // Convert to percentage points with 1 decimal
        direction: deviation > 0 ? 'increase' : 'decrease',
        context: {
          newCommittees: [], // Committee assignment dates not available in current data
          largeContributions: 0,
          electionProximity: isElectionProximity(q.quarter, data.nextElection),
        },
      });
    }
  }

  // Enrich shifts with FEC contribution context
  if (shifts.length > 0) {
    await enrichShiftsWithContributions(shifts, bioguideId);
  }

  return shifts;
}

/** Count large contributions (>$2,000) received during each shift quarter. */
async function enrichShiftsWithContributions(
  shifts: VoteShift[],
  bioguideId: string
): Promise<void> {
  try {
    const fecId = getFECIdFromBioguide(bioguideId);
    if (!fecId) return;

    const cycle = getCurrentElectionCycle();
    const contributions = await fecApiService.getSampleContributions(fecId, cycle);
    if (!contributions?.length) return;

    for (const shift of shifts) {
      const { start, end } = quarterDateRange(shift.quarter);
      const largeInQuarter = contributions.filter(c => {
        const amount =
          typeof c.contribution_receipt_amount === 'number' ? c.contribution_receipt_amount : 0;
        if (amount <= 2000) return false;
        const date = (c.contribution_receipt_date ?? '').slice(0, 10);
        return date >= start && date <= end;
      });
      shift.context.largeContributions = largeInQuarter.length;
    }
  } catch {
    // Non-fatal — leave largeContributions as 0
  }
}

/** Convert "2025-Q1" to date range {start: "2025-01-01", end: "2025-03-31"}. */
function quarterDateRange(quarter: string): { start: string; end: string } {
  const match = quarter.match(/^(\d{4})-Q(\d)$/);
  if (!match) return { start: '1970-01-01', end: '1970-01-01' };
  const year = match[1]!;
  const q = parseInt(match[2]!, 10);
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(parseInt(year, 10), endMonth, 0).getDate();
  return {
    start: `${year}-${String(startMonth).padStart(2, '0')}-01`,
    end: `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}`,
  };
}

/** Check whether a quarter falls within 6 months of the next election. */
function isElectionProximity(quarter: string, nextElection?: string): boolean {
  if (!nextElection) return false;

  // Parse quarter to approximate end date
  const match = quarter.match(/^(\d{4})-Q(\d)$/);
  if (!match) return false;

  const year = parseInt(match[1]!, 10);
  const q = parseInt(match[2]!, 10);
  const quarterEndMonth = q * 3; // Q1→3, Q2→6, Q3→9, Q4→12
  const quarterEnd = new Date(year, quarterEndMonth, 0); // Last day of quarter

  // Parse next election year (usually just a year string like "2026")
  const electionYear = parseInt(nextElection, 10);
  if (isNaN(electionYear)) return false;

  const electionDate = getGeneralElectionDay(electionYear);

  const diffMs = electionDate.getTime() - quarterEnd.getTime();
  const sixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000;

  return diffMs >= 0 && diffMs <= sixMonthsMs;
}

// ── Trend Classification ────────────────────────────────────────────

function classifyTrend(
  quarters: QuarterData[],
  shifts: VoteShift[]
): TemporalVoteInsight['overallTrend'] {
  if (quarters.length < 2) return 'stable';

  // If 2+ shifts detected, it's volatile
  if (shifts.length >= 2) return 'volatile';

  // Compare first half average to second half average
  const mid = Math.floor(quarters.length / 2);
  const firstHalf = quarters.slice(0, mid);
  const secondHalf = quarters.slice(mid);

  const firstAvg = firstHalf.reduce((s, q) => s + q.alignmentScore, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, q) => s + q.alignmentScore, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  if (Math.abs(diff) < 0.05) return 'stable';
  return diff > 0 ? 'increasing' : 'decreasing';
}

// ── Peer Comparison ─────────────────────────────────────────────────

function alignmentCacheKey(chamber: string, state: string, bioguideId: string): string {
  return `temporal-alignment:${chamber}:${state}:${bioguideId}`;
}

async function cachePeerScore(
  bioguideId: string,
  avgAlignment: number,
  chamber: string,
  state: string,
  party: string
): Promise<void> {
  try {
    await Promise.all([
      getRedisCache().set(alignmentCacheKey(chamber, state, bioguideId), avgAlignment, CACHE_TTL),
      getRedisCache().set(
        `temporal-alignment-party:${chamber}:${party}:${bioguideId}`,
        avgAlignment,
        CACHE_TTL
      ),
    ]);
  } catch {
    // Non-fatal
  }
}

// ── AI Narrative Generation ─────────────────────────────────────────

async function generateNarrative(
  data: FetchedData,
  quarters: QuarterData[],
  shifts: VoteShift[],
  overallTrend: string,
  peer: PeerComparison | null
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns in ' +
    'voting behavior over time. ';

  const quarterLines = quarters
    .map(
      q =>
        `- ${q.quarter}: ${(q.alignmentScore * 100).toFixed(1)}% alignment, ${q.voteCount} votes` +
        (q.rollingAverage !== null ? `, rolling avg ${(q.rollingAverage * 100).toFixed(1)}%` : '')
    )
    .join('\n');

  const shiftLines =
    shifts.length > 0
      ? shifts
          .map(
            s =>
              `- ${s.quarter}: ${s.magnitude.toFixed(1)}pp ${s.direction}` +
              (s.context.electionProximity ? ' (near election)' : '') +
              (s.context.largeContributions > 0
                ? ` (${s.context.largeContributions} large contributions)`
                : '')
          )
          .join('\n')
      : 'No significant shifts detected.';

  const peerLine = peer
    ? `Peer comparison: Overall alignment is ${(data.overallAlignment * 100).toFixed(1)}%. ` +
      `The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}% ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : `No peer comparison available (too few ${data.peerGroupLabel} with comparable data).`;

  const userPrompt = `LEGISLATOR: ${data.name} (${data.party}-${data.state}), ${data.chamber}

QUARTERLY PARTY ALIGNMENT (119th Congress):
${quarterLines}

OVERALL TREND: ${overallTrend}

DETECTED SHIFTS (>10 percentage points from trailing average):
${shiftLines}

${peerLine}

Write a 2-3 sentence plain-language summary of this legislator's voting alignment pattern over time. Note the overall trend and any significant shifts. If peer comparison is available, note whether alignment is above, below, or near the peer average. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(data, quarters, shifts, overallTrend, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[TemporalVotes]');
}

// ── Fallback ────────────────────────────────────────────────────────

function buildStatisticalSummary(
  data: FetchedData,
  quarters: QuarterData[],
  shifts: VoteShift[],
  overallTrend: string,
  peer: PeerComparison | null
): string {
  const avg = (data.overallAlignment * 100).toFixed(1);

  let summary =
    `${data.name} voted with their party ${avg}% of the time across ${quarters.length} quarters ` +
    `of the 119th Congress. The overall trend is ${overallTrend}.`;

  if (shifts.length > 0) {
    const biggest = [...shifts].sort((a, b) => b.magnitude - a.magnitude)[0]!;
    summary +=
      ` The largest shift was a ${biggest.magnitude.toFixed(1)} percentage point ` +
      `${biggest.direction} in ${biggest.quarter}.`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary += ` The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}%.`;
  }

  return summary;
}

// ── Cache Helpers ───────────────────────────────────────────────────

async function cacheInsight(key: string, insight: TemporalVoteInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[TemporalVotes] Cached insight', {
      bioguideId: insight.bioguideId,
      confidence: insight.confidence,
      quarters: insight.quarters.length,
    });
  } catch {
    // Non-fatal
  }
}

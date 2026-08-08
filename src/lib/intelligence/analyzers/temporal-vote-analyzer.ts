/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Vote Pattern Shifts Analyzer (Insight 3)
 *
 * Detects significant changes in a legislator's party-line voting alignment
 * over calendar quarters of the 119th Congress. Correlates detected shifts
 * with external events: new committee assignments, large contributions,
 * election proximity.
 *
 * Party alignment is computed from actual roll call XML — each member's vote
 * is compared to their party's majority position on that roll call.
 *
 * Flow: check cache → fetch votes → compute party alignment → partition into
 * quarters → detect shifts → correlate context → peer comparison → AI narrative → cache
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
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import {
  confidenceScore,
  peerComparison,
  MIN_PEERS,
  MIN_QUARTERS_TEMPORAL,
} from '../statistics/civic-stats';
import type { TemporalVoteInsight, QuarterData, VoteShift, PeerComparison } from '../types';

/** Redis cache TTL: 14 days (temporal data changes slowly per roadmap). */
const CACHE_TTL = 14 * 24 * 60 * 60;

/** Redis TTL for parsed roll call party breakdowns: 30 days. */
const ROLLCALL_CACHE_TTL = 30 * 24 * 60 * 60;

/** Shift detection threshold: 10 percentage points from trailing average. */
const SHIFT_THRESHOLD = 0.1;

/** Standard disclaimer for all temporal vote insights. */
const DISCLAIMER =
  'This analysis shows factual patterns in public voting data. ' +
  'Changes in voting alignment are common and reflect many factors including bill content, ' +
  'party strategy, and constituent preferences. ' +
  'Correlation with external events does not indicate causation.';

// ── Party Alignment from Roll Call XML ──────────────────────────────

/**
 * Result of parsing party breakdown from a roll call vote.
 * Describes the majority position of a given party on that vote.
 */
interface PartyBreakdown {
  /** The majority position of the specified party. */
  majorityPosition: 'Yea' | 'Nay' | null;
  /** Number of party members who voted Yea. */
  yeaCount: number;
  /** Number of party members who voted Nay. */
  nayCount: number;
  /** Total party members who voted (Yea + Nay only, excludes Present/Not Voting). */
  totalVoting: number;
}

/**
 * Determine a party's majority position from a House roll call XML.
 *
 * Parses `<recorded-vote>` elements, counts Yea/Nay by party attribute,
 * returns the majority position for the requested party.
 *
 * Results are cached in Redis (30-day TTL) to avoid re-parsing XML.
 */
async function getHousePartyBreakdown(
  rollCallNumber: number,
  year: number,
  memberParty: string
): Promise<PartyBreakdown | null> {
  const voteId = `house-${year}-${rollCallNumber}`;
  const cacheKey = `rollcall-party:${voteId}:${normalizeParty(memberParty)}`;

  // Check cache
  try {
    const cached = await getRedisCache().get<PartyBreakdown>(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache miss — continue
  }

  try {
    const url = `https://clerk.house.gov/evs/${year}/roll${rollCallNumber}.xml`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const xml = await response.text();
    const breakdown = parsePartyBreakdownFromXml(xml, memberParty);

    // Cache result
    try {
      await getRedisCache().set(cacheKey, breakdown, ROLLCALL_CACHE_TTL);
    } catch {
      // Non-fatal
    }

    return breakdown;
  } catch {
    return null;
  }
}

/**
 * Determine a party's majority position from a Senate roll call XML.
 */
async function getSenatePartyBreakdown(
  voteNumber: number,
  congress: number,
  session: number,
  memberParty: string
): Promise<PartyBreakdown | null> {
  const paddedNum = voteNumber.toString().padStart(5, '0');
  const voteId = `senate-${congress}-${session}-${voteNumber}`;
  const cacheKey = `rollcall-party:${voteId}:${normalizeParty(memberParty)}`;

  // Check cache
  try {
    const cached = await getRedisCache().get<PartyBreakdown>(cacheKey);
    if (cached) return cached;
  } catch {
    // Cache miss — continue
  }

  try {
    const url = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${paddedNum}.xml`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const xml = await response.text();
    const breakdown = parseSenatePartyBreakdown(xml, memberParty);

    // Cache result
    try {
      await getRedisCache().set(cacheKey, breakdown, ROLLCALL_CACHE_TTL);
    } catch {
      // Non-fatal
    }

    return breakdown;
  } catch {
    return null;
  }
}

/**
 * Parse party breakdown from House XML.
 * House XML uses `<recorded-vote>` with `<legislator party="D">` and `<vote>Yea</vote>`.
 */
function parsePartyBreakdownFromXml(xml: string, memberParty: string): PartyBreakdown {
  const normalizedParty = normalizeParty(memberParty);
  let yeaCount = 0;
  let nayCount = 0;

  const recordedVotes = xml.matchAll(/<recorded-vote>[\s\S]*?<\/recorded-vote>/g);
  for (const [block] of recordedVotes) {
    const partyMatch = block.match(/party="([^"]+)"/);
    const voteMatch = block.match(/<vote>([^<]*)<\/vote>/);

    if (!partyMatch?.[1] || !voteMatch?.[1]) continue;

    if (normalizeParty(partyMatch[1]) !== normalizedParty) continue;

    const position = voteMatch[1].trim().toLowerCase();
    if (position === 'yea' || position === 'aye' || position === 'yes') {
      yeaCount++;
    } else if (position === 'nay' || position === 'no') {
      nayCount++;
    }
  }

  const totalVoting = yeaCount + nayCount;
  const majorityPosition: 'Yea' | 'Nay' | null =
    totalVoting === 0 ? null : yeaCount >= nayCount ? 'Yea' : 'Nay';

  return { majorityPosition, yeaCount, nayCount, totalVoting };
}

/**
 * Parse party breakdown from Senate XML.
 * Senate XML uses `<member>` with `<party>D</party>` and `<vote_cast>Yea</vote_cast>`.
 */
function parseSenatePartyBreakdown(xml: string, memberParty: string): PartyBreakdown {
  const normalizedParty = normalizeParty(memberParty);
  let yeaCount = 0;
  let nayCount = 0;

  const members = xml.matchAll(/<member>[\s\S]*?<\/member>/g);
  for (const [block] of members) {
    const partyMatch = block.match(/<party>([^<]*)<\/party>/);
    const voteMatch = block.match(/<vote_cast>([^<]*)<\/vote_cast>/);

    if (!partyMatch?.[1] || !voteMatch?.[1]) continue;

    if (normalizeParty(partyMatch[1]) !== normalizedParty) continue;

    const position = voteMatch[1].trim().toLowerCase();
    if (position === 'yea' || position === 'aye' || position === 'yes') {
      yeaCount++;
    } else if (position === 'nay' || position === 'no') {
      nayCount++;
    }
  }

  const totalVoting = yeaCount + nayCount;
  const majorityPosition: 'Yea' | 'Nay' | null =
    totalVoting === 0 ? null : yeaCount >= nayCount ? 'Yea' : 'Nay';

  return { majorityPosition, yeaCount, nayCount, totalVoting };
}

/** Normalize party label to single letter. */
function normalizeParty(party: string): string {
  const p = party.trim().toUpperCase();
  if (p === 'D' || p === 'DEMOCRAT' || p === 'DEMOCRATIC') return 'D';
  if (p === 'R' || p === 'REPUBLICAN') return 'R';
  if (p === 'I' || p === 'INDEPENDENT' || p === 'ID') return 'I';
  return p.charAt(0) || 'U';
}

/** Normalize a member vote position to Yea/Nay. */
function normalizePosition(position: string): 'Yea' | 'Nay' | null {
  const p = position.toLowerCase().trim();
  if (p === 'yea' || p === 'aye' || p === 'yes') return 'Yea';
  if (p === 'nay' || p === 'no') return 'Nay';
  return null; // Present / Not Voting are excluded from alignment calculation
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
 * On any failure, returns a statistical fallback without AI narrative.
 */
export async function analyzeTemporalVotes(
  bioguideId: string
): Promise<TemporalVoteInsight | null> {
  const cacheKey = `insight:temporal_votes:${bioguideId}`;

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
  // 2. Fetch data
  const data = await fetchData(bioguideId);
  if (!data) return null;

  // 3. Compute quarterly alignment
  const quarters = await computeQuarterlyAlignment(data);
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

  // 6. Peer comparison
  const avgAlignment = quarters.reduce((sum, q) => sum + q.alignmentScore, 0) / quarters.length;
  const peer = await computePeerComparison(bioguideId, avgAlignment, data.chamber, data.state);

  // 7. Confidence
  const conf = confidenceScore({
    sampleSize: quarters.reduce((sum, q) => sum + q.voteCount, 0),
    minimumSampleSize: 40, // ~10 votes per quarter * 4 quarters
    dataCompleteness: quarters.length / 5, // 5 quarters is full 119th Congress data
    peerCount: peer?.peerCount ?? 0,
  });

  // 8. Generate insight
  const { narrative, source } = await generateNarrative(data, quarters, shifts, overallTrend, peer);

  const sc = new SourceCollector();
  sc.add('Congress.gov roll calls', '119th Congress', data.votes.length);
  sc.add('House Clerk / Senate XML', '119th Congress');

  const insight: TemporalVoteInsight = {
    bioguideId,
    quarters,
    shifts,
    overallTrend,
    peerComparison: peer,
    ...(peer
      ? {}
      : {
          peerComparisonUnavailableReason: peerComparisonUnavailable(
            `other members of the ${data.state} ${data.chamber} delegation`
          ),
        }),
    narrative,
    confidence: source === 'statistical-fallback' ? Math.min(conf, 0.5) : conf,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...data.votes.map(v => v.date))!,
    methodology:
      'Party alignment computed by comparing each vote to the party majority position ' +
      'on that roll call (from House Clerk / Senate XML). Votes partitioned into calendar quarters. ' +
      'Shifts detected when quarterly alignment deviates >10 percentage points from trailing 4-quarter average.',
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
  await cachePeerScore(bioguideId, avgAlignment, data.chamber, data.state, data.party);

  return insight;
}

// ── Data Fetching ───────────────────────────────────────────────────

interface FetchedData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  committees: string[];
  nextElection?: string;
  votes: Array<{
    voteId: string;
    date: string;
    position: string;
    rollCallNumber?: number;
  }>;
}

async function fetchData(bioguideId: string): Promise<FetchedData | null> {
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    logger.info('[TemporalVotes] Representative not found', { bioguideId });
    return null;
  }

  // Fetch votes from both sessions of 119th Congress
  let allVotes: Array<{
    voteId: string;
    date: string;
    position: string;
    rollCallNumber?: number;
  }> = [];

  const isHouse = rep.chamber === 'House';

  for (const session of [1, 2]) {
    try {
      const sessionVotes = isHouse
        ? await batchVotingService.getHouseMemberVotes(
            bioguideId,
            getCurrentCongressNumber(),
            session,
            250
          )
        : await batchVotingService.getSenateMemberVotes(
            bioguideId,
            getCurrentCongressNumber(),
            session,
            250
          );

      allVotes = allVotes.concat(
        sessionVotes.map(v => ({
          voteId: v.voteId,
          date: v.date,
          position: v.position,
          rollCallNumber: v.rollCallNumber,
        }))
      );
    } catch {
      logger.warn('[TemporalVotes] Failed to fetch session votes', {
        bioguideId,
        session,
        chamber: rep.chamber,
      });
    }
  }

  if (allVotes.length === 0) {
    logger.info('[TemporalVotes] No votes found', { bioguideId });
    return null;
  }

  return {
    name: rep.name,
    party: rep.party,
    state: rep.state,
    chamber: rep.chamber,
    committees: rep.committees?.map(c => c.name) ?? [],
    nextElection: rep.nextElection,
    votes: allVotes,
  };
}

// ── Quarterly Alignment Computation ─────────────────────────────────

interface VoteWithAlignment {
  quarter: string;
  withParty: boolean;
}

async function computeQuarterlyAlignment(data: FetchedData): Promise<QuarterData[]> {
  // Determine party alignment for each vote
  const alignedVotes: VoteWithAlignment[] = [];

  // Process votes in batches to limit concurrency
  const BATCH_SIZE = 10;
  for (let i = 0; i < data.votes.length; i += BATCH_SIZE) {
    const batch = data.votes.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(async vote => {
        const quarter = getQuarterLabel(vote.date);
        if (!quarter) return null;

        const memberPosition = normalizePosition(vote.position);
        if (!memberPosition) return null; // Skip Present / Not Voting

        // Get party majority position from roll call XML
        let breakdown: PartyBreakdown | null = null;

        if (data.chamber === 'House' && vote.rollCallNumber) {
          const year = new Date(vote.date).getFullYear();
          breakdown = await getHousePartyBreakdown(vote.rollCallNumber, year, data.party);
        } else if (data.chamber === 'Senate' && vote.rollCallNumber) {
          const session = getSessionFromDate(vote.date);
          breakdown = await getSenatePartyBreakdown(
            vote.rollCallNumber,
            getCurrentCongressNumber(),
            session,
            data.party
          );
        }

        if (!breakdown?.majorityPosition) return null;

        return {
          quarter,
          withParty: memberPosition === breakdown.majorityPosition,
        };
      })
    );

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        alignedVotes.push(result.value);
      }
    }
  }

  // Partition into quarters
  const quarterMap = new Map<string, { withParty: number; total: number }>();
  for (const vote of alignedVotes) {
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

/** Get Congress session number from a date (odd year = session 1, even year = session 2). */
function getSessionFromDate(dateStr: string): number {
  const year = new Date(dateStr).getFullYear();
  return year % 2 === 1 ? 1 : 2;
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

async function computePeerComparison(
  bioguideId: string,
  avgAlignment: number,
  chamber: string,
  state: string
): Promise<PeerComparison | null> {
  try {
    const pattern = `temporal-alignment:${chamber}:${state}:*`;
    const keys = await getRedisCache().keys(pattern);

    const peerKeys = keys.filter(k => !k.endsWith(`:${bioguideId}`));
    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(avgAlignment, peerScores, `${state} ${chamber} delegation members`);
  } catch {
    return null;
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
    ? `Peer comparison: Average alignment is ${(avgFromQuarters(quarters) * 100).toFixed(1)}%. ` +
      `The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}% ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from state delegation).';

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

function avgFromQuarters(quarters: QuarterData[]): number {
  return quarters.reduce((sum, q) => sum + q.alignmentScore, 0) / quarters.length;
}

// ── Fallback ────────────────────────────────────────────────────────

function buildStatisticalSummary(
  data: FetchedData,
  quarters: QuarterData[],
  shifts: VoteShift[],
  overallTrend: string,
  peer: PeerComparison | null
): string {
  const avg = (avgFromQuarters(quarters) * 100).toFixed(1);

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

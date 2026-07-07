/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Chamber Baselines (Incumbent Record Card, Section B)
 *
 * One chamber-wide sweep of roll calls produces, for EVERY member at once:
 * votes cast / missed ("561 of 587"), missed-vote %, and party-majority
 * alignment %, plus the chamber median missed % and per-party median
 * alignment that the card shows beside each member's number (baselines
 * required — no stat that can mislead alone).
 *
 * Statistics only, no AI. Reuses party-line-analyzer's derivation helpers so
 * "votes with party majority" means exactly the same thing everywhere.
 *
 * Build cost: one roll-call list fetch + one members fetch per roll call
 * (~600 for a full House Congress), so the result blob is Redis-cached for
 * 24h and reads NEVER trigger a build — pages render a designed
 * "unavailable" state until a build has run (see /api/intelligence/
 * chamber-baselines). Roll calls are immutable; rebuilds only add new votes.
 *
 * Coverage honesty:
 * - House: full-Congress sweep via the Clerk-backed vote list.
 * - Senate: recent-sample only (Senate.gov XML; blocked on Vercel cloud IPs
 *   — MR10), so `fullCoverage: false` and the sample size is disclosed.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import {
  batchVotingService,
  type StandardizedVote,
} from '@/features/representatives/services/batch-voting-service';
import { computeChamberAlignment, MIN_VOTES_FOR_ALIGNMENT } from './party-line-analyzer';

/** Redis TTL: 24h — new roll calls land daily when in session. */
const CACHE_TTL_SECONDS = 24 * 60 * 60;

/** Roll-call fetch ceiling (a two-year House Congress runs ~600-900). */
const HOUSE_SWEEP_LIMIT = 1500;

/** Senate sample size (recent roll calls; full sweep blocked in prod). */
const SENATE_SAMPLE_LIMIT = 120;

/** Members below this many roll-call appearances are excluded from the
 *  chamber median (mid-term arrivals with noisy percentages), but their own
 *  stats are still reported with the small sample visible. */
const MIN_APPEARANCES_FOR_MEDIAN = 20;

export interface MemberVoteStats {
  name: string;
  party: string;
  /** Roll calls where this member appears (their personal denominator). */
  appearances: number;
  /** Yea + Nay + Present. */
  cast: number;
  /** 'Not Voting' appearances. */
  missed: number;
  /** missed / appearances, 0–100. */
  missedPct: number;
  /** Party-majority alignment 0–100, or null below MIN_VOTES_FOR_ALIGNMENT
   *  or for members outside the two-party derivation (independents). */
  partyAlignmentPct: number | null;
  /** Qualifying votes behind partyAlignmentPct. */
  alignmentVotes: number;
}

export interface ChamberBaselines {
  chamber: 'House' | 'Senate';
  congress: number;
  /** Roll calls analyzed (each contributes every member's position). */
  rollCallsAnalyzed: number;
  /** True when the sweep covered the full Congress to date (House). */
  fullCoverage: boolean;
  /** Human framing for the sample, e.g. "119th Congress to date". */
  coverageLabel: string;
  members: Record<string, MemberVoteStats>;
  /** Chamber median missed-vote %, over members with enough appearances. */
  medianMissedPct: number | null;
  medianAlignmentByParty: {
    Democratic: number | null;
    Republican: number | null;
  };
  /** Members included in the medians (sample-size disclosure). */
  medianSampleSize: number;
  /** ISO date of the newest roll call analyzed. */
  dataAsOf: string;
  builtAt: string;
  methodology: string;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const lower = sorted[mid - 1];
  const upper = sorted[mid];
  if (sorted.length % 2 === 0 && lower !== undefined && upper !== undefined) {
    return (lower + upper) / 2;
  }
  return upper ?? null;
}

function cacheKey(chamber: 'House' | 'Senate', congress: number): string {
  return `record-card:chamber-baselines:${chamber.toLowerCase()}:${congress}`;
}

/**
 * Pure computation over a set of chamber roll calls. Exported for tests.
 */
export function computeChamberBaselines(
  rollCalls: StandardizedVote[],
  chamber: 'House' | 'Senate',
  congress: number,
  fullCoverage: boolean,
  now: Date = new Date()
): ChamberBaselines {
  const members: Record<string, MemberVoteStats> = {};

  let newestDate = '';
  for (const roll of rollCalls) {
    if (roll.date > newestDate) newestDate = roll.date;

    for (const mv of roll.memberVotes) {
      const entry = (members[mv.bioguideId] ??= {
        name: mv.name,
        party: mv.party,
        appearances: 0,
        cast: 0,
        missed: 0,
        missedPct: 0,
        partyAlignmentPct: null,
        alignmentVotes: 0,
      });
      entry.appearances++;
      if (mv.position === 'Not Voting') entry.missed++;
      else entry.cast++;
    }
  }

  // Party-majority alignment for every member of each party, from the same
  // roll calls, using the shared derivation (Yea/Nay only, quorum >= 5).
  for (const party of ['Democratic', 'Republican'] as const) {
    const alignment = computeChamberAlignment(rollCalls, party);
    for (const [bioguideId, a] of alignment) {
      const entry = members[bioguideId];
      if (!entry) continue;
      entry.alignmentVotes = a.votesAnalyzed;
      entry.partyAlignmentPct =
        a.votesAnalyzed >= MIN_VOTES_FOR_ALIGNMENT ? a.alignmentRate * 100 : null;
    }
  }

  const missedPcts: number[] = [];
  const alignmentByParty: Record<'Democratic' | 'Republican', number[]> = {
    Democratic: [],
    Republican: [],
  };
  let medianSampleSize = 0;

  for (const entry of Object.values(members)) {
    entry.missedPct = entry.appearances > 0 ? (entry.missed / entry.appearances) * 100 : 0;

    if (entry.appearances < MIN_APPEARANCES_FOR_MEDIAN) continue;
    medianSampleSize++;
    missedPcts.push(entry.missedPct);

    if (entry.partyAlignmentPct === null) continue;
    const p = entry.party.trim().toUpperCase();
    if (p.startsWith('D')) alignmentByParty.Democratic.push(entry.partyAlignmentPct);
    else if (p.startsWith('R')) alignmentByParty.Republican.push(entry.partyAlignmentPct);
  }

  return {
    chamber,
    congress,
    rollCallsAnalyzed: rollCalls.length,
    fullCoverage,
    coverageLabel: fullCoverage ? `${congress}th Congress to date` : `recent sample`,
    members,
    medianMissedPct: median(missedPcts),
    medianAlignmentByParty: {
      Democratic: median(alignmentByParty.Democratic),
      Republican: median(alignmentByParty.Republican),
    },
    medianSampleSize,
    dataAsOf: newestDate || now.toISOString(),
    builtAt: now.toISOString(),
    methodology:
      `Computed from ${rollCalls.length} ${chamber} roll calls of the ` +
      `${congress}th Congress` +
      `${fullCoverage ? ' (both sessions, to date)' : ' (recent sample, not the full Congress)'}. ` +
      `"Cast" counts Yea, Nay, and Present; "missed" counts Not Voting. Each member's ` +
      `denominator is the roll calls held while they served. Party alignment follows the ` +
      `party-line analyzer: a member aligns when matching their party's majority among ` +
      `Yea/Nay votes with a quorum of at least 5; members with fewer than ` +
      `${MIN_VOTES_FOR_ALIGNMENT} qualifying votes are not scored. Medians cover members ` +
      `with at least ${MIN_APPEARANCES_FOR_MEDIAN} appearances.`,
  };
}

/**
 * Read-only accessor: returns the cached baselines or null. NEVER builds —
 * callers render a designed unavailable state on null.
 */
export async function getChamberBaselines(
  chamber: 'House' | 'Senate',
  congress: number = getCurrentCongressNumber()
): Promise<ChamberBaselines | null> {
  try {
    return await getRedisCache().get<ChamberBaselines>(cacheKey(chamber, congress));
  } catch (error) {
    logger.warn('Chamber baselines cache read failed', { chamber, congress, error });
    return null;
  }
}

/** Minimum share of the vote list a House sweep must cover before its blob
 *  may replace the cached one. Partial sweeps produce misleading personal
 *  denominators ("51 of 51"), so an incomplete build keeps the old blob. */
const MIN_HOUSE_COVERAGE = 0.9;

/** Congress.gov sustains roughly 80 requests/minute before returning 429s;
 *  900ms spacing keeps the corpus fill safely under that. */
const FETCH_SPACING_MS = 900;

/** Wait for the shared circuit breaker to close after a failure burst. */
const BREAKER_RESET_WAIT_MS = 65_000;

/** Default per-run fetch budget. A Vercel cron invocation gets 300s; this
 *  leaves headroom for the vote-list fetch, Redis reads, and compute. A
 *  595-roll cold corpus fills across ~3 daily runs, then steady-state is
 *  only the handful of new roll calls per day. */
const DEFAULT_FETCH_BUDGET_MS = 200_000;

/** Roll calls are immutable once cast — keep them 120 days and refresh TTL
 *  on rebuilds so an active Congress never ages out. */
const ROLL_TTL_SECONDS = 120 * 24 * 60 * 60;

/**
 * Compact persisted form of one roll call — just what baselines need.
 * (~30 bytes/member instead of the full StandardizedVote's ~80.)
 */
interface CompactRollCall {
  rollCallNumber: number;
  session: number;
  date: string;
  votes: Array<{ b: string; p: string; v: 'Y' | 'N' | 'P' | 'X' }>;
}

const POSITION_TO_CODE: Record<string, 'Y' | 'N' | 'P' | 'X'> = {
  Yea: 'Y',
  Nay: 'N',
  Present: 'P',
  'Not Voting': 'X',
};
const CODE_TO_POSITION: Record<
  'Y' | 'N' | 'P' | 'X',
  StandardizedVote['memberVotes'][number]['position']
> = {
  Y: 'Yea',
  N: 'Nay',
  P: 'Present',
  X: 'Not Voting',
};

function compactRoll(roll: StandardizedVote): CompactRollCall {
  return {
    rollCallNumber: roll.rollCallNumber,
    session: roll.session,
    date: roll.date,
    votes: roll.memberVotes.map(mv => ({
      b: mv.bioguideId,
      p: mv.party,
      v: POSITION_TO_CODE[mv.position] ?? 'X',
    })),
  };
}

/** Rehydrate to the StandardizedVote shape the compute + party-line helpers
 *  consume. Display-only fields we don't persist are left empty. */
function expandRoll(c: CompactRollCall, congress: number): StandardizedVote {
  return {
    voteId: `house-${congress}-${c.session}-${c.rollCallNumber}`,
    congress,
    session: c.session,
    chamber: 'House',
    rollCallNumber: c.rollCallNumber,
    date: c.date,
    question: '',
    result: '',
    totals: { yea: 0, nay: 0, present: 0, notVoting: 0 },
    memberVotes: c.votes.map(v => ({
      bioguideId: v.b,
      name: '',
      party: v.p,
      state: '',
      position: CODE_TO_POSITION[v.v],
    })),
    sourceUrl: '',
    processedAt: c.date,
  };
}

function rollKey(congress: number, session: number, rollCallNumber: number): string {
  return `record-card:roll:house:${congress}:${session}:${rollCallNumber}`;
}

function sessionForDate(date: string): number {
  const year = new Date(date).getFullYear();
  return Number.isFinite(year) && year % 2 === 1 ? 1 : 2;
}

/**
 * Assemble the House roll-call corpus: Redis-persisted compact rolls for
 * everything already fetched, plus a PACED fill of whatever is missing
 * (sequential, ~66 requests/minute, inside a time budget). Roll calls are
 * immutable, so the corpus accumulates across cron runs — a cold Congress
 * fills over a few days and steady-state fetches only new votes.
 */
async function assembleHouseCorpus(
  congress: number,
  session: number,
  budgetMs: number
): Promise<{ rolls: StandardizedVote[]; expected: number }> {
  const redis = getRedisCache();
  const deadline = Date.now() + budgetMs;

  const list = await batchVotingService.getHouseVoteListItems(congress, session, HOUSE_SWEEP_LIMIT);
  if (list.length === 0) return { rolls: [], expected: 0 };

  // Read the persisted corpus (batched to limit round-trips)
  const rolls: StandardizedVote[] = [];
  const misses: typeof list = [];
  const READ_BATCH = 25;
  for (let i = 0; i < list.length; i += READ_BATCH) {
    const batch = list.slice(i, i + READ_BATCH);
    const cached = await Promise.all(
      batch.map(item =>
        redis.get<CompactRollCall>(
          rollKey(congress, sessionForDate(item.date), item.rollCallNumber)
        )
      )
    );
    cached.forEach((c, j) => {
      const item = batch[j];
      if (!item) return;
      if (c) rolls.push(expandRoll(c, congress));
      else misses.push(item);
    });
  }

  // Paced fill of the gap, newest first, until the budget runs out
  let fetched = 0;
  let consecutiveFailures = 0;
  for (const item of misses) {
    if (Date.now() > deadline) break;

    const roll = await batchVotingService.getHouseRollCallDetail(item, congress);
    if (roll) {
      consecutiveFailures = 0;
      rolls.push(roll);
      fetched++;
      try {
        await redis.set(
          rollKey(congress, roll.session, roll.rollCallNumber),
          compactRoll(roll),
          ROLL_TTL_SECONDS
        );
      } catch {
        // Persistence failure just means a refetch next run
      }
      await new Promise(r => setTimeout(r, FETCH_SPACING_MS));
    } else {
      consecutiveFailures++;
      // A failure burst usually means the shared circuit breaker opened
      // (one 429 suffices). Wait it out once if the budget allows.
      if (consecutiveFailures >= 3) {
        if (Date.now() + BREAKER_RESET_WAIT_MS > deadline) break;
        logger.warn('House corpus fill pausing for circuit-breaker reset', {
          fetchedThisRun: fetched,
          remaining: misses.length - fetched,
        });
        await new Promise(r => setTimeout(r, BREAKER_RESET_WAIT_MS));
        consecutiveFailures = 0;
      }
    }
  }

  logger.info('House corpus assembled', {
    congress,
    expected: list.length,
    fromRedis: rolls.length - fetched,
    fetchedThisRun: fetched,
    coveragePct: Math.round((rolls.length / list.length) * 100),
  });

  return { rolls, expected: list.length };
}

/**
 * Build (or refresh) the baselines blob for a chamber. Expensive — one
 * members fetch per roll call — so this is only invoked from the dedicated
 * build route / warmup path, never from page rendering.
 *
 * A blob is only cached when it is trustworthy: House corpora must cover
 * >= MIN_HOUSE_COVERAGE of the vote list, and every blob must contain
 * member data. Otherwise the previous blob stays in place and the pages
 * keep whatever honest data they had.
 */
export async function buildChamberBaselines(
  chamber: 'House' | 'Senate',
  congress: number = getCurrentCongressNumber(),
  options: { fetchBudgetMs?: number } = {}
): Promise<ChamberBaselines | null> {
  const started = Date.now();
  const session = new Date().getFullYear() % 2 === 1 ? 1 : 2;

  let rollCalls: StandardizedVote[] = [];
  let expected = 0;

  if (chamber === 'House') {
    const corpus = await assembleHouseCorpus(
      congress,
      session,
      options.fetchBudgetMs ?? DEFAULT_FETCH_BUDGET_MS
    );
    rollCalls = corpus.rolls;
    expected = corpus.expected;
  } else {
    rollCalls = await batchVotingService.getSenateChamberRollCalls(
      congress,
      session,
      SENATE_SAMPLE_LIMIT
    );
  }

  if (rollCalls.length === 0) {
    logger.warn('Chamber baselines build got no roll calls', { chamber, congress });
    return null;
  }

  const fullCoverage =
    chamber === 'House' && expected > 0 && rollCalls.length >= expected * MIN_HOUSE_COVERAGE;
  const baselines = computeChamberBaselines(rollCalls, chamber, congress, fullCoverage);
  const memberCount = Object.keys(baselines.members).length;

  // Trust gates: never cache a memberless blob (Senate XML returning
  // totals-only shells) or a partial House corpus — both would replace good
  // data with misleading data (a 51-roll corpus reads as "51 of 51").
  const trustworthy = memberCount > 0 && (chamber !== 'House' || fullCoverage);

  if (!trustworthy) {
    logger.warn('Chamber baselines build untrustworthy — keeping previous blob', {
      chamber,
      congress,
      rollCalls: rollCalls.length,
      expected,
      members: memberCount,
      buildMs: Date.now() - started,
    });
    return null;
  }

  try {
    await getRedisCache().set(cacheKey(chamber, congress), baselines, CACHE_TTL_SECONDS);
  } catch (error) {
    logger.error('Chamber baselines cache write failed', error as Error, { chamber, congress });
  }

  logger.info('Chamber baselines built', {
    chamber,
    congress,
    rollCalls: rollCalls.length,
    expected,
    members: memberCount,
    medianMissedPct: baselines.medianMissedPct,
    buildMs: Date.now() - started,
  });

  return baselines;
}

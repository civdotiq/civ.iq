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
  /** True when the sweep covered the full current session to date (House). */
  fullCoverage: boolean;
  /** Session the roll calls belong to (roll numbering resets per session). */
  session: number;
  /** Human framing for the sample, e.g. "2026 session". */
  sessionLabel: string;
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
  session: number,
  sessionYear: number,
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

  const sessionLabel = `${sessionYear} session`;

  return {
    chamber,
    congress,
    rollCallsAnalyzed: rollCalls.length,
    fullCoverage,
    session,
    sessionLabel,
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
      `${congress}th Congress, ${sessionLabel}` +
      `${fullCoverage ? '' : ' (recent sample, not the full session)'}. ` +
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

/**
 * Build (or refresh) the baselines blob for a chamber. Expensive — one
 * members fetch per roll call — so this is only invoked from the dedicated
 * build route / warmup path, never from page rendering.
 */
export async function buildChamberBaselines(
  chamber: 'House' | 'Senate',
  congress: number = getCurrentCongressNumber()
): Promise<ChamberBaselines | null> {
  const started = Date.now();

  const sessionYear = new Date().getFullYear();
  const session = sessionYear % 2 === 1 ? 1 : 2;
  const rollCalls =
    chamber === 'House'
      ? await batchVotingService.getHouseChamberRollCalls(congress, session, HOUSE_SWEEP_LIMIT)
      : await batchVotingService.getSenateChamberRollCalls(congress, session, SENATE_SAMPLE_LIMIT);

  if (rollCalls.length === 0) {
    logger.warn('Chamber baselines build got no roll calls', { chamber, congress });
    return null;
  }

  const baselines = computeChamberBaselines(
    rollCalls,
    chamber,
    congress,
    chamber === 'House',
    session,
    sessionYear
  );

  try {
    await getRedisCache().set(cacheKey(chamber, congress), baselines, CACHE_TTL_SECONDS);
  } catch (error) {
    logger.error('Chamber baselines cache write failed', error as Error, { chamber, congress });
  }

  logger.info('Chamber baselines built', {
    chamber,
    congress,
    rollCalls: rollCalls.length,
    members: Object.keys(baselines.members).length,
    medianMissedPct: baselines.medianMissedPct,
    buildMs: Date.now() - started,
  });

  return baselines;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Party-Line Alignment Analyzer (real)
 *
 * Replaces the broken party-alignment heuristic (which assumed every Yea vote
 * was a party-line vote). Computes alignment by:
 *
 * 1. Fetching recent chamber-wide roll calls via batchVotingService — each
 *    StandardizedVote contains every member's position and party.
 * 2. For each roll call, deriving each party's majority position from the
 *    party members' actual votes (Yea/Nay only; Present/Not Voting excluded).
 * 3. For the target representative, counting votes where their position
 *    matches their own party's derived majority.
 * 4. Computing REAL peer averages by running the same calculation for every
 *    other same-chamber, same-party member present in the same roll calls.
 *    No hardcoded constants.
 *
 * Not yet wired to any UI — the /ask question templates that previously
 * served the broken math were disabled. This analyzer is the replacement
 * backend for re-enabling those pages once they pass review.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import {
  batchVotingService,
  type StandardizedVote,
} from '@/features/representatives/services/batch-voting-service';
import { confidenceScore } from '../statistics/civic-stats';

/** Redis cache TTL: 6 hours. Roll-call data changes slowly mid-congress. */
const CACHE_TTL = 6 * 60 * 60;

/** Minimum qualifying votes before an alignment number can be reported. */
export const MIN_VOTES_FOR_ALIGNMENT = 10;

/** Minimum party members voting before a roll call counts toward alignment. */
const MIN_PARTY_QUORUM = 5;

/** Default number of recent roll calls to pull per chamber. */
const DEFAULT_ROLL_CALL_LIMIT = 60;

/** Standard disclaimer — public voting data analysis, no causation. */
const DISCLAIMER =
  'This analysis shows factual alignment between a legislator and their party ' +
  'based on recorded roll call votes. Alignment rates vary with bill content, ' +
  'procedural strategy, and constituent preferences. Alignment is not a measure ' +
  'of ideology.';

// ── Public Types ─────────────────────────────────────────────────────

export interface PartyLineInsight {
  bioguideId: string;
  name: string;
  party: 'Democratic' | 'Republican';
  chamber: 'House' | 'Senate';

  /** Fraction of qualifying votes where rep matched their party's majority (0–1). */
  alignmentRate: number;

  /** Number of qualifying votes included in the alignment calculation. */
  votesAnalyzed: number;

  /** Votes where the rep matched their party's majority. */
  votesWithParty: number;

  /** Votes where the rep broke with their party's majority. */
  votesAgainstParty: number;

  /** Mean alignment rate of same-chamber, same-party peers computed from the same roll calls. */
  peerAverageAlignment: number;

  /** Number of peer legislators used in the average. */
  peerCount: number;

  /** Confidence score (0–1) derived from sample size and peer count. */
  confidence: number;

  /** ISO date of the freshest roll call used. */
  dataAsOf: string;

  /** Human-readable description of the computation. */
  methodology: string;

  /** Standard correlation != causation disclaimer. */
  disclaimer: string;

  /** ISO timestamp when this insight was generated. */
  lastAnalyzedAt: string;
}

// ── Internal Types ───────────────────────────────────────────────────

type BinaryPosition = 'Yea' | 'Nay';

interface PartyMajority {
  /** The derived majority position for the target party on this vote. */
  position: BinaryPosition;
  /** Number of same-party members voting Yea or Nay (excludes Present/Not Voting). */
  partyQuorum: number;
}

// ── Utilities ────────────────────────────────────────────────────────

/**
 * Normalize a party label from roll-call XML into one of the canonical values
 * we care about. Returns null for anything we don't classify (mostly Independents).
 */
export function normalizePartyLabel(raw: string): 'Democratic' | 'Republican' | null {
  const p = raw.trim().toUpperCase();
  if (p === 'D' || p === 'DEM' || p === 'DEMOCRAT' || p === 'DEMOCRATIC') return 'Democratic';
  if (p === 'R' || p === 'REP' || p === 'REPUBLICAN') return 'Republican';
  return null;
}

/** True if a position counts as a substantive vote (excludes Present/Not Voting). */
function isBinaryPosition(position: string): position is BinaryPosition {
  return position === 'Yea' || position === 'Nay';
}

/**
 * Given all member votes on one roll call, derive the majority position for
 * the specified party. Returns null when the party doesn't have a clear
 * quorum (< MIN_PARTY_QUORUM members voting Yea/Nay).
 */
export function derivePartyMajority(
  memberVotes: StandardizedVote['memberVotes'],
  targetParty: 'Democratic' | 'Republican'
): PartyMajority | null {
  let yea = 0;
  let nay = 0;

  for (const mv of memberVotes) {
    if (normalizePartyLabel(mv.party) !== targetParty) continue;
    if (mv.position === 'Yea') yea++;
    else if (mv.position === 'Nay') nay++;
  }

  const quorum = yea + nay;
  if (quorum < MIN_PARTY_QUORUM) return null;

  // Ties are extremely rare in party-line voting but we need a deterministic rule.
  // When tied, treat the party as having no clear position and skip this vote.
  if (yea === nay) return null;

  return { position: yea > nay ? 'Yea' : 'Nay', partyQuorum: quorum };
}

/**
 * Compute the alignment rate for every same-party member across a set of
 * roll calls. Returns a map from bioguideId to that member's alignment
 * rate, number of qualifying votes, and display name.
 */
export function computeChamberAlignment(
  rollCalls: StandardizedVote[],
  targetParty: 'Democratic' | 'Republican'
): Map<string, { alignmentRate: number; votesAnalyzed: number; name: string }> {
  const perMember = new Map<string, { withParty: number; votesAnalyzed: number; name: string }>();

  for (const roll of rollCalls) {
    const majority = derivePartyMajority(roll.memberVotes, targetParty);
    if (!majority) continue;

    for (const mv of roll.memberVotes) {
      if (normalizePartyLabel(mv.party) !== targetParty) continue;
      if (!isBinaryPosition(mv.position)) continue; // Present/Not Voting excluded

      const existing = perMember.get(mv.bioguideId) ?? {
        withParty: 0,
        votesAnalyzed: 0,
        name: mv.name,
      };
      existing.votesAnalyzed++;
      if (mv.position === majority.position) existing.withParty++;
      perMember.set(mv.bioguideId, existing);
    }
  }

  const result = new Map<string, { alignmentRate: number; votesAnalyzed: number; name: string }>();
  for (const [bioguideId, data] of perMember) {
    if (data.votesAnalyzed === 0) continue;
    result.set(bioguideId, {
      alignmentRate: data.withParty / data.votesAnalyzed,
      votesAnalyzed: data.votesAnalyzed,
      name: data.name,
    });
  }
  return result;
}

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze real party-line alignment for the given representative.
 *
 * Returns null when the rep cannot be analyzed (not a D/R member, no votes
 * available, or insufficient sample size).
 */
export async function analyzePartyLineAlignment(
  bioguideId: string
): Promise<PartyLineInsight | null> {
  const cacheKey = `insight:party_line:${bioguideId}`;

  try {
    const cached = await getRedisCache().get<PartyLineInsight>(cacheKey);
    if (cached) {
      logger.info('[PartyLine] Cache hit', { bioguideId });
      return cached;
    }
  } catch {
    // Cache miss — continue
  }

  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    logger.info('[PartyLine] Representative not found', { bioguideId });
    return null;
  }

  const party = normalizePartyLabel(rep.party);
  if (!party) {
    logger.info('[PartyLine] Rep is not Democratic or Republican — skipping', {
      bioguideId,
      party: rep.party,
    });
    return null;
  }

  const chamber = rep.chamber;
  const rollCalls =
    chamber === 'House'
      ? await batchVotingService.getHouseChamberRollCalls(119, undefined, DEFAULT_ROLL_CALL_LIMIT)
      : await batchVotingService.getSenateChamberRollCalls(119, undefined, DEFAULT_ROLL_CALL_LIMIT);

  if (rollCalls.length === 0) {
    logger.warn('[PartyLine] No roll calls available', { bioguideId, chamber });
    return null;
  }

  const chamberAlignment = computeChamberAlignment(rollCalls, party);
  const target = chamberAlignment.get(bioguideId.toUpperCase()) ?? chamberAlignment.get(bioguideId);

  if (!target || target.votesAnalyzed < MIN_VOTES_FOR_ALIGNMENT) {
    logger.info('[PartyLine] Insufficient sample size', {
      bioguideId,
      votesAnalyzed: target?.votesAnalyzed ?? 0,
      minimum: MIN_VOTES_FOR_ALIGNMENT,
    });
    return null;
  }

  // Real peer average: every OTHER member of the same chamber/party who
  // participated in the same roll calls and passed the sample-size floor.
  const peerRates: number[] = [];
  for (const [peerId, peerData] of chamberAlignment) {
    if (peerId.toUpperCase() === bioguideId.toUpperCase()) continue;
    if (peerData.votesAnalyzed < MIN_VOTES_FOR_ALIGNMENT) continue;
    peerRates.push(peerData.alignmentRate);
  }
  const peerAverageAlignment =
    peerRates.length > 0
      ? peerRates.reduce((sum, r) => sum + r, 0) / peerRates.length
      : target.alignmentRate;

  const conf = confidenceScore({
    sampleSize: target.votesAnalyzed,
    minimumSampleSize: MIN_VOTES_FOR_ALIGNMENT,
    dataCompleteness: Math.min(target.votesAnalyzed / DEFAULT_ROLL_CALL_LIMIT, 1),
    peerCount: peerRates.length,
  });

  const freshestDate = rollCalls
    .map(r => new Date(r.date).getTime())
    .filter(t => !isNaN(t))
    .reduce((a, b) => Math.max(a, b), 0);

  const insight: PartyLineInsight = {
    bioguideId: bioguideId.toUpperCase(),
    name: target.name || rep.name,
    party,
    chamber,
    alignmentRate: target.alignmentRate,
    votesAnalyzed: target.votesAnalyzed,
    votesWithParty: Math.round(target.alignmentRate * target.votesAnalyzed),
    votesAgainstParty:
      target.votesAnalyzed - Math.round(target.alignmentRate * target.votesAnalyzed),
    peerAverageAlignment,
    peerCount: peerRates.length,
    confidence: conf,
    dataAsOf: freshestDate > 0 ? new Date(freshestDate).toISOString() : new Date().toISOString(),
    methodology:
      'For each recent roll call, the party majority position is derived from how same-party ' +
      'members actually voted (Yea/Nay only; Present/Not Voting excluded). The representative ' +
      'is marked as voting with their party on that roll call when their position matches that ' +
      'derived majority. Peer averages are computed from every other same-chamber, same-party ' +
      'member who voted in the same set of roll calls. No hardcoded averages.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
  };

  try {
    await getRedisCache().set(cacheKey, insight, CACHE_TTL);
  } catch (error) {
    logger.warn('[PartyLine] Cache write failed', {
      bioguideId,
      error: (error as Error).message,
    });
  }

  return insight;
}

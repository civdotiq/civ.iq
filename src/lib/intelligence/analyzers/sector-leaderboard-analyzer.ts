/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Sector Leaderboard Analyzer
 *
 * Lists each House member's yes-vote rate on bills classified to an industry
 * sector, with the chamber average as the baseline. Reads cached vote-finance
 * insights, enriches with member data, and returns every included member in a
 * neutral order (state, then name).
 *
 * No dollar figures: the only per-member sector money in the insight is a
 * 250-contribution sample, which must not be shown or summed as a total. No
 * rank: rates sit within a few points of each other (SD ~0.05), so a ranking
 * would mostly order noise.
 *
 * House only: vote-finance insights are not computed for senators (Senate
 * roll-call XML is blocked upstream for cloud IPs).
 *
 * Flow: check cache → read current members' vote-finance insights → filter → enrich → order → cache → return
 * Pattern: vote-finance-analyzer.ts
 */

import { mean, median, sampleStandardDeviation } from 'simple-statistics';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { voteFinanceCacheKey } from '@/lib/intelligence/insight-cache-keys';
import {
  getAllEnhancedRepresentatives,
  getEnhancedRepresentative,
} from '@/features/representatives/services/congress.service';
import type {
  VoteFinanceInsight,
  SectorLeaderboardEntry,
  SectorLeaderboardResponse,
} from '../types';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { trackInsightCacheHit, withInsightTracking } from './shared';

/** Redis cache TTL: 24 hours */
const CACHE_TTL = 24 * 60 * 60;

/**
 * TTL while fewer than MINIMUM_REQUIRED members have cached insights (after a
 * vote-finance key bump the cron refills them over ~13h), so a sparse table
 * isn't held for a full day.
 */
const PARTIAL_CACHE_TTL = 60 * 60;

/** Concurrency limit for member enrichment calls */
const ENRICHMENT_CONCURRENCY = 5;

/** Keys per MGET; Upstash REST puts them in the URL path, so keep it short. */
const MGET_CHUNK_SIZE = 100;

/** Shown with every response so the scope travels with the numbers. */
export const SECTOR_VOTE_RATE_COVERAGE_NOTE =
  'House members only. Rate = yea votes / (yea + nay votes) on recent House roll calls on bills ' +
  'classified to this sector; members with fewer than 10 such votes are excluded. ' +
  'Vote-finance data is not computed for senators.';

// ── Main Export ──────────────────────────────────────────────────────

/**
 * Build the per-member sector vote-rate table. Returns null if no data is
 * available. `limit` is an optional cap kept for older callers; by default
 * every included member is returned.
 */
export async function buildSectorLeaderboard(
  sector: IndustrySector,
  options?: { chamber?: 'house' | 'senate'; party?: string; limit?: number }
): Promise<SectorLeaderboardResponse | null> {
  const chamber = options?.chamber ?? 'all';
  const party = options?.party ?? 'all';
  const limit =
    options?.limit !== undefined && Number.isFinite(options.limit)
      ? Math.max(Math.floor(options.limit), 1)
      : undefined;
  // Cache key omits limit: the full list is cached once and capped on read.
  // v4: built from vote_finance:v5 (v3 used double-counted vote totals).
  const cacheKey = `leaderboard:v4:${sector}:${chamber}:${party}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<SectorLeaderboardResponse>(cacheKey);
    if (cached) {
      logger.info('[SectorLeaderboard] Cache hit', { sector, chamber, party });
      trackInsightCacheHit('sector-leaderboard');
      return { ...cached, entries: cached.entries.slice(0, limit) };
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2-8. Scan, filter, enrich, rank, cache — tracked
  return withInsightTracking('sector-leaderboard', () =>
    computeLeaderboard(sector, chamber as 'house' | 'senate' | 'all', party, limit, cacheKey)
  );
}

async function computeLeaderboard(
  sector: IndustrySector,
  chamber: 'house' | 'senate' | 'all',
  party: string,
  limit: number | undefined,
  cacheKey: string
): Promise<SectorLeaderboardResponse | null> {
  // 2. Read cached vote-finance insights
  const insights = await loadVoteFinanceInsights();
  if (insights.length === 0) {
    logger.warn(
      '[SectorLeaderboard] No cached insights found — leaderboard unavailable until representative pages warm the cache'
    );
    return null;
  }

  // 3. Extract sector-specific data from each insight
  let excludedCount = 0;
  const candidates: Candidate[] = [];

  for (const insight of insights) {
    const sectorCorrelation = insight.correlations.find(c => c.sector === sector);
    if (!sectorCorrelation) continue;

    if (!sectorCorrelation.meetsSampleSize) {
      excludedCount++;
      continue;
    }

    candidates.push({
      bioguideId: insight.bioguideId,
      sectorAlignmentScore: sectorCorrelation.alignmentScore,
      billsVotedOn: sectorCorrelation.billsVotedOn,
    });
  }

  const insightCount = insights.length;
  const MINIMUM_REQUIRED = 50;

  if (candidates.length === 0) {
    logger.info('[SectorLeaderboard] No candidates with sufficient data', { sector });
    return null;
  }

  // 4. Enrich with member data (batched concurrency)
  const enriched = await enrichCandidates(candidates);

  // 5. Apply filters (House only — see header)
  const filtered = enriched.filter(entry => {
    if (entry.chamber !== 'House') return false;
    if (chamber !== 'all' && entry.chamber.toLowerCase() !== chamber) return false;
    // Roster parties are full words ("Republican"); the filter is a code ("R").
    if (party !== 'all' && entry.party.charAt(0).toUpperCase() !== party) return false;
    return true;
  });

  if (filtered.length === 0) {
    logger.info('[SectorLeaderboard] All entries filtered out', { sector, chamber, party });
    return null;
  }

  // 6. Compute stats
  const scores = filtered.map(e => e.sectorAlignmentScore);
  const stats = {
    mean: mean(scores),
    median: median(scores),
    standardDeviation: scores.length >= 2 ? sampleStandardDeviation(scores) : 0,
    includedMembers: filtered.length,
    excludedMembers: excludedCount,
  };

  // 7. Neutral order (state, then name) — no ranking by score.
  filtered.sort((a, b) => a.state.localeCompare(b.state) || a.name.localeCompare(b.name));

  const entries: SectorLeaderboardEntry[] = filtered.map(entry => ({
    bioguideId: entry.bioguideId,
    name: entry.name,
    party: entry.party,
    state: entry.state,
    chamber: entry.chamber,
    sectorAlignmentScore: entry.sectorAlignmentScore,
    billsVotedOn: entry.billsVotedOn,
  }));

  // Find the earliest dataAsOf from the insights we used
  const firstInsight = insights[0];
  const dataAsOf = firstInsight
    ? insights.reduce((earliest, insight) => {
        return insight.dataAsOf < earliest ? insight.dataAsOf : earliest;
      }, firstInsight.dataAsOf)
    : new Date().toISOString();

  const dataAvailability: SectorLeaderboardResponse['dataAvailability'] = {
    cachedInsights: insightCount,
    minimumRequired: MINIMUM_REQUIRED,
    status:
      insightCount === 0 ? 'empty' : insightCount < MINIMUM_REQUIRED ? 'partial' : 'sufficient',
  };

  const response: SectorLeaderboardResponse = {
    sector,
    sectorLabel: sector as string,
    chamber,
    party: party === 'all' ? null : party,
    coverageNote: SECTOR_VOTE_RATE_COVERAGE_NOTE,
    entries,
    stats,
    dataAvailability,
    generatedAt: new Date().toISOString(),
    dataAsOf,
  };

  // 8. Cache the full list, return the requested slice
  await cacheResponse(cacheKey, response);

  return { ...response, entries: response.entries.slice(0, limit) };
}

// ── Data Loading ─────────────────────────────────────────────────────

/**
 * Reads each current member's cached insight by its exact key. A KEYS pattern
 * match is disabled in prod (it silently returns []), a SCAN would walk the
 * whole keyspace on every cold build, and either would also pick up departed
 * members and stale key versions.
 */
async function loadVoteFinanceInsights(): Promise<VoteFinanceInsight[]> {
  try {
    const roster = await getAllEnhancedRepresentatives();
    const keys = roster.map(rep => voteFinanceCacheKey(rep.bioguideId));

    const insights: VoteFinanceInsight[] = [];
    for (let i = 0; i < keys.length; i += MGET_CHUNK_SIZE) {
      const values = await getRedisCache().mget<VoteFinanceInsight>(
        keys.slice(i, i + MGET_CHUNK_SIZE)
      );
      insights.push(...values.filter((v): v is VoteFinanceInsight => v !== null));
    }
    return insights;
  } catch (error) {
    logger.warn('[SectorLeaderboard] Failed to load vote-finance insights', {
      error: (error as Error).message,
    });
    return [];
  }
}

// ── Member Enrichment ────────────────────────────────────────────────

interface Candidate {
  bioguideId: string;
  sectorAlignmentScore: number;
  billsVotedOn: number;
}

interface EnrichedCandidate extends Candidate {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
}

async function enrichCandidates(candidates: Candidate[]): Promise<EnrichedCandidate[]> {
  const results: EnrichedCandidate[] = [];

  // Process in batches of ENRICHMENT_CONCURRENCY
  for (let i = 0; i < candidates.length; i += ENRICHMENT_CONCURRENCY) {
    const batch = candidates.slice(i, i + ENRICHMENT_CONCURRENCY);
    const enriched = await Promise.all(
      batch.map(async candidate => {
        try {
          const rep = await getEnhancedRepresentative(candidate.bioguideId);
          if (!rep) return null;

          return {
            bioguideId: candidate.bioguideId,
            name: rep.name,
            party: rep.party,
            state: rep.state,
            chamber: rep.chamber,
            sectorAlignmentScore: candidate.sectorAlignmentScore,
            billsVotedOn: candidate.billsVotedOn,
          };
        } catch {
          return null;
        }
      })
    );

    for (const entry of enriched) {
      if (entry) results.push(entry);
    }
  }

  return results;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheResponse(key: string, response: SectorLeaderboardResponse): Promise<void> {
  try {
    const ttl = response.dataAvailability.status === 'sufficient' ? CACHE_TTL : PARTIAL_CACHE_TTL;
    await getRedisCache().set(key, response, ttl);
    logger.info('[SectorLeaderboard] Cached sector vote-rate table', {
      sector: response.sector,
      entries: response.entries.length,
      includedMembers: response.stats.includedMembers,
    });
  } catch {
    // Non-fatal
  }
}

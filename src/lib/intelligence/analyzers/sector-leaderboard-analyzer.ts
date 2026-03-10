/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Sector Leaderboard Analyzer
 *
 * Builds a leaderboard ranking legislators by their alignment with a specific
 * industry sector's money. Reads cached vote-finance insights, enriches with
 * member data, computes aggregate statistics, and returns a ranked list.
 *
 * Flow: check cache → scan vote-finance insights → filter → enrich → rank → cache → return
 * Pattern: vote-finance-analyzer.ts
 */

import { mean, median, sampleStandardDeviation } from 'simple-statistics';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import type {
  VoteFinanceInsight,
  SectorLeaderboardEntry,
  SectorLeaderboardResponse,
} from '../types';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

/** Redis cache TTL: 24 hours */
const CACHE_TTL = 24 * 60 * 60;

/** Default number of entries to return */
const DEFAULT_LIMIT = 20;

/** Maximum number of entries to return */
const MAX_LIMIT = 100;

/** Concurrency limit for member enrichment calls */
const ENRICHMENT_CONCURRENCY = 5;

// ── Main Export ──────────────────────────────────────────────────────

/**
 * Build a leaderboard ranking legislators by alignment with a specific
 * industry sector. Returns null if no data is available.
 */
export async function buildSectorLeaderboard(
  sector: IndustrySector,
  options?: { chamber?: 'house' | 'senate'; party?: string; limit?: number }
): Promise<SectorLeaderboardResponse | null> {
  const chamber = options?.chamber ?? 'all';
  const party = options?.party ?? 'all';
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cacheKey = `leaderboard:${sector}:${chamber}:${party}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<SectorLeaderboardResponse>(cacheKey);
    if (cached) {
      logger.info('[SectorLeaderboard] Cache hit', { sector, chamber, party });
      return cached;
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2. Scan cached vote-finance insights
  const insights = await loadVoteFinanceInsights();
  if (insights.length === 0) {
    logger.info('[SectorLeaderboard] No vote-finance insights found');
    return null;
  }

  // 3. Extract sector-specific data from each insight
  let excludedCount = 0;
  const candidates: Array<{
    bioguideId: string;
    sectorAlignmentScore: number;
    sectorDonationAmount: number;
    billsVotedOn: number;
  }> = [];

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
      sectorDonationAmount: sectorCorrelation.donationAmount,
      billsVotedOn: sectorCorrelation.billsVotedOn,
    });
  }

  if (candidates.length === 0) {
    logger.info('[SectorLeaderboard] No candidates with sufficient data', { sector });
    return null;
  }

  // 4. Enrich with member data (batched concurrency)
  const enriched = await enrichCandidates(candidates);

  // 5. Apply filters
  const filtered = enriched.filter(entry => {
    if (chamber !== 'all' && entry.chamber.toLowerCase() !== chamber) return false;
    if (party !== 'all' && entry.party !== party) return false;
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

  // 7. Sort, rank, and limit
  filtered.sort((a, b) => b.sectorAlignmentScore - a.sectorAlignmentScore);

  const entries: SectorLeaderboardEntry[] = filtered.slice(0, limit).map((entry, index) => ({
    bioguideId: entry.bioguideId,
    name: entry.name,
    party: entry.party,
    state: entry.state,
    chamber: entry.chamber,
    sectorAlignmentScore: entry.sectorAlignmentScore,
    sectorDonationAmount: entry.sectorDonationAmount,
    billsVotedOn: entry.billsVotedOn,
    rank: index + 1,
  }));

  // Find the earliest dataAsOf from the insights we used
  const firstInsight = insights[0];
  const dataAsOf = firstInsight
    ? insights.reduce((earliest, insight) => {
        return insight.dataAsOf < earliest ? insight.dataAsOf : earliest;
      }, firstInsight.dataAsOf)
    : new Date().toISOString();

  const response: SectorLeaderboardResponse = {
    sector,
    sectorLabel: sector as string,
    chamber,
    party: party === 'all' ? null : party,
    entries,
    stats,
    generatedAt: new Date().toISOString(),
    dataAsOf,
  };

  // 8. Cache
  await cacheResponse(cacheKey, response);

  return response;
}

// ── Data Loading ─────────────────────────────────────────────────────

async function loadVoteFinanceInsights(): Promise<VoteFinanceInsight[]> {
  try {
    const keys = await getRedisCache().keys('insight:vote_finance:*');
    if (keys.length === 0) return [];

    const values = await getRedisCache().mget<VoteFinanceInsight>(keys);
    return values.filter((v): v is VoteFinanceInsight => v !== null);
  } catch (error) {
    logger.warn('[SectorLeaderboard] Failed to load vote-finance insights', {
      error: (error as Error).message,
    });
    return [];
  }
}

// ── Member Enrichment ────────────────────────────────────────────────

interface EnrichedCandidate {
  bioguideId: string;
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  sectorAlignmentScore: number;
  sectorDonationAmount: number;
  billsVotedOn: number;
}

async function enrichCandidates(
  candidates: Array<{
    bioguideId: string;
    sectorAlignmentScore: number;
    sectorDonationAmount: number;
    billsVotedOn: number;
  }>
): Promise<EnrichedCandidate[]> {
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
            sectorDonationAmount: candidate.sectorDonationAmount,
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
    await getRedisCache().set(key, response, CACHE_TTL);
    logger.info('[SectorLeaderboard] Cached leaderboard', {
      sector: response.sector,
      entries: response.entries.length,
      includedMembers: response.stats.includedMembers,
    });
  } catch {
    // Non-fatal
  }
}

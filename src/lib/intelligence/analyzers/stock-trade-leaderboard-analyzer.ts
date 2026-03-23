/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Stock Trade Leaderboard Analyzer
 *
 * Builds a leaderboard ranking members of Congress by stock trading activity.
 * Aggregates from cached trade data: Senate bulk dataset + House per-member caches.
 *
 * Supports ranking by: trade count, estimated value, or late filing count.
 * Supports filtering by chamber (house/senate) and party (D/R/I).
 *
 * Flow: check cache → load Senate bulk + scan House caches → aggregate → rank → cache → return
 * Pattern: sector-leaderboard-analyzer.ts
 */

import { mean, median } from 'simple-statistics';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { senateDisclosureService } from '@/lib/data-sources/senate-disclosure-service';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import type { StockTrade } from '@/types/stock-trades';
import type { StockTradeLeaderboardEntry, StockTradeLeaderboardResponse } from '../types';

/** Redis cache TTL: 24 hours */
const CACHE_TTL = 24 * 60 * 60;

/** Default number of entries to return */
const DEFAULT_LIMIT = 25;

/** Maximum number of entries to return */
const MAX_LIMIT = 100;

/** Concurrency limit for member enrichment calls */
const ENRICHMENT_CONCURRENCY = 5;

/** Minimum members with data to consider the leaderboard "sufficient" */
const MINIMUM_REQUIRED = 20;

/** Midpoints for House Clerk amount ranges (same as StockTradeSummary) */
const AMOUNT_MIDPOINTS: Record<string, number> = {
  '$1,001 - $15,000': 8000,
  '$15,001 - $50,000': 32500,
  '$50,001 - $100,000': 75000,
  '$100,001 - $250,000': 175000,
  '$250,001 - $500,000': 375000,
  '$500,001 - $1,000,000': 750000,
  '$1,000,001 - $5,000,000': 3000000,
  '$5,000,001 - $25,000,000': 15000000,
  '$25,000,001 - $50,000,000': 37500000,
  '$50,000,001 - ': 50000000,
  '$0 - $0': 0,
};

// ── Types ────────────────────────────────────────────────────────────

type SortField = 'trades' | 'value' | 'late';

interface MemberTradeStats {
  bioguideId: string;
  tradeCount: number;
  estimatedValue: number;
  lateFilingCount: number;
  topTickers: string[];
}

// ── Main Export ──────────────────────────────────────────────────────

/**
 * Build a leaderboard ranking members of Congress by stock trading activity.
 * Returns null if no data is available.
 */
export async function buildStockTradeLeaderboard(options?: {
  chamber?: 'house' | 'senate';
  party?: string;
  sortBy?: SortField;
  limit?: number;
}): Promise<StockTradeLeaderboardResponse | null> {
  const chamber = options?.chamber ?? 'all';
  const party = options?.party ?? 'all';
  const sortBy = options?.sortBy ?? 'trades';
  const limit = Math.min(Math.max(options?.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT);
  const cacheKey = `leaderboard:stock-trades:${chamber}:${party}:${sortBy}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<StockTradeLeaderboardResponse>(cacheKey);
    if (cached) {
      logger.info('[StockTradeLeaderboard] Cache hit', { chamber, party, sortBy });
      return cached;
    }
  } catch {
    // Cache miss or error — continue
  }

  // 2. Load trade data from both chambers
  const memberStats = await loadAllMemberStats();

  if (memberStats.length === 0) {
    logger.warn('[StockTradeLeaderboard] No trade data available');
    return null;
  }

  // 3. Enrich with member data (name, party, state, chamber)
  const enriched = await enrichCandidates(memberStats);

  // 4. Apply filters
  const filtered = enriched.filter(entry => {
    if (chamber !== 'all' && entry.chamber.toLowerCase() !== chamber) return false;
    if (party !== 'all' && entry.party !== party) return false;
    return true;
  });

  if (filtered.length === 0) {
    logger.info('[StockTradeLeaderboard] All entries filtered out', { chamber, party });
    return null;
  }

  // 5. Sort by requested field
  filtered.sort((a, b) => {
    switch (sortBy) {
      case 'value':
        return b.estimatedValue - a.estimatedValue;
      case 'late':
        return b.lateFilingCount - a.lateFilingCount;
      case 'trades':
      default:
        return b.tradeCount - a.tradeCount;
    }
  });

  // 6. Compute stats
  const tradeCounts = filtered.map(e => e.tradeCount);
  const values = filtered.map(e => e.estimatedValue);
  const stats = {
    meanTrades: mean(tradeCounts),
    medianTrades: median(tradeCounts),
    meanValue: mean(values),
    totalMembers: filtered.length,
  };

  // 7. Rank and limit
  const entries: StockTradeLeaderboardEntry[] = filtered.slice(0, limit).map((entry, index) => ({
    bioguideId: entry.bioguideId,
    name: entry.name,
    party: entry.party,
    state: entry.state,
    chamber: entry.chamber,
    tradeCount: entry.tradeCount,
    estimatedValue: entry.estimatedValue,
    lateFilingCount: entry.lateFilingCount,
    topTickers: entry.topTickers,
    rank: index + 1,
  }));

  const dataAvailability: StockTradeLeaderboardResponse['dataAvailability'] = {
    membersWithData: memberStats.length,
    minimumRequired: MINIMUM_REQUIRED,
    status:
      memberStats.length === 0
        ? 'empty'
        : memberStats.length < MINIMUM_REQUIRED
          ? 'partial'
          : 'sufficient',
  };

  const response: StockTradeLeaderboardResponse = {
    chamber,
    party: party === 'all' ? null : party,
    sortBy,
    entries,
    stats,
    dataAvailability,
    generatedAt: new Date().toISOString(),
  };

  // 8. Cache
  await cacheResponse(cacheKey, response);

  return response;
}

// ── Data Loading ─────────────────────────────────────────────────────

/**
 * Load trade stats for all members from both Senate (bulk) and House (cached).
 */
async function loadAllMemberStats(): Promise<MemberTradeStats[]> {
  const stats: MemberTradeStats[] = [];

  // Load Senate trades from bulk dataset (single cached API call)
  try {
    const senateTradesMap = await senateDisclosureService.getAllSenatorTrades();
    for (const [bioguideId, trades] of senateTradesMap) {
      const memberStat = computeStats(bioguideId, trades);
      if (memberStat.tradeCount > 0) {
        stats.push(memberStat);
      }
    }
    logger.info('[StockTradeLeaderboard] Loaded Senate data', {
      senatorsWithTrades: senateTradesMap.size,
    });
  } catch (error) {
    logger.warn('[StockTradeLeaderboard] Failed to load Senate data', {
      error: (error as Error).message,
    });
  }

  // Load House trades from Redis cache
  try {
    const houseKeys = await getRedisCache().keys('stock-trades:*');
    if (houseKeys.length > 0) {
      const values = await getRedisCache().mget<StockTrade[]>(houseKeys);

      for (let i = 0; i < houseKeys.length; i++) {
        const trades = values[i];
        if (!trades || !Array.isArray(trades) || trades.length === 0) continue;

        // Extract bioguideId from the cache key
        const bioguideId = houseKeys[i]!.replace('stock-trades:', '');
        // Skip if we already have this member from Senate
        if (stats.some(s => s.bioguideId === bioguideId)) continue;

        const memberStat = computeStats(bioguideId, trades);
        if (memberStat.tradeCount > 0) {
          stats.push(memberStat);
        }
      }

      logger.info('[StockTradeLeaderboard] Loaded House cached data', {
        cachedMembers: houseKeys.length,
      });
    }
  } catch (error) {
    logger.warn('[StockTradeLeaderboard] Failed to load House cached data', {
      error: (error as Error).message,
    });
  }

  return stats;
}

/**
 * Compute aggregate stats from a member's trade list.
 */
function computeStats(bioguideId: string, trades: StockTrade[]): MemberTradeStats {
  const activeTrades = trades.filter(t => !t.isPaperFiling);

  const estimatedValue = activeTrades.reduce(
    (sum, t) => sum + (AMOUNT_MIDPOINTS[t.amount] ?? 0),
    0
  );

  const lateFilingCount = activeTrades.filter(t => t.isLateFiling).length;

  // Compute top tickers
  const tickerCounts = new Map<string, number>();
  for (const t of activeTrades) {
    if (t.ticker) {
      tickerCounts.set(t.ticker, (tickerCounts.get(t.ticker) ?? 0) + 1);
    }
  }
  const topTickers = [...tickerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([ticker]) => ticker);

  return {
    bioguideId,
    tradeCount: activeTrades.length,
    estimatedValue,
    lateFilingCount,
    topTickers,
  };
}

// ── Member Enrichment ────────────────────────────────────────────────

interface EnrichedEntry extends MemberTradeStats {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
}

async function enrichCandidates(candidates: MemberTradeStats[]): Promise<EnrichedEntry[]> {
  const results: EnrichedEntry[] = [];

  for (let i = 0; i < candidates.length; i += ENRICHMENT_CONCURRENCY) {
    const batch = candidates.slice(i, i + ENRICHMENT_CONCURRENCY);
    const enriched = await Promise.all(
      batch.map(async candidate => {
        try {
          const rep = await getEnhancedRepresentative(candidate.bioguideId);
          if (!rep) return null;

          return {
            ...candidate,
            name: rep.name,
            party: rep.party,
            state: rep.state,
            chamber: rep.chamber,
          } as EnrichedEntry;
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

async function cacheResponse(key: string, response: StockTradeLeaderboardResponse): Promise<void> {
  try {
    await getRedisCache().set(key, response, CACHE_TTL);
    logger.info('[StockTradeLeaderboard] Cached leaderboard', {
      entries: response.entries.length,
      totalMembers: response.stats.totalMembers,
    });
  } catch {
    // Non-fatal
  }
}

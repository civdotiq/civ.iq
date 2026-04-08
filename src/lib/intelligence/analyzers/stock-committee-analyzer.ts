/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Stock Trade-Committee Jurisdiction Analyzer (Insight 6, Gap B1)
 *
 * Identifies stock trades in industries that a legislator's committee
 * oversees. Answers: "Did this legislator trade stocks in sectors
 * their committee regulates?"
 *
 * Supports both House (via House Clerk) and Senate (via Senate Stock Watcher) members.
 *
 * Flow: check cache -> fetch data -> compute statistics -> AI narrative -> cache -> fallback
 * Pattern: CivicAlignmentAnalyzer (src/features/legislation/services/ai/civic-alignment-analyzer.ts)
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { houseDisclosureService } from '@/lib/data-sources/house-disclosure-service';
import { senateDisclosureService } from '@/lib/data-sources/senate-disclosure-service';
import { resolveTickerIndustries } from '@/lib/intelligence/entity-resolution/ticker-industry-resolver';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { getTopicsForCommittee } from '@/lib/connections/committee-agency-map';
import { getJurisdictionSectorsForTopics } from '@/lib/connections/policy-area-map';
import {
  peerComparison,
  confidenceScore,
  MIN_TRADES_STOCK,
  MIN_PEERS,
} from '../statistics/civic-stats';
import type {
  StockCommitteeInsight,
  FlaggedTrade,
  CommitteeTradeOverlap,
  SectorTradeCount,
  PeerComparison,
} from '../types';
import type { TickerResolution } from '../types';
import {
  findCommitteeMapping,
  freshestDate,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
  classifySignal,
  SourceCollector,
} from './shared';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Total number of IndustrySector enum values */
const TOTAL_SECTOR_COUNT = Object.keys(IndustrySector).length;

/** Standard disclaimer */
const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'Stock trades are legal and do not indicate wrongdoing. ' +
  'Committee assignments are determined by party leadership. ' +
  'Some overlap between trades and committee jurisdiction is expected by chance. ' +
  'Correlation does not indicate causation or insider knowledge.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze stock trade-committee jurisdiction overlap for a legislator.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * On any failure, returns a statistical fallback without AI narrative.
 */
export async function analyzeStockCommittee(
  bioguideId: string
): Promise<StockCommitteeInsight | null> {
  const cacheKey = `insight:stock_committee:${bioguideId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<StockCommitteeInsight>(cacheKey);
    if (cached) {
      logger.info('[StockCommittee] Cache hit', { bioguideId });
      trackInsightCacheHit('stock-committee');
      return cached;
    }
  } catch {
    // Cache miss or error -- continue
  }

  // 2-6. Fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('stock-committee', () =>
    withTimeout(computeAndCache(bioguideId, cacheKey), ANALYZER_TIMEOUT_MS, 'StockCommittee')
  );
}

async function computeAndCache(
  bioguideId: string,
  cacheKey: string
): Promise<StockCommitteeInsight | null> {
  // 2. Fetch and validate data
  const data = await fetchData(bioguideId);
  if (!data) {
    return null;
  }

  // 3. Compute statistics
  const stats = computeStatistics(data);

  // 4. Peer comparison
  const peer = await computePeerComparison(bioguideId, stats.overlapRate, data);

  // 4b. Recompute confidence with actual peer count
  if (peer) {
    const dataCompleteness = data.resolvedTrades.length / Math.max(data.totalTrades, 1);
    const baseConf = confidenceScore({
      sampleSize: data.resolvedTrades.length,
      minimumSampleSize: MIN_TRADES_STOCK,
      dataCompleteness,
      peerCount: peer.peerCount,
    });
    const overlapRatio =
      stats.expectedOverlapRate > 0 ? stats.overlapRate / stats.expectedOverlapRate : 1;
    const signalStrength = Math.min(Math.abs(overlapRatio - 1) * 2, 1);
    stats.confidence = Math.round(baseConf * (0.5 + signalStrength * 0.5) * 100) / 100;
  }

  // 5. Generate insight
  const { narrative, source } = await generateNarrative(data, stats, peer);

  const sc = new SourceCollector();
  sc.add(
    data.chamber === 'Senate' ? 'Senate Stock Watcher' : 'House Clerk disclosures',
    '119th Congress',
    data.totalTrades
  );
  sc.add('SEC EDGAR SIC codes', 'Current');
  sc.add('Congress.gov committees', '119th Congress');

  const insight: StockCommitteeInsight = {
    bioguideId,
    totalTrades: data.totalTrades,
    totalResolvableTrades: data.resolvedTrades.length,
    flaggedTradeCount: stats.flaggedTrades.length,
    overlapRate: stats.overlapRate,
    expectedOverlapRate: stats.expectedOverlapRate,
    committees: stats.committees,
    flaggedTrades: stats.flaggedTrades,
    tradesBySector: stats.tradesBySector,
    peerComparison: peer ?? {
      value: stats.overlapRate,
      peerAverage: stats.overlapRate,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence:
      source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    confidenceMethod: 'computed',
    dataAsOf: freshestDate(...data.resolvedTrades.map(t => t.transactionDate))!,
    methodology:
      `Stock trades from STOCK Act disclosures ` +
      `(${data.chamber === 'Senate' ? 'Senate Stock Watcher' : 'House Clerk'}) ` +
      'matched to committee jurisdiction sectors. ' +
      'Tickers resolved to sectors via SEC EDGAR SIC codes. ' +
      'Expected overlap rate = jurisdiction sectors / 13 total sectors.',
    disclaimer: DISCLAIMER,
    signal: classifySignal({
      value: stats.overlapRate,
      peerAverage: peer?.peerAverage ?? stats.expectedOverlapRate,
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
  await cacheOverlapRate(bioguideId, stats.overlapRate, data);

  return insight;
}

// ── Data Fetching ────────────────────────────────────────────────────

interface ResolvedTrade {
  ticker: string;
  assetDescription: string;
  transactionType: string;
  transactionDate: string;
  amount: string;
  owner: string;
  sourceUrl: string;
  resolution: TickerResolution;
}

interface CommitteeJurisdiction {
  name: string;
  code: string;
  sectors: IndustrySector[];
}

interface FetchedData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  totalTrades: number;
  resolvedTrades: ResolvedTrade[];
  committees: CommitteeJurisdiction[];
  /** Map: IndustrySector -> committee names that have jurisdiction */
  sectorToCommittees: Map<IndustrySector, string[]>;
}

async function fetchData(bioguideId: string): Promise<FetchedData | null> {
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep) {
    logger.info('[StockCommittee] Representative not found', { bioguideId });
    return null;
  }

  if (!rep.committees?.length) {
    logger.info('[StockCommittee] No committee data', { bioguideId });
    return null;
  }

  const chamber = rep.chamber === 'Senate' ? ('Senate' as const) : ('House' as const);

  // Fetch stock trades from the appropriate service
  let allTrades;
  try {
    allTrades =
      chamber === 'Senate'
        ? await senateDisclosureService.getTradesForMember(bioguideId)
        : await houseDisclosureService.getTradesForMember(bioguideId);
  } catch {
    logger.warn('[StockCommittee] Trade fetch failed', { bioguideId, chamber });
    return null;
  }

  // Filter to trades with tickers
  const tradesWithTickers = allTrades.filter(t => t.ticker);
  if (tradesWithTickers.length < MIN_TRADES_STOCK) {
    logger.info('[StockCommittee] Too few trades with tickers', {
      bioguideId,
      count: tradesWithTickers.length,
    });
    return null;
  }

  // Resolve tickers to sectors (batch)
  const tickerList = tradesWithTickers.map(t => t.ticker ?? '');
  const resolutionMap = await resolveTickerIndustries(tickerList);

  const resolvedTrades: ResolvedTrade[] = [];
  for (const trade of tradesWithTickers) {
    const ticker = trade.ticker ?? '';
    const resolution = resolutionMap.get(ticker.toUpperCase().trim());
    if (resolution) {
      resolvedTrades.push({
        ticker,
        assetDescription: trade.assetDescription,
        transactionType: trade.transactionType,
        transactionDate: trade.transactionDate,
        amount: trade.amount,
        owner: trade.owner,
        sourceUrl: trade.sourceUrl,
        resolution,
      });
    }
  }

  if (resolvedTrades.length < MIN_TRADES_STOCK) {
    logger.info('[StockCommittee] Too few resolvable trades', {
      bioguideId,
      resolved: resolvedTrades.length,
    });
    return null;
  }

  // Build committee jurisdiction map
  const committees: CommitteeJurisdiction[] = [];
  const sectorToCommittees = new Map<IndustrySector, string[]>();

  for (const c of rep.committees) {
    const topics = getTopicsForCommittee(c.name);
    const sectors = getJurisdictionSectorsForTopics(topics);

    // Find committee code via fuzzy match
    const mapping = findCommitteeMapping(c.name);

    if (sectors.length > 0) {
      committees.push({
        name: c.name,
        code: mapping?.committeeCode ?? c.name,
        sectors,
      });

      for (const sector of sectors) {
        const existing = sectorToCommittees.get(sector) ?? [];
        existing.push(c.name);
        sectorToCommittees.set(sector, existing);
      }
    }
  }

  if (committees.length === 0) {
    logger.info('[StockCommittee] No committees with known jurisdiction sectors', { bioguideId });
    return null;
  }

  return {
    name: rep.name,
    party: rep.party,
    state: rep.state,
    chamber,
    totalTrades: allTrades.length,
    resolvedTrades,
    committees,
    sectorToCommittees,
  };
}

// ── Statistical Computation ──────────────────────────────────────────

interface ComputedStats {
  overlapRate: number;
  expectedOverlapRate: number;
  flaggedTrades: FlaggedTrade[];
  committees: CommitteeTradeOverlap[];
  tradesBySector: SectorTradeCount[];
  confidence: number;
}

function computeStatistics(data: FetchedData): ComputedStats {
  // Flag trades whose resolved sector is in the jurisdiction map
  const flaggedTrades: FlaggedTrade[] = [];
  const committeeTradeCountMap = new Map<string, { flagged: number; total: number }>();

  // Initialize committee counters
  for (const c of data.committees) {
    committeeTradeCountMap.set(c.name, { flagged: 0, total: 0 });
  }

  for (const trade of data.resolvedTrades) {
    const matchingCommittees = data.sectorToCommittees.get(trade.resolution.sector);

    if (matchingCommittees && matchingCommittees.length > 0) {
      flaggedTrades.push({
        ticker: trade.ticker,
        assetDescription: trade.assetDescription,
        transactionType: trade.transactionType,
        transactionDate: trade.transactionDate,
        amount: trade.amount,
        owner: trade.owner,
        sector: trade.resolution.sector,
        committeeName: matchingCommittees[0]!,
        sourceUrl: trade.sourceUrl,
      });

      // Increment flagged count for each matching committee
      for (const name of matchingCommittees) {
        const counts = committeeTradeCountMap.get(name);
        if (counts) {
          counts.flagged++;
        }
      }
    }

    // Count total resolvable trades per committee (for context)
    for (const c of data.committees) {
      if (c.sectors.includes(trade.resolution.sector)) {
        const counts = committeeTradeCountMap.get(c.name);
        if (counts) {
          counts.total++;
        }
      }
    }
  }

  // Build per-committee overlap
  const committees: CommitteeTradeOverlap[] = data.committees.map(c => {
    const counts = committeeTradeCountMap.get(c.name) ?? { flagged: 0, total: 0 };
    return {
      committeeName: c.name,
      committeeCode: c.code,
      jurisdictionSectors: c.sectors,
      flaggedTradeCount: counts.flagged,
      totalTradesInSectors: counts.total,
    };
  });

  // Overlap rate: flagged / resolvable
  const overlapRate =
    data.resolvedTrades.length > 0 ? flaggedTrades.length / data.resolvedTrades.length : 0;

  // Expected overlap rate: unique jurisdiction sectors / total sectors
  const uniqueJurisdictionSectors = new Set<IndustrySector>();
  for (const c of data.committees) {
    for (const sector of c.sectors) {
      uniqueJurisdictionSectors.add(sector);
    }
  }
  const expectedOverlapRate = uniqueJurisdictionSectors.size / TOTAL_SECTOR_COUNT;

  // Confidence: weighs sample size, data completeness, and actual vs expected ratio
  const overlapRatio = expectedOverlapRate > 0 ? overlapRate / expectedOverlapRate : 1;
  const dataCompleteness = data.resolvedTrades.length / Math.max(data.totalTrades, 1);

  const baseConfidence = confidenceScore({
    sampleSize: data.resolvedTrades.length,
    minimumSampleSize: MIN_TRADES_STOCK,
    dataCompleteness,
    peerCount: 0,
  });

  // If actual overlap is close to expected, reduce confidence (noise, not signal)
  const signalStrength = Math.min(Math.abs(overlapRatio - 1) * 2, 1);
  const confidence = Math.round(baseConfidence * (0.5 + signalStrength * 0.5) * 100) / 100;

  // Build full sector breakdown for visualization
  const sectorCounts = new Map<IndustrySector, number>();
  for (const trade of data.resolvedTrades) {
    const sector = trade.resolution.sector;
    sectorCounts.set(sector, (sectorCounts.get(sector) ?? 0) + 1);
  }

  const tradesBySector: SectorTradeCount[] = [...sectorCounts.entries()]
    .map(([sector, tradeCount]) => ({
      sector,
      tradeCount,
      overlapsCommittee: uniqueJurisdictionSectors.has(sector),
    }))
    .sort((a, b) => b.tradeCount - a.tradeCount);

  return {
    overlapRate,
    expectedOverlapRate,
    flaggedTrades,
    committees,
    tradesBySector,
    confidence,
  };
}

// ── Peer Comparison ──────────────────────────────────────────────────

async function cacheOverlapRate(
  bioguideId: string,
  overlapRate: number,
  data: FetchedData
): Promise<void> {
  const key = `stock-overlap:${data.chamber}:${data.state}:${bioguideId}`;
  try {
    await getRedisCache().set(key, overlapRate, CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

async function computePeerComparison(
  bioguideId: string,
  overlapRate: number,
  data: FetchedData
): Promise<PeerComparison | null> {
  const pattern = `stock-overlap:${data.chamber}:${data.state}:*`;

  try {
    const keys = await getRedisCache().keys(pattern);
    const peerKeys = keys.filter(k => !k.endsWith(`:${bioguideId}`));
    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) return null;

    return peerComparison(overlapRate, peerScores, `${data.state} ${data.chamber} delegation`);
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
    'stock trades and committee jurisdictions. ';

  const committeeLines = stats.committees
    .filter(c => c.flaggedTradeCount > 0)
    .map(
      c =>
        `- ${c.committeeName}: ${c.flaggedTradeCount} trade(s) in jurisdiction sectors [${c.jurisdictionSectors.join(', ')}]`
    )
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: This legislator's overlap rate is ${(stats.overlapRate * 100).toFixed(1)}%. ` +
      `The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}% ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : `No peer comparison available yet (insufficient data from other ${data.chamber} members in this state).`;

  const userPrompt = `LEGISLATOR: ${data.name} (${data.party}-${data.state}), ${data.chamber}

STOCK TRADES: ${data.totalTrades} total, ${data.resolvedTrades.length} with resolvable tickers, ${stats.flaggedTrades.length} in committee jurisdiction sectors.

OVERLAP RATE: ${(stats.overlapRate * 100).toFixed(1)}% of resolvable trades are in sectors their committees oversee.
EXPECTED OVERLAP RATE: ${(stats.expectedOverlapRate * 100).toFixed(1)}% (based on the fraction of sectors covered by their committees).

COMMITTEES WITH OVERLAPPING TRADES:
${committeeLines || 'None.'}

${peerLine}

Write a 2-3 sentence plain-language summary. State the overlap rate and how it compares to the expected rate. If peer comparison is available, note the comparison. Do not claim causation or insider knowledge. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const fallback = buildStatisticalSummary(data, stats, peer);

  return generateInsightNarrative(systemContext, userPrompt, fallback, '[StockCommittee]');
}

// ── Fallback ─────────────────────────────────────────────────────────

function buildStatisticalSummary(
  data: FetchedData,
  stats: ComputedStats,
  peer: PeerComparison | null
): string {
  const overlapPct = (stats.overlapRate * 100).toFixed(1);
  const expectedPct = (stats.expectedOverlapRate * 100).toFixed(1);

  let summary =
    `${overlapPct}% of ${data.name}'s resolvable stock trades are in sectors ` +
    `under their committee jurisdictions (expected by chance: ${expectedPct}%).`;

  const topCommittee = [...stats.committees].sort(
    (a, b) => b.flaggedTradeCount - a.flaggedTradeCount
  )[0];

  if (topCommittee && topCommittee.flaggedTradeCount > 0) {
    summary +=
      ` The ${topCommittee.committeeName} committee accounts for the most overlap ` +
      `(${topCommittee.flaggedTradeCount} trade${topCommittee.flaggedTradeCount !== 1 ? 's' : ''}).`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    summary += ` The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}%.`;
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: StockCommitteeInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[StockCommittee] Cached insight', {
      bioguideId: insight.bioguideId,
      confidence: insight.confidence,
      overlapRate: insight.overlapRate,
    });
  } catch {
    // Non-fatal
  }
}

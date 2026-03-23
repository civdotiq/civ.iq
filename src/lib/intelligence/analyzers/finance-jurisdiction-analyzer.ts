/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Finance-Jurisdiction Overlap Analyzer (Insight 1)
 *
 * Detects where a legislator's campaign donors' industry sectors overlap
 * with their committee jurisdictions. Answers: "This legislator sits on
 * committees that oversee industries funding their campaign."
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
import {
  ALL_COMMITTEE_MAPPINGS,
  type CommitteeMapping,
} from '@/lib/connections/committee-agency-map';
import { getJurisdictionSectorsForTopics } from '@/lib/connections/policy-area-map';
import { peerComparisonWithAnomalies, confidenceScore, MIN_PEERS } from '../statistics/civic-stats';
import {
  getCurrentElectionCycle,
  findCommitteeMapping,
  freshestDate,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
  trackInsightCacheHit,
  withInsightTracking,
} from './shared';
import type { FinanceJurisdictionInsight, PeerComparison } from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Standard disclaimer for all finance-jurisdiction insights */
const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'Campaign contributions are legal and do not indicate wrongdoing. ' +
  'Committee assignments are determined by party leadership, not by donors. ' +
  'Correlation does not indicate causation or improper behavior.';

// ── Main Analyzer ────────────────────────────────────────────────────

/**
 * Analyze finance-jurisdiction overlap for a legislator.
 *
 * Returns cached insight if fresh, otherwise computes from scratch.
 * On any failure, returns a statistical fallback without AI narrative.
 */
export async function analyzeFinanceJurisdiction(
  bioguideId: string
): Promise<FinanceJurisdictionInsight | null> {
  const cacheKey = `insight:finance_jurisdiction:${bioguideId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<FinanceJurisdictionInsight>(cacheKey);
    if (cached) {
      logger.info('[FinanceJurisdiction] Cache hit', { bioguideId });
      trackInsightCacheHit('finance-jurisdiction');
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-6. Fetch, compute, narrate, cache — all under timeout
  return withInsightTracking('finance-jurisdiction', () =>
    withTimeout(computeAndCache(bioguideId, cacheKey), ANALYZER_TIMEOUT_MS, 'FinanceJurisdiction')
  );
}

async function computeAndCache(
  bioguideId: string,
  cacheKey: string
): Promise<FinanceJurisdictionInsight | null> {
  // 2. Fetch data
  const data = await fetchData(bioguideId);
  if (!data) {
    return null;
  }

  // 3. Compute statistics
  const stats = computeStatistics(data);

  // 4. Peer comparison (from cached peer overlap scores) + anomaly detection
  // Convert IndustrySector keys to strings for the anomaly detector
  const sectorDonationsStr = new Map<string, number>();
  for (const [sector, amount] of data.sectorDonations) {
    sectorDonationsStr.set(sector as string, amount);
  }
  const peer = await computePeerComparison(
    bioguideId,
    stats.overlapScore,
    data.committeeCodes,
    sectorDonationsStr
  );

  // 4b. Recompute confidence with actual peer count
  if (peer) {
    stats.confidence = confidenceScore({
      sampleSize:
        Array.from(data.sectorDonations.values()).reduce((s, v) => s + v, 0) > 0
          ? data.sectorDonations.size
          : 0,
      minimumSampleSize: 3,
      dataCompleteness:
        data.committees.filter(c => c.mapping).length / Math.max(data.committees.length, 1),
      peerCount: peer.peerCount,
    });
  }

  // 5. Generate narrative
  const { narrative, source } = await generateNarrative(data, stats, peer);

  const insight: FinanceJurisdictionInsight = {
    bioguideId,
    overlapScore: stats.overlapScore,
    committees: stats.committees,
    peerComparison: peer ?? {
      value: stats.overlapScore,
      peerAverage: stats.overlapScore,
      peerCount: 0,
      peerGroupLabel: 'Insufficient peer data',
      percentileRank: 50,
    },
    narrative,
    confidence:
      source === 'statistical-fallback' ? Math.min(stats.confidence, 0.5) : stats.confidence,
    dataAsOf: freshestDate(data.freshestContributionDate),
    methodology:
      'Overlap between campaign donor industry sectors and committee jurisdiction topics. ' +
      'Sectors mapped via Congress.gov policy areas. Contributions from FEC individual filings.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 6. Cache
  await cacheInsight(cacheKey, insight);
  await cacheOverlapScore(
    bioguideId,
    stats.overlapScore,
    data.committeeCodes,
    data.sectorDonations
  );

  return insight;
}

// ── Data Fetching ────────────────────────────────────────────────────

interface FetchedData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  committees: Array<{
    name: string;
    mapping: CommitteeMapping | undefined;
    jurisdictionSectors: IndustrySector[];
  }>;
  committeeCodes: string[];
  sectorDonations: Map<IndustrySector, number>;
  totalDonations: number;
  freshestContributionDate?: string;
}

async function fetchData(bioguideId: string): Promise<FetchedData | null> {
  // Get representative data
  const rep = await getEnhancedRepresentative(bioguideId);
  if (!rep?.committees?.length) {
    logger.info('[FinanceJurisdiction] No committee data', { bioguideId });
    return null;
  }

  // Get FEC candidate ID
  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) {
    logger.info('[FinanceJurisdiction] No FEC mapping', { bioguideId });
    return null;
  }

  // Fetch contributions (sample for speed — full fetch is expensive)
  let contributions;
  try {
    contributions = await fecApiService.getSampleContributions(
      fecId,
      getCurrentElectionCycle(),
      500
    );
  } catch {
    logger.warn('[FinanceJurisdiction] FEC fetch failed', { bioguideId, fecId });
    return null;
  }

  if (!contributions.length) {
    logger.info('[FinanceJurisdiction] No contributions found', { bioguideId });
    return null;
  }

  // Track freshest contribution date before aggregation loses individual dates
  const freshestContributionDate =
    contributions.reduce<string>(
      (max, c) =>
        !max || (c.contribution_receipt_date && c.contribution_receipt_date > max)
          ? (c.contribution_receipt_date ?? max)
          : max,
      ''
    ) || undefined;

  // Aggregate contributions by sector
  const sectorAggregation = aggregateByIndustrySector(contributions);
  const sectorDonations = new Map<IndustrySector, number>();
  let totalDonations = 0;
  for (const entry of sectorAggregation) {
    sectorDonations.set(entry.sector, entry.totalAmount);
    totalDonations += entry.totalAmount;
  }

  // Map committees to jurisdiction sectors
  const committees = rep.committees.map(c => {
    const mapping = findCommitteeMapping(c.name);
    const topics = mapping?.topics ?? [];
    const jurisdictionSectors = getJurisdictionSectorsForTopics(topics);
    return { name: c.name, mapping, jurisdictionSectors };
  });

  const committeeCodes = committees
    .map(c => c.mapping?.committeeCode)
    .filter((code): code is string => Boolean(code));

  return {
    name: rep.name,
    party: rep.party,
    state: rep.state,
    chamber: rep.chamber,
    committees,
    committeeCodes,
    sectorDonations,
    totalDonations,
    freshestContributionDate,
  };
}

// ── Statistical Computation ──────────────────────────────────────────

interface ComputedStats {
  overlapScore: number;
  committees: FinanceJurisdictionInsight['committees'];
  confidence: number;
}

function computeStatistics(data: FetchedData): ComputedStats {
  const allJurisdictionSectors = new Set<IndustrySector>();

  const committees = data.committees.map(c => {
    let jurisdictionDonations = 0;
    for (const sector of c.jurisdictionSectors) {
      allJurisdictionSectors.add(sector);
      jurisdictionDonations += data.sectorDonations.get(sector) ?? 0;
    }

    const jurisdictionDonationPercentage =
      data.totalDonations > 0 ? (jurisdictionDonations / data.totalDonations) * 100 : 0;

    return {
      committeeCode: c.mapping?.committeeCode ?? c.name,
      committeeName: c.name,
      jurisdictionSectors: c.jurisdictionSectors,
      jurisdictionDonations,
      jurisdictionDonationPercentage,
    };
  });

  // Deduplicate: if multiple committees share the same jurisdiction sector,
  // count the donation only once toward the overall overlap score.
  let deduplicatedJurisdictionDonations = 0;
  for (const sector of allJurisdictionSectors) {
    deduplicatedJurisdictionDonations += data.sectorDonations.get(sector) ?? 0;
  }

  const overlapScore =
    data.totalDonations > 0 ? deduplicatedJurisdictionDonations / data.totalDonations : 0;

  const confidence = confidenceScore({
    sampleSize:
      Array.from(data.sectorDonations.values()).reduce((s, v) => s + v, 0) > 0
        ? data.sectorDonations.size
        : 0,
    minimumSampleSize: 3, // At least 3 sectors represented
    dataCompleteness:
      data.committees.filter(c => c.mapping).length / Math.max(data.committees.length, 1),
    peerCount: 0, // Updated after peer comparison
  });

  return { overlapScore, committees, confidence };
}

// ── Peer Comparison ──────────────────────────────────────────────────

/** Cache key for individual legislator overlap scores per committee */
function overlapScoreCacheKey(committeeCode: string, bioguideId: string): string {
  return `overlap-score:${committeeCode}:${bioguideId}`;
}

/** Cache key for per-sector donation amounts for a legislator. */
function sectorDonationsCacheKey(bioguideId: string): string {
  return `sector-donations:${bioguideId}`;
}

/**
 * Store this legislator's overlap score and per-sector donations for
 * future peer comparisons and anomaly detection.
 */
async function cacheOverlapScore(
  bioguideId: string,
  overlapScore: number,
  committeeCodes: string[],
  sectorDonations: Map<IndustrySector, number>
): Promise<void> {
  const redis = getRedisCache();

  // Build per-sector donations object for anomaly detection
  const sectorObj: Record<string, number> = {};
  for (const [sector, amount] of sectorDonations) {
    sectorObj[sector as string] = amount;
  }

  // All writes are independent — execute in parallel
  const writes = [
    ...committeeCodes.map(code =>
      redis.set(overlapScoreCacheKey(code, bioguideId), overlapScore, CACHE_TTL).catch(() => {})
    ),
    redis.set(sectorDonationsCacheKey(bioguideId), sectorObj, CACHE_TTL).catch(() => {}),
  ];

  await Promise.all(writes);
}

/**
 * Compute peer comparison by looking up cached overlap scores
 * for other members of the same committees.
 *
 * When per-sector funding data is available for both the subject and peers,
 * also runs Modified Z-Score anomaly detection to flag unusual sector funding.
 */
async function computePeerComparison(
  bioguideId: string,
  overlapScore: number,
  committeeCodes: string[],
  subjectSectorDonations?: Map<string, number>
): Promise<PeerComparison | null> {
  if (!committeeCodes.length) return null;

  // Use the first committee for peer comparison (most specific)
  const primaryCommittee = committeeCodes[0]!;
  const committeeMapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === primaryCommittee);
  const label = committeeMapping
    ? `${committeeMapping.committeeName} committee members`
    : 'committee peers';

  // Look up cached peer scores (batch)
  try {
    const pattern = `overlap-score:${primaryCommittee}:*`;
    const keys = await getRedisCache().keys(pattern);
    const peerKeys = keys.filter(k => !k.endsWith(`:${bioguideId}`));
    if (peerKeys.length < MIN_PEERS) return null;

    const values = await getRedisCache().mget<number>(peerKeys);
    const peerScores = values.filter((v): v is number => v !== null && typeof v === 'number');

    if (peerScores.length < MIN_PEERS) {
      return null;
    }

    // Build per-sector peer data for anomaly detection
    let sectorData:
      | {
          subject: Map<string, number>;
          peers: Map<string, number[]>;
        }
      | undefined;

    if (subjectSectorDonations && subjectSectorDonations.size > 0) {
      // Extract peer bioguide IDs from cache keys (pattern: overlap-score:{committee}:{bioguideId})
      const peerBioguideIds = peerKeys
        .map(k => k.split(':').pop())
        .filter((id): id is string => Boolean(id));

      const peerSectorData = await collectPeerSectorData(peerBioguideIds);
      if (peerSectorData) {
        sectorData = {
          subject: subjectSectorDonations,
          peers: peerSectorData,
        };
      }
    }

    return peerComparisonWithAnomalies(overlapScore, peerScores, label, sectorData);
  } catch {
    return null;
  }
}

/**
 * Collect per-sector funding data from cached peer donation amounts.
 *
 * Uses per-sector donation caches (stored via `sectorDonationsCacheKey`)
 * to get the actual per-sector amounts for each peer. Caller is responsible
 * for filtering peerBioguideIds to same-committee peers and excluding the subject.
 *
 * Returns a map of sector → array of peer amounts, or null if insufficient data.
 */
async function collectPeerSectorData(
  peerBioguideIds: string[]
): Promise<Map<string, number[]> | null> {
  try {
    const redis = getRedisCache();

    // Fetch per-sector donation caches for all peers
    const sectorCacheKeys = peerBioguideIds.map(id => sectorDonationsCacheKey(id));
    const peerSectorCaches = await redis.mget<Record<string, number>>(sectorCacheKeys);

    const sectorMap = new Map<string, number[]>();
    let peersWithData = 0;

    for (const sectorObj of peerSectorCaches) {
      if (!sectorObj) continue;
      peersWithData++;

      for (const [sector, amount] of Object.entries(sectorObj)) {
        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, []);
        }
        sectorMap.get(sector)!.push(amount);
      }
    }

    if (peersWithData < MIN_PEERS) return null;

    // Only return if we have enough peers in at least one sector
    const hasEnoughData = Array.from(sectorMap.values()).some(v => v.length >= MIN_PEERS);
    return hasEnoughData ? sectorMap : null;
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
  const committeeLines = stats.committees
    .map(
      c =>
        `- ${c.committeeName}: jurisdiction sectors [${c.jurisdictionSectors.join(', ')}], ` +
        `$${c.jurisdictionDonations.toLocaleString()} from those sectors ` +
        `(${c.jurisdictionDonationPercentage.toFixed(1)}% of total)`
    )
    .join('\n');

  const peerLine = peer
    ? `Peer comparison: This legislator's overlap score is ${(stats.overlapScore * 100).toFixed(1)}%. ` +
      `The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}% ` +
      `(${peer.peerCount} peers, percentile rank: ${peer.percentileRank}).`
    : 'No peer comparison available yet (insufficient data from other committee members).';

  const anomalyLine = peer?.anomalies?.hasAnomalies
    ? `ANOMALY FLAGS:\n${peer.anomalies.flags
        .filter(f => f.isAnomaly)
        .map(f => `- ${f.description}`)
        .join('\n')}`
    : '';

  const userPrompt = `LEGISLATOR: ${data.name} (${data.party}-${data.state}), ${data.chamber}

COMMITTEES AND JURISDICTION OVERLAP:
${committeeLines}

OVERALL OVERLAP: ${(stats.overlapScore * 100).toFixed(1)}% of campaign donations come from industry sectors under this legislator's committee jurisdictions.

${peerLine}

${anomalyLine}

Write a 2-3 sentence plain-language summary of these factual patterns. State what percentage of donations come from sectors the legislator's committees oversee. If peer comparison is available, note whether this is above, below, or near the peer average. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  const systemContext =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    'campaign finance and committee jurisdictions. ';

  return generateInsightNarrative(
    systemContext,
    userPrompt,
    buildStatisticalSummary(data, stats, peer),
    '[FinanceJurisdiction]'
  );
}

// ── Fallback ─────────────────────────────────────────────────────────

function buildStatisticalSummary(
  data: FetchedData,
  stats: ComputedStats,
  peer: PeerComparison | null
): string {
  const overlapPct = (stats.overlapScore * 100).toFixed(1);
  const topCommittee = [...stats.committees].sort(
    (a, b) => b.jurisdictionDonationPercentage - a.jurisdictionDonationPercentage
  )[0];

  let summary =
    `${overlapPct}% of ${data.name}'s campaign donations come from industry sectors ` +
    `under their committee jurisdictions.`;

  if (topCommittee && topCommittee.jurisdictionDonationPercentage > 0) {
    summary +=
      ` The ${topCommittee.committeeName} committee accounts for the largest overlap ` +
      `(${topCommittee.jurisdictionDonationPercentage.toFixed(1)}%).`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    const peerPct = (peer.peerAverage * 100).toFixed(1);
    summary += ` The average for ${peer.peerGroupLabel} is ${peerPct}%.`;
  }

  // Include anomaly findings in fallback so they aren't silently dropped
  if (peer?.anomalies?.hasAnomalies) {
    const anomalyDescriptions = peer.anomalies.flags
      .filter(f => f.isAnomaly)
      .map(f => f.description);
    summary += ' ' + anomalyDescriptions.join(' ');
  }

  return summary;
}

// ── Cache Helpers ────────────────────────────────────────────────────

async function cacheInsight(key: string, insight: FinanceJurisdictionInsight): Promise<void> {
  try {
    await getRedisCache().set(key, insight, CACHE_TTL);
    logger.info('[FinanceJurisdiction] Cached insight', {
      bioguideId: insight.bioguideId,
      confidence: insight.confidence,
    });
  } catch {
    // Non-fatal
  }
}

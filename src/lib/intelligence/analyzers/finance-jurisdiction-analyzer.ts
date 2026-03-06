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
import { generateAIText } from '@/lib/ai/provider';
import { PLAIN_LANGUAGE_SYSTEM_PROMPT, PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { ReadingLevelValidator } from '@/features/legislation/services/ai/reading-level-validator';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateByIndustrySector, IndustrySector } from '@/lib/fec/industry-taxonomy';
import {
  ALL_COMMITTEE_MAPPINGS,
  type CommitteeMapping,
} from '@/lib/connections/committee-agency-map';
import { getJurisdictionSectorsForTopics } from '@/lib/connections/policy-area-map';
import { peerComparison, confidenceScore, MIN_PEERS } from '../statistics/civic-stats';
import type { FinanceJurisdictionInsight, PeerComparison } from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max AI narrative regeneration attempts */
const MAX_AI_RETRIES = 3;

/** Standard disclaimer for all finance-jurisdiction insights */
const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'Campaign contributions are legal and do not indicate wrongdoing. ' +
  'Committee assignments are determined by party leadership, not by donors. ' +
  'Correlation does not indicate causation or improper behavior.';

// ── Committee → IndustrySector Mapping ───────────────────────────────

/**
 * Find the CommitteeMapping entry for a committee by name (fuzzy match).
 * Same logic as getAgenciesForCommittee in committee-agency-map.ts.
 */
function findCommitteeMapping(committeeName: string): CommitteeMapping | null {
  const normalizedName = committeeName.toLowerCase();
  for (const mapping of ALL_COMMITTEE_MAPPINGS) {
    if (
      normalizedName.includes(mapping.committeeName.toLowerCase()) ||
      mapping.committeeName.toLowerCase().includes(normalizedName)
    ) {
      return mapping;
    }
  }
  return null;
}

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
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2. Fetch data
  const data = await fetchData(bioguideId);
  if (!data) {
    return null;
  }

  // 3. Compute statistics
  const stats = computeStatistics(data);

  // 4. Peer comparison (from cached peer overlap scores)
  const peer = await computePeerComparison(bioguideId, stats.overlapScore, data.committeeCodes);

  // 5. Generate insight
  try {
    const narrative = await generateNarrative(data, stats, peer);

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
      confidence: stats.confidence,
      dataAsOf: new Date().toISOString(),
      methodology:
        'Overlap between campaign donor industry sectors and committee jurisdiction topics. ' +
        'Sectors mapped via Congress.gov policy areas. Contributions from FEC individual filings.',
      disclaimer: DISCLAIMER,
      lastAnalyzedAt: new Date().toISOString(),
      source: 'ai-generated',
    };

    // 6. Cache
    await cacheInsight(cacheKey, insight);
    await cacheOverlapScore(bioguideId, stats.overlapScore, data.committeeCodes);

    return insight;
  } catch (error) {
    logger.error('[FinanceJurisdiction] AI generation failed, using fallback', error as Error, {
      bioguideId,
    });

    return generateFallback(bioguideId, data.name, stats, peer);
  }
}

// ── Data Fetching ────────────────────────────────────────────────────

interface FetchedData {
  name: string;
  party: string;
  state: string;
  chamber: 'House' | 'Senate';
  committees: Array<{
    name: string;
    mapping: CommitteeMapping | null;
    jurisdictionSectors: IndustrySector[];
  }>;
  committeeCodes: string[];
  sectorDonations: Map<IndustrySector, number>;
  totalDonations: number;
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
    contributions = await fecApiService.getSampleContributions(fecId, 2024, 500);
  } catch {
    logger.warn('[FinanceJurisdiction] FEC fetch failed', { bioguideId, fecId });
    return null;
  }

  if (!contributions.length) {
    logger.info('[FinanceJurisdiction] No contributions found', { bioguideId });
    return null;
  }

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

/**
 * Store this legislator's overlap score for future peer comparisons.
 */
async function cacheOverlapScore(
  bioguideId: string,
  overlapScore: number,
  committeeCodes: string[]
): Promise<void> {
  for (const code of committeeCodes) {
    try {
      await getRedisCache().set(overlapScoreCacheKey(code, bioguideId), overlapScore, CACHE_TTL);
    } catch {
      // Non-fatal
    }
  }
}

/**
 * Compute peer comparison by looking up cached overlap scores
 * for other members of the same committees.
 */
async function computePeerComparison(
  bioguideId: string,
  overlapScore: number,
  committeeCodes: string[]
): Promise<PeerComparison | null> {
  if (!committeeCodes.length) return null;

  // Use the first committee for peer comparison (most specific)
  const primaryCommittee = committeeCodes[0]!;
  const committeeMapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === primaryCommittee);
  const label = committeeMapping
    ? `${committeeMapping.committeeName} committee members`
    : 'committee peers';

  // Look up cached peer scores
  try {
    const pattern = `overlap-score:${primaryCommittee}:*`;
    const keys = await getRedisCache().keys(pattern);

    const peerScores: number[] = [];
    for (const key of keys) {
      // Skip self
      if (key.endsWith(`:${bioguideId}`)) continue;
      const score = await getRedisCache().get<number>(key);
      if (score !== null && typeof score === 'number') {
        peerScores.push(score);
      }
    }

    if (peerScores.length < MIN_PEERS) {
      return null;
    }

    return peerComparison(overlapScore, peerScores, label);
  } catch {
    return null;
  }
}

// ── AI Narrative Generation ──────────────────────────────────────────

async function generateNarrative(
  data: FetchedData,
  stats: ComputedStats,
  peer: PeerComparison | null
): Promise<string> {
  const systemPrompt =
    'You analyze civic data for CIV.IQ. You describe factual patterns between ' +
    'campaign finance and committee jurisdictions. ' +
    PLAIN_LANGUAGE_SYSTEM_PROMPT.replace('Output valid JSON only.', 'Output plain text only.');

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

  const userPrompt = `LEGISLATOR: ${data.name} (${data.party}-${data.state}), ${data.chamber}

COMMITTEES AND JURISDICTION OVERLAP:
${committeeLines}

OVERALL OVERLAP: ${(stats.overlapScore * 100).toFixed(1)}% of campaign donations come from industry sectors under this legislator's committee jurisdictions.

${peerLine}

Write a 2-3 sentence plain-language summary of these factual patterns. State what percentage of donations come from sectors the legislator's committees oversee. If peer comparison is available, note whether this is above, below, or near the peer average. Do not claim causation. Do not judge.

${PLAIN_LANGUAGE_RULES}`;

  // Try up to MAX_AI_RETRIES times for reading level compliance
  for (let attempt = 0; attempt < MAX_AI_RETRIES; attempt++) {
    const text = await generateAIText(systemPrompt, userPrompt, {
      temperature: 0.3,
      maxTokens: 300,
    });

    if (ReadingLevelValidator.meetsTarget(text, 8)) {
      return text;
    }

    logger.info('[FinanceJurisdiction] Reading level too high, retrying', {
      attempt: attempt + 1,
      bioguideId: data.name,
    });
  }

  // Fallback: return a statistical summary
  return buildStatisticalSummary(data, stats, peer);
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

  return summary;
}

async function generateFallback(
  bioguideId: string,
  name: string,
  stats: ComputedStats,
  peer: PeerComparison | null
): Promise<FinanceJurisdictionInsight> {
  const overlapPct = (stats.overlapScore * 100).toFixed(1);
  const topCommittee = [...stats.committees].sort(
    (a, b) => b.jurisdictionDonationPercentage - a.jurisdictionDonationPercentage
  )[0];

  let narrative =
    `${overlapPct}% of ${name}'s campaign donations come from industry sectors ` +
    `under their committee jurisdictions.`;

  if (topCommittee && topCommittee.jurisdictionDonationPercentage > 0) {
    narrative +=
      ` The ${topCommittee.committeeName} committee accounts for the largest overlap ` +
      `(${topCommittee.jurisdictionDonationPercentage.toFixed(1)}%).`;
  }

  if (peer && peer.peerCount >= MIN_PEERS) {
    narrative += ` The average for ${peer.peerGroupLabel} is ${(peer.peerAverage * 100).toFixed(1)}%.`;
  }

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
    confidence: Math.min(stats.confidence, 0.5), // Lower confidence for fallback
    dataAsOf: new Date().toISOString(),
    methodology:
      'Overlap between campaign donor industry sectors and committee jurisdiction topics. ' +
      'Sectors mapped via Congress.gov policy areas. Contributions from FEC individual filings.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source: 'statistical-fallback',
  };

  // Still cache the fallback
  const cacheKey = `insight:finance_jurisdiction:${bioguideId}`;
  await cacheInsight(cacheKey, insight);

  return insight;
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

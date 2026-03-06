/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Intelligence Analyzer
 *
 * Analyzes sponsor/cosponsor funding sources relative to the bill's
 * policy area, and summarizes related lobbying activity.
 * Answers: "Who funds the sponsors of this bill, and do those funders
 * align with the bill's affected sectors?"
 *
 * Flow: check cache → fetch bill → map sectors → analyze sponsor → analyze cosponsors → AI narrative → cache
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { PLAIN_LANGUAGE_RULES } from '@/lib/ai/plain-language';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import { getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { aggregateByIndustrySector, type IndustrySector } from '@/lib/fec/industry-taxonomy';
import { getIndustrySectorsForPolicyArea } from '@/lib/connections/policy-area-map';
import { analyzeLobbyingPipeline } from './lobbying-pipeline-analyzer';
import {
  getCurrentElectionCycle,
  findCommitteeMapping,
  generateInsightNarrative,
  withTimeout,
  ANALYZER_TIMEOUT_MS,
} from './shared';
import { confidenceScore } from '../statistics/civic-stats';
import type { BillIntelligenceInsight } from '../types';

/** Redis cache TTL: 7 days */
const CACHE_TTL = 7 * 24 * 60 * 60;

/** Max cosponsors to analyze (top by date) */
const MAX_COSPONSORS = 10;

const DISCLAIMER =
  'This analysis shows factual patterns in public data. ' +
  'Campaign contributions are legal and do not indicate wrongdoing. ' +
  'Sponsor funding sources do not imply improper motivation for legislation. ' +
  'Correlation does not indicate causation or improper behavior.';

// ── Main Analyzer ────────────────────────────────────────────────────

export async function analyzeBillIntelligence(
  billId: string
): Promise<BillIntelligenceInsight | null> {
  const cacheKey = `insight:bill_intelligence:${billId}`;

  // 1. Check cache
  try {
    const cached = await getRedisCache().get<BillIntelligenceInsight>(cacheKey);
    if (cached) {
      logger.info('[BillIntelligence] Cache hit', { billId });
      return cached;
    }
  } catch {
    // Cache miss or error — continue to computation
  }

  // 2-9. Fetch, compute, narrate, cache — all under timeout
  return withTimeout(computeAndCache(billId, cacheKey), ANALYZER_TIMEOUT_MS, 'BillIntelligence');
}

async function computeAndCache(
  billId: string,
  cacheKey: string
): Promise<BillIntelligenceInsight | null> {
  // 2. Fetch bill data
  const bill = await fetchBillFromCongress(billId);
  if (!bill) {
    logger.info('[BillIntelligence] Bill not found', { billId });
    return null;
  }

  const policyArea = bill.policyArea;
  if (!policyArea) {
    logger.info('[BillIntelligence] No policy area for bill', { billId });
    return null;
  }

  // 3. Map policy area to industry sectors
  const affectedSectors = getIndustrySectorsForPolicyArea(policyArea);
  if (affectedSectors.length === 0) {
    logger.info('[BillIntelligence] No sector mapping for policy area', { billId, policyArea });
    return null;
  }

  // 4. Analyze sponsor
  const sponsorBioguide = bill.sponsor.representative.bioguideId;
  const sponsorAnalysis = await analyzeMemberSectorDonations(
    sponsorBioguide,
    bill.sponsor.representative.name,
    bill.sponsor.representative.party,
    affectedSectors
  );

  // 5. Analyze cosponsors (top MAX_COSPONSORS by date)
  const cosponsorsToAnalyze = bill.cosponsors.filter(c => !c.withdrawn).slice(0, MAX_COSPONSORS);

  const cosponsorResults = await Promise.all(
    cosponsorsToAnalyze.map(c =>
      analyzeMemberSectorDonations(
        c.representative.bioguideId,
        c.representative.name,
        c.representative.party,
        affectedSectors
      ).catch(() => null)
    )
  );

  const validCosponsorResults = cosponsorResults.filter(
    (r): r is NonNullable<typeof r> => r !== null
  );
  const avgCosponsorPct =
    validCosponsorResults.length > 0
      ? validCosponsorResults.reduce((sum, r) => sum + r.sectorDonationPercentage, 0) /
        validCosponsorResults.length
      : 0;

  const cosponsorSummary = {
    totalCosponsors: bill.cosponsors.filter(c => !c.withdrawn).length,
    analyzedCosponsors: validCosponsorResults.length,
    avgSectorDonationPercentage: avgCosponsorPct,
  };

  // 6. Related lobbying spending from committee lobbying pipeline cache
  const { lobbyingSpending, lobbyingOrgs } = await getRelatedLobbyingData(bill.committees);

  // 7. Compute confidence
  const conf = confidenceScore({
    sampleSize: affectedSectors.length,
    minimumSampleSize: 1,
    dataCompleteness: sponsorAnalysis ? 0.8 : 0.4,
    peerCount: validCosponsorResults.length,
  });

  // 8. Generate narrative
  const { narrative, source } = await generateNarrative(
    bill.title,
    policyArea,
    affectedSectors,
    sponsorAnalysis,
    cosponsorSummary,
    lobbyingSpending,
    lobbyingOrgs
  );

  const insight: BillIntelligenceInsight = {
    billId,
    billTitle: bill.title,
    policyArea,
    affectedSectors,
    sponsorAnalysis,
    cosponsorSummary,
    relatedLobbyingSpending: lobbyingSpending,
    relatedLobbyingOrgs: lobbyingOrgs,
    narrative,
    confidence: conf,
    dataAsOf: new Date().toISOString(),
    methodology:
      'Sponsor/cosponsor campaign contributions aggregated by industry sector from FEC filings. ' +
      'Sectors mapped via Congress.gov policy areas. ' +
      'Lobbying data from Senate LDA disclosures matched to bill committees.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // 9. Cache
  try {
    await getRedisCache().set(cacheKey, insight, CACHE_TTL);
  } catch {
    logger.warn('[BillIntelligence] Cache write failed', { billId });
  }

  return insight;
}

// ── Member Sector Analysis ───────────────────────────────────────────

interface MemberSectorResult {
  bioguideId: string;
  name: string;
  party: string;
  sectorDonationPercentage: number;
  sectorDonationAmount: number;
  totalDonations: number;
}

async function analyzeMemberSectorDonations(
  bioguideId: string,
  name: string,
  party: string,
  sectors: IndustrySector[]
): Promise<MemberSectorResult | null> {
  const fecId = getFECIdFromBioguide(bioguideId);
  if (!fecId) return null;

  let contributions;
  try {
    contributions = await fecApiService.getSampleContributions(
      fecId,
      getCurrentElectionCycle(),
      500
    );
  } catch {
    return null;
  }

  if (contributions.length === 0) return null;

  const sectorAggregation = aggregateByIndustrySector(contributions);
  let totalDonations = 0;
  let sectorDonationAmount = 0;

  for (const entry of sectorAggregation) {
    totalDonations += entry.totalAmount;
    if (sectors.includes(entry.sector)) {
      sectorDonationAmount += entry.totalAmount;
    }
  }

  if (totalDonations === 0) return null;

  return {
    bioguideId,
    name,
    party,
    sectorDonationPercentage: (sectorDonationAmount / totalDonations) * 100,
    sectorDonationAmount,
    totalDonations,
  };
}

// ── Lobbying Data ────────────────────────────────────────────────────

async function getRelatedLobbyingData(
  committees: Array<{ committeeId: string; name: string }>
): Promise<{ lobbyingSpending: number; lobbyingOrgs: number }> {
  let totalSpending = 0;
  let totalOrgs = 0;

  for (const committee of committees) {
    // Resolve committee name to committee code
    const mapping = findCommitteeMapping(committee.name);
    if (!mapping) continue;

    try {
      const lobbyingInsight = await analyzeLobbyingPipeline(mapping.committeeCode);
      if (lobbyingInsight) {
        totalSpending += lobbyingInsight.totalSpending;
        totalOrgs += lobbyingInsight.organizationCount;
      }
    } catch {
      // Lobbying data unavailable — continue
    }
  }

  return { lobbyingSpending: totalSpending, lobbyingOrgs: totalOrgs };
}

// ── Narrative Generation ─────────────────────────────────────────────

async function generateNarrative(
  billTitle: string,
  policyArea: string,
  sectors: IndustrySector[],
  sponsor: MemberSectorResult | null,
  cosponsorSummary: BillIntelligenceInsight['cosponsorSummary'],
  lobbyingSpending: number,
  lobbyingOrgs: number
): Promise<{ narrative: string; source: 'ai-generated' | 'statistical-fallback' }> {
  const sectorList = sectors.slice(0, 5).join(', ');
  const sponsorInfo = sponsor
    ? `The sponsor, ${sponsor.name} (${sponsor.party}), received $${sponsor.sectorDonationAmount.toLocaleString()} from these sectors, representing ${sponsor.sectorDonationPercentage.toFixed(1)}% of their total $${sponsor.totalDonations.toLocaleString()} in contributions.`
    : 'Sponsor contribution data is not available.';

  const cosponsorInfo =
    cosponsorSummary.analyzedCosponsors > 0
      ? `Among ${cosponsorSummary.analyzedCosponsors} analyzed cosponsors (of ${cosponsorSummary.totalCosponsors} total), the average sector-related contribution percentage was ${cosponsorSummary.avgSectorDonationPercentage.toFixed(1)}%.`
      : `Cosponsor contribution data is not available.`;

  const lobbyingInfo =
    lobbyingSpending > 0
      ? `${lobbyingOrgs} organizations spent $${lobbyingSpending.toLocaleString()} lobbying the committees this bill was referred to.`
      : '';

  const prompt =
    `Write a 2-3 sentence summary of funding patterns for this bill.\n\n` +
    `${PLAIN_LANGUAGE_RULES}\n\n` +
    `Bill: "${billTitle}"\n` +
    `Policy area: ${policyArea}\n` +
    `Affected industry sectors: ${sectorList}\n` +
    `${sponsorInfo}\n` +
    `${cosponsorInfo}\n` +
    `${lobbyingInfo}\n\n` +
    `Use "pattern", "correlation", or "association" — never "caused", "influenced", or "resulted in". ` +
    `State facts only.`;

  const fallback = buildStatisticalNarrative(
    billTitle,
    policyArea,
    sectors,
    sponsor,
    cosponsorSummary,
    lobbyingSpending,
    lobbyingOrgs
  );

  return generateInsightNarrative(
    'You summarize bill funding patterns for CIV.IQ. ',
    prompt,
    fallback,
    '[BillIntelligence]'
  );
}

// ── Fallback Narratives ──────────────────────────────────────────────

function buildStatisticalNarrative(
  billTitle: string,
  policyArea: string,
  sectors: IndustrySector[],
  sponsor: MemberSectorResult | null,
  cosponsorSummary: BillIntelligenceInsight['cosponsorSummary'],
  lobbyingSpending: number,
  lobbyingOrgs: number
): string {
  const sectorList = sectors.slice(0, 3).join(', ');
  let narrative = `This bill addresses ${policyArea}, which relates to the ${sectorList} sector${sectors.length > 1 ? 's' : ''}.`;

  if (sponsor) {
    narrative += ` The sponsor received ${sponsor.sectorDonationPercentage.toFixed(1)}% of campaign contributions from these sectors.`;
  }

  if (cosponsorSummary.analyzedCosponsors > 0) {
    narrative += ` Among ${cosponsorSummary.analyzedCosponsors} analyzed cosponsors, the average was ${cosponsorSummary.avgSectorDonationPercentage.toFixed(1)}%.`;
  }

  if (lobbyingSpending > 0) {
    narrative += ` ${lobbyingOrgs} organizations spent $${lobbyingSpending.toLocaleString()} lobbying related committees.`;
  }

  return narrative;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Intelligence Profile Computation
 *
 * Composes existing analyzers with district economic data, temporal
 * trends, and peer comparison to answer: "Does my representative
 * work for my district?"
 *
 * Data sources:
 * - USASpending: federal spending by district (top agencies, totals)
 * - Congress.gov: district representatives
 * - Vote-finance analyzer: donation-to-vote correlation by sector
 * - Finance-jurisdiction analyzer: committee-donor overlap
 * - District bills: relevance-scored pending legislation
 * - Phase 2 temporal mesh: alignment trend over time
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { confidenceScore } from '@/lib/intelligence/statistics/civic-stats';
import { generateInsightNarrative, withTimeout } from '@/lib/intelligence/analyzers/shared';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { buildTemporalProfile } from './temporal';
import { dateToPeriod, periodToDateRange } from './temporal';
import type {
  DistrictProfile,
  RepresentationAlignment,
  SectorConcentration,
  BillExposure,
  PeerDistrict,
  DistrictVector,
} from './district-profile-types';
import type { TemporalBucket } from './temporal-types';
import type { IndustryCorrelation } from '@/lib/intelligence/types';

const CACHE_TTL = 86400; // 24 hours
const ANALYZER_TIMEOUT = 30_000;

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

const DISCLAIMER =
  'This profile uses public data from USASpending.gov, FEC, Congress.gov, and BLS. ' +
  'Alignment scores measure statistical patterns, not intent. ' +
  'Correlation between funding and voting does not indicate causation.';

// All 13 sectors in canonical order for vector operations
const SECTOR_ORDER: IndustrySector[] = [
  IndustrySector.AGRIBUSINESS,
  IndustrySector.COMMUNICATIONS_ELECTRONICS,
  IndustrySector.CONSTRUCTION,
  IndustrySector.DEFENSE,
  IndustrySector.ENERGY_NATURAL_RESOURCES,
  IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
  IndustrySector.HEALTH,
  IndustrySector.LAWYERS_LOBBYISTS,
  IndustrySector.TRANSPORTATION,
  IndustrySector.MISC_BUSINESS,
  IndustrySector.LABOR,
  IndustrySector.IDEOLOGY_SINGLE_ISSUE,
  IndustrySector.OTHER,
];

/**
 * Build a district intelligence profile.
 */
export async function buildDistrictProfile(districtId: string): Promise<DistrictProfile | null> {
  const parsed = parseDistrictId(districtId);
  if (!parsed) return null;

  const { state, district } = parsed;
  const cacheKey = `mesh:district_profile:${state}:${district}`;
  const cache = getRedisCache();

  // Check cache
  const cached = await cache.get<DistrictProfile>(cacheKey).catch(() => null);
  if (cached) {
    logger.info('[DistrictProfile] Cache hit', { districtId });
    return cached;
  }

  logger.info('[DistrictProfile] Building profile', { districtId });

  // Step 1: Fetch base data in parallel
  const [allReps, spendingData, billsData] = await Promise.all([
    RepresentativesCoreService.getAllRepresentatives(),
    fetchDistrictSpending(state, district),
    fetchDistrictBills(districtId),
  ]);

  // Find district representatives (House + both Senators)
  // For STATE-level pages, only senators. For House districts,
  // match by district number. At-large districts (AL) match reps
  // with district "0", "00", or undefined.
  const isStateLevel = district === 'STATE';
  const isAtLarge = district === 'AL';
  const districtReps = allReps.filter(rep => {
    if (rep.state !== state) return false;
    if (isStateLevel) return rep.chamber === 'Senate';
    if (rep.chamber === 'Senate') return true;
    if (rep.chamber !== 'House') return false;
    if (isAtLarge) return !rep.district || rep.district === '0' || rep.district === '00';
    return rep.district === district;
  });

  if (districtReps.length === 0) {
    logger.warn('[DistrictProfile] No representatives found', { districtId });
    return null;
  }

  // Step 2: Build economic DNA from spending data
  const topAgencies = spendingData?.agencies ?? [];
  const federalSpendingTotal = spendingData?.total ?? 0;
  const federalSpendingPerCapita = spendingData?.perCapita ?? null;

  // Build sector concentrations from spending agencies + bill data
  const topSectors = buildSectorConcentrations(topAgencies, billsData);

  // Step 3: Compute representation alignment for each rep
  const representatives = await Promise.all(
    districtReps.map(rep =>
      computeRepAlignment(rep.bioguideId, rep.name, rep.party, rep.chamber, topSectors)
    )
  );

  // Step 4: Find peer districts
  const peerDistricts = await findPeerDistricts(districtId, representatives);

  // Step 5: Build temporal alignment history
  const alignmentHistory = await buildAlignmentHistory(districtReps.map(r => r.bioguideId));

  // Step 6: Build bill exposure list
  const pendingBillExposure = buildBillExposure(billsData, topSectors);

  // Step 7: Generate narrative
  const overallScores = representatives
    .map(r => r.overallAlignment)
    .filter((v): v is number => v !== null);
  const avgAlignment =
    overallScores.length > 0
      ? overallScores.reduce((a, b) => a + b, 0) / overallScores.length
      : null;

  const repSummaries = representatives
    .map(r => {
      const score =
        r.overallAlignment !== null
          ? `${(r.overallAlignment * 100).toFixed(0)}% alignment`
          : 'alignment unavailable';
      return `${r.name} (${r.party}): ${score}`;
    })
    .join('. ');

  const statisticalFallback =
    avgAlignment !== null
      ? `District ${districtId} representation alignment: ${(avgAlignment * 100).toFixed(0)}%. ${repSummaries}. ` +
        `Top economic sectors: ${topSectors
          .slice(0, 3)
          .map(s => s.sector)
          .join(', ')}.`
      : `District ${districtId}: ${repSummaries}. Insufficient data for alignment scoring.`;

  const { narrative, source } = await generateInsightNarrative(
    'You are a civic data analyst summarizing a district intelligence profile. ' +
      "Use plain language. Never claim causation. Focus on whether representatives' " +
      "committee work and voting patterns align with the district's economic interests.",
    `District ${districtId} (${state}) has ${representatives.length} representatives. ` +
      repSummaries +
      '. ' +
      `Top sectors: ${topSectors
        .slice(0, 5)
        .map(s => `${s.sector} (${(s.economicShare * 100).toFixed(0)}%)`)
        .join(', ')}. ` +
      `Federal spending: $${(federalSpendingTotal / 1e6).toFixed(1)}M.`,
    statisticalFallback,
    '[DistrictProfile]'
  );

  // Step 8: Compute confidence
  const dataPoints = representatives.reduce((count, r) => {
    let c = count;
    if (r.voteAlignmentScore !== null) c++;
    if (r.jurisdictionCoverage !== null) c++;
    if (r.fundingAlignmentScore !== null) c++;
    return c;
  }, 0);
  const maxDataPoints = representatives.length * 3;

  const confidence = confidenceScore({
    sampleSize: representatives.length,
    minimumSampleSize: 1,
    dataCompleteness: maxDataPoints > 0 ? dataPoints / maxDataPoints : 0,
    peerCount: peerDistricts.length,
  });

  const profile: DistrictProfile = {
    districtId,
    state,
    district,
    topSectors,
    federalSpendingTotal,
    federalSpendingPerCapita,
    topAgencies: topAgencies.slice(0, 10),
    representatives,
    pendingBillExposure,
    peerDistricts,
    alignmentHistory,
    narrative,
    confidence,
    dataAsOf: new Date().toISOString(),
    methodology:
      'Composes vote-finance correlation, committee jurisdiction coverage, and ' +
      'donor-economy alignment for each representative. Alignment = 0.4*vote + ' +
      '0.3*jurisdiction + 0.3*funding. Peer comparison via economic sector similarity.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // Cache result
  await cache.set(cacheKey, profile, CACHE_TTL).catch(err => {
    logger.warn('[DistrictProfile] Cache write failed', { error: (err as Error).message });
  });

  return profile;
}

// ── Representation Alignment ──────────────────────────────────────

async function computeRepAlignment(
  bioguideId: string,
  name: string,
  party: string,
  chamber: string,
  topSectors: SectorConcentration[]
): Promise<RepresentationAlignment> {
  const [vfResult, fjResult] = await Promise.allSettled([
    withTimeout(analyzeVoteFinance(bioguideId), ANALYZER_TIMEOUT, `VF:${bioguideId}`),
    withTimeout(analyzeFinanceJurisdiction(bioguideId), ANALYZER_TIMEOUT, `FJ:${bioguideId}`),
  ]);

  const vf = vfResult.status === 'fulfilled' ? vfResult.value : null;
  const fj = fjResult.status === 'fulfilled' ? fjResult.value : null;

  // Vote alignment: weighted average of sector alignment scores,
  // weighted by district economic share
  let voteAlignmentScore: number | null = null;
  if (vf?.correlations && topSectors.length > 0) {
    voteAlignmentScore = computeWeightedVoteAlignment(vf.correlations, topSectors);
  }

  // Jurisdiction coverage: fraction of district's top 5 sectors
  // covered by rep's committee jurisdictions
  let jurisdictionCoverage: number | null = null;
  if (fj?.committees) {
    const coveredSectors = new Set<string>();
    for (const cmte of fj.committees) {
      for (const sector of cmte.jurisdictionSectors) {
        coveredSectors.add(sector);
      }
    }
    const topDistrictSectors = topSectors.slice(0, 5).map(s => s.sector);
    const covered = topDistrictSectors.filter(s => coveredSectors.has(s)).length;
    jurisdictionCoverage =
      topDistrictSectors.length > 0 ? covered / topDistrictSectors.length : null;
  }

  // Funding alignment: cosine similarity between district economic
  // sector vector and rep's donor sector vector
  let fundingAlignmentScore: number | null = null;
  if (vf?.correlations && topSectors.length > 0) {
    fundingAlignmentScore = computeFundingAlignment(vf.correlations, topSectors);
  }

  // Composite: 0.4 * vote + 0.3 * jurisdiction + 0.3 * funding
  const scores = [
    { value: voteAlignmentScore, weight: 0.4 },
    { value: jurisdictionCoverage, weight: 0.3 },
    { value: fundingAlignmentScore, weight: 0.3 },
  ].filter((s): s is { value: number; weight: number } => s.value !== null);

  let overallAlignment: number | null = null;
  if (scores.length > 0) {
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
    overallAlignment = scores.reduce((sum, s) => sum + s.value * s.weight, 0) / totalWeight;
  }

  // Trend: use temporal profile if available
  let alignmentTrend: RepresentationAlignment['alignmentTrend'] = 'stable';
  try {
    const temporal = await buildTemporalProfile(`rep:${bioguideId}`, { quarters: 4 });
    if (temporal?.edgeSummaries && temporal.edgeSummaries.length > 0) {
      const donationSummary = temporal.edgeSummaries.find(s => s.edgeType === 'donated_to');
      if (donationSummary) {
        const { increasing, decreasing } = donationSummary.trendBreakdown;
        if (increasing > decreasing * 2) alignmentTrend = 'increasing';
        else if (decreasing > increasing * 2) alignmentTrend = 'decreasing';
      }
    }
  } catch {
    // Temporal data optional
  }

  return {
    bioguideId,
    name,
    party,
    chamber,
    voteAlignmentScore,
    jurisdictionCoverage,
    fundingAlignmentScore,
    overallAlignment,
    alignmentTrend,
  };
}

/**
 * Compute weighted vote alignment: average sector alignment scores
 * weighted by the district's economic share in each sector.
 */
function computeWeightedVoteAlignment(
  correlations: IndustryCorrelation[],
  topSectors: SectorConcentration[]
): number | null {
  const sectorShareMap = new Map(topSectors.map(s => [s.sector, s.economicShare]));
  let weightedSum = 0;
  let totalWeight = 0;

  for (const corr of correlations) {
    if (!corr.meetsSampleSize) continue;
    const share = sectorShareMap.get(corr.sector) ?? 0;
    if (share > 0) {
      weightedSum += corr.alignmentScore * share;
      totalWeight += share;
    }
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

/**
 * Compute funding alignment: cosine similarity between district economic
 * vector and rep's donor vector.
 */
function computeFundingAlignment(
  correlations: IndustryCorrelation[],
  topSectors: SectorConcentration[]
): number | null {
  const districtVector = SECTOR_ORDER.map(sector => {
    const s = topSectors.find(ts => ts.sector === sector);
    return s?.economicShare ?? 0;
  });

  const totalDonations = correlations.reduce((sum, c) => sum + c.donationAmount, 0);
  if (totalDonations === 0) return null;

  const donorVector = SECTOR_ORDER.map(sector => {
    const c = correlations.find(corr => corr.sector === sector);
    return c ? c.donationAmount / totalDonations : 0;
  });

  return cosineSimilarity(districtVector, donorVector);
}

// ── Economic Data ──────────────────────────────────────────────────

interface SpendingResult {
  total: number;
  perCapita: number | null;
  agencies: Array<{ name: string; slug: string; amount: number }>;
}

async function fetchDistrictSpending(
  state: string,
  district: string
): Promise<SpendingResult | null> {
  try {
    const fiscalYear = new Date().getFullYear();
    const startDate = `${fiscalYear - 1}-10-01`;
    const endDate = `${fiscalYear}-09-30`;

    // Normalize district for USASpending API (expects numeric codes)
    // At-large (AL) -> "00", STATE -> statewide query, numeric -> padded
    const spendingDistrict =
      district === 'AL' ? '00' : district === 'STATE' ? '90' : district.padStart(2, '0');

    // For STATE-level queries, use state-only filter (no district constraint)
    const locationFilter =
      district === 'STATE'
        ? { country: 'USA', state }
        : { country: 'USA', state, district_current: spendingDistrict };

    // Fetch top agencies and aggregate in parallel
    const [agencyResponse, aggregateResponse] = await Promise.all([
      fetch(`${USASPENDING_API}/search/spending_by_award/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
        body: JSON.stringify({
          subawards: false,
          limit: 50,
          fields: ['Award Amount', 'Awarding Agency'],
          sort: 'Award Amount',
          order: 'desc',
          filters: {
            place_of_performance_locations: [locationFilter],
            time_period: [{ start_date: startDate, end_date: endDate }],
            award_type_codes: ['A', 'B', 'C', 'D', '02', '03', '04', '05'],
          },
        }),
      }),
      fetch(`${USASPENDING_API}/search/spending_by_geography/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
        body: JSON.stringify({
          scope: 'place_of_performance',
          geo_layer: district === 'STATE' ? 'state' : 'district',
          geo_layer_filters: [district === 'STATE' ? state : `${state}${spendingDistrict}`],
          filters: {
            time_period: [{ start_date: startDate, end_date: endDate }],
          },
        }),
      }),
    ]);

    // Aggregate by agency from award results
    const agencies = new Map<string, number>();
    if (agencyResponse.ok) {
      const data = await agencyResponse.json();
      for (const result of data.results ?? []) {
        const agency = result['Awarding Agency'] as string;
        const amount = result['Award Amount'] as number;
        if (agency) {
          agencies.set(agency, (agencies.get(agency) ?? 0) + amount);
        }
      }
    }

    const sortedAgencies = Array.from(agencies.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([name, amount]) => ({
        name,
        slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        amount,
      }));

    let total = 0;
    let perCapita: number | null = null;
    if (aggregateResponse.ok) {
      const aggData = await aggregateResponse.json();
      const result = aggData.results?.[0];
      if (result) {
        total = result.aggregated_amount ?? 0;
        perCapita = result.per_capita ?? null;
      }
    }

    return { total, perCapita, agencies: sortedAgencies };
  } catch (error) {
    logger.warn('[DistrictProfile] Spending fetch failed', { error: String(error) });
    return null;
  }
}

interface BillData {
  bills: Array<{
    title: string;
    number: string;
    status: string;
    policyArea: string | null;
    relevanceScore: number;
    relevanceReasons: string[];
  }>;
  relevantPolicyAreas: string[];
}

async function fetchDistrictBills(districtId: string): Promise<BillData | null> {
  try {
    // Use AbortSignal.timeout to prevent deadlock when the server
    // handles this request on the same worker thread that is already
    // processing the parent /api/mesh/district request (self-referencing fetch).
    const response = await fetch(
      `${getInternalBaseUrl()}/api/district/${districtId}/bills?limit=20`,
      {
        headers: { 'User-Agent': 'CIV.IQ/1.0' },
        signal: AbortSignal.timeout(15_000),
      }
    );
    if (!response.ok) return null;
    const data = await response.json();
    return {
      bills: data.bills ?? [],
      relevantPolicyAreas: data.relevantPolicyAreas ?? [],
    };
  } catch {
    return null;
  }
}

// ── Sector Concentrations ──────────────────────────────────────────

const AGENCY_SECTOR_MAP: Record<string, IndustrySector> = {
  'department of defense': IndustrySector.DEFENSE,
  'department of health and human services': IndustrySector.HEALTH,
  'department of energy': IndustrySector.ENERGY_NATURAL_RESOURCES,
  'department of agriculture': IndustrySector.AGRIBUSINESS,
  'department of transportation': IndustrySector.TRANSPORTATION,
  'department of housing and urban development': IndustrySector.CONSTRUCTION,
  'department of education': IndustrySector.IDEOLOGY_SINGLE_ISSUE,
  'department of veterans affairs': IndustrySector.DEFENSE,
  'department of the interior': IndustrySector.ENERGY_NATURAL_RESOURCES,
  'department of commerce': IndustrySector.COMMUNICATIONS_ELECTRONICS,
  'department of justice': IndustrySector.LAWYERS_LOBBYISTS,
  'department of labor': IndustrySector.LABOR,
  'department of the treasury': IndustrySector.FINANCE_INSURANCE_REAL_ESTATE,
  'general services administration': IndustrySector.MISC_BUSINESS,
  'environmental protection agency': IndustrySector.ENERGY_NATURAL_RESOURCES,
  'national aeronautics and space administration': IndustrySector.DEFENSE,
  'national science foundation': IndustrySector.COMMUNICATIONS_ELECTRONICS,
  'small business administration': IndustrySector.MISC_BUSINESS,
};

function buildSectorConcentrations(
  agencies: Array<{ name: string; slug: string; amount: number }>,
  billsData: BillData | null
): SectorConcentration[] {
  const sectorSpending = new Map<IndustrySector, number>();
  const sectorBills = new Map<IndustrySector, number>();
  let totalSpending = 0;

  // Map agency spending to sectors
  for (const agency of agencies) {
    const sector = AGENCY_SECTOR_MAP[agency.name.toLowerCase()];
    if (sector) {
      sectorSpending.set(sector, (sectorSpending.get(sector) ?? 0) + agency.amount);
      totalSpending += agency.amount;
    }
  }

  // Count bills per sector via policy area → sector mapping
  if (billsData?.bills) {
    for (const bill of billsData.bills) {
      if (!bill.policyArea) continue;
      const mapping = getPolicyAreaMapping(bill.policyArea);
      if (mapping?.industrySectors) {
        for (const sector of mapping.industrySectors) {
          sectorBills.set(sector, (sectorBills.get(sector) ?? 0) + 1);
        }
      }
    }
  }

  // Build sorted sector list
  return Array.from(sectorSpending.entries())
    .map(([sector, spending]) => ({
      sector,
      economicShare: totalSpending > 0 ? spending / totalSpending : 0,
      federalSpending: spending,
      pendingBills: sectorBills.get(sector) ?? 0,
    }))
    .sort((a, b) => b.economicShare - a.economicShare)
    .slice(0, 10);
}

// ── Peer Districts ──────────────────────────────────────────────────

let cachedVectors: DistrictVector[] | null = null;

/**
 * Load precomputed district vectors. Falls back to empty array if
 * the vectors file hasn't been generated yet.
 */
async function loadDistrictVectors(): Promise<DistrictVector[]> {
  if (cachedVectors) return cachedVectors;
  try {
    const data = await import('./district-vectors.json');
    cachedVectors = data.default as DistrictVector[];
    return cachedVectors;
  } catch {
    // Vectors not yet computed — return empty
    return [];
  }
}

async function findPeerDistricts(
  districtId: string,
  representatives: RepresentationAlignment[]
): Promise<PeerDistrict[]> {
  const vectors = await loadDistrictVectors();
  const thisVector = vectors.find(v => v.districtId === districtId);

  if (!thisVector?.peers) return [];

  return thisVector.peers.slice(0, 5).map(peer => {
    const peerVector = vectors.find(v => v.districtId === peer.districtId);
    return {
      districtId: peer.districtId,
      state: peerVector?.state ?? peer.districtId.split('-')[0] ?? '',
      district: peerVector?.district ?? peer.districtId.split('-')[1] ?? '',
      economicSimilarity: peer.similarity,
      repAlignmentScore: null, // Populated only when peer profiles are cached
      alignmentDelta: null,
    };
  });
}

// ── Bill Exposure ──────────────────────────────────────────────────

function buildBillExposure(
  billsData: BillData | null,
  topSectors: SectorConcentration[]
): BillExposure[] {
  if (!billsData?.bills) return [];

  const topSectorNames = new Set(topSectors.map(s => s.sector));

  return billsData.bills
    .filter(b => b.relevanceScore > 0)
    .slice(0, 10)
    .map(bill => ({
      billId: bill.number,
      title: bill.title,
      affectedSectors: Array.from(topSectorNames).slice(0, 3) as IndustrySector[],
      status: bill.status,
      relevanceScore: bill.relevanceScore,
    }));
}

// ── Temporal History ──────────────────────────────────────────────

async function buildAlignmentHistory(bioguideIds: string[]): Promise<TemporalBucket[]> {
  const allBuckets = new Map<string, TemporalBucket>();

  for (const bioguideId of bioguideIds) {
    try {
      const profile = await buildTemporalProfile(`rep:${bioguideId}`, { quarters: 8 });
      if (!profile?.edgeSummaries) continue;

      for (const summary of profile.edgeSummaries) {
        if (summary.edgeType !== 'donated_to') continue;
        for (const bucket of summary.aggregateBuckets) {
          const existing = allBuckets.get(bucket.period);
          if (existing) {
            existing.value += bucket.value;
            existing.eventCount += bucket.eventCount;
          } else {
            allBuckets.set(bucket.period, { ...bucket });
          }
        }
      }
    } catch {
      // Temporal data optional
    }
  }

  return Array.from(allBuckets.values()).sort((a, b) => a.period.localeCompare(b.period));
}

// ── Utility ──────────────────────────────────────────────────────

function parseDistrictId(districtId: string): { state: string; district: string } | null {
  const match = districtId.match(/^([A-Z]{2})-(\d{1,2}|AL|STATE|Senate)$/i);
  if (!match) return null;
  return {
    state: (match[1] ?? '').toUpperCase(),
    district: (match[2] ?? '').toUpperCase(),
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

function getInternalBaseUrl(): string {
  if (typeof window !== 'undefined') return '';
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

// Re-export for external use
export { SECTOR_ORDER };

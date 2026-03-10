/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Address Money Report Card
 *
 * Resolves an address (POST) or ZIP code (GET) to a congressional district
 * and returns a money report card for all representatives in that district.
 * Runs vote-finance, finance-jurisdiction, vote-prediction, and influence-chain
 * analyzers in parallel for each representative.
 *
 * POST /api/intelligence/address/money-report  (street/city/state address)
 * GET  /api/intelligence/address/money-report?zip=20001  (ZIP fallback)
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { CensusGeocoderService } from '@/services/geocoding/census-geocoder.service';
import { getAllDistrictsForZip } from '@/lib/data/zip-district-mapping-119th';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { confidenceScore, mean } from '@/lib/intelligence/statistics/civic-stats';
import { generateInsightNarrative, withTimeout } from '@/lib/intelligence/analyzers/shared';
import type {
  MoneyReportCardInsight,
  RepMoneyMetrics,
  DistrictAggregates,
} from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

const CACHE_TTL_SECONDS = 86400; // 24 hours
const ANALYZER_TIMEOUT_MS = 30_000;
const OVERALL_TIMEOUT_MS = 90_000;

const DISCLAIMER =
  'This report card uses public data from FEC, Congress.gov, and Senate lobbying disclosures. ' +
  'Campaign contributions are legal. Correlation between donations and voting does not indicate ' +
  'causation or improper behavior.';

// ── Types ────────────────────────────────────────────────────────────

interface MoneyReportRequest {
  street: string;
  city: string;
  state: string;
  zip?: string;
}

interface ResolvedDistrict {
  state: string;
  district: string;
  multiDistrict: boolean;
}

type MoneyReportResponse = MoneyReportCardInsight | { error: string };

// ── Shared Pipeline ──────────────────────────────────────────────────

/**
 * Run all four analyzers for a single representative in parallel.
 * Each analyzer is individually timeout-wrapped; failures yield null metrics.
 */
async function analyzeRepresentative(
  bioguideId: string,
  name: string,
  party: string,
  chamber: 'House' | 'Senate',
  state: string
): Promise<RepMoneyMetrics> {
  const [vfResult, fjResult, vpResult, icResult] = await Promise.allSettled([
    withTimeout(analyzeVoteFinance(bioguideId), ANALYZER_TIMEOUT_MS, `VoteFinance:${bioguideId}`),
    withTimeout(
      analyzeFinanceJurisdiction(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `FinanceJurisdiction:${bioguideId}`
    ),
    withTimeout(
      analyzeVotePrediction(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `VotePrediction:${bioguideId}`
    ),
    withTimeout(
      analyzeInfluenceChains(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `InfluenceChains:${bioguideId}`
    ),
  ]);

  return {
    bioguideId,
    name,
    party,
    chamber,
    state,
    voteFinanceCorrelation:
      vfResult.status === 'fulfilled' ? (vfResult.value?.overallCorrelation ?? null) : null,
    financeJurisdictionOverlap:
      fjResult.status === 'fulfilled' ? (fjResult.value?.overlapScore ?? null) : null,
    independenceScore:
      vpResult.status === 'fulfilled' ? (vpResult.value?.independenceScore?.score ?? null) : null,
    influenceChainCount:
      icResult.status === 'fulfilled' ? (icResult.value?.chains?.length ?? 0) : 0,
  };
}

/**
 * Compute district-level aggregates from per-representative metrics.
 */
function computeAggregates(reps: RepMoneyMetrics[]): DistrictAggregates {
  const correlations = reps
    .map(r => r.voteFinanceCorrelation)
    .filter((v): v is number => v !== null);
  const overlaps = reps.filter(
    (r): r is RepMoneyMetrics & { financeJurisdictionOverlap: number } =>
      r.financeJurisdictionOverlap !== null
  );
  const independence = reps.filter(
    (r): r is RepMoneyMetrics & { independenceScore: number } => r.independenceScore !== null
  );

  const sortedOverlaps = [...overlaps].sort(
    (a, b) => b.financeJurisdictionOverlap - a.financeJurisdictionOverlap
  );
  const sortedIndependence = [...independence].sort(
    (a, b) => b.independenceScore - a.independenceScore
  );

  return {
    averageCorrelation: correlations.length > 0 ? mean(correlations) : null,
    highestOverlap: sortedOverlaps[0]
      ? { name: sortedOverlaps[0].name, value: sortedOverlaps[0].financeJurisdictionOverlap }
      : null,
    lowestOverlap:
      sortedOverlaps.length > 0
        ? {
            name: sortedOverlaps[sortedOverlaps.length - 1]!.name,
            value: sortedOverlaps[sortedOverlaps.length - 1]!.financeJurisdictionOverlap,
          }
        : null,
    mostIndependent: sortedIndependence[0]
      ? { name: sortedIndependence[0].name, value: sortedIndependence[0].independenceScore }
      : null,
    leastIndependent:
      sortedIndependence.length > 0
        ? {
            name: sortedIndependence[sortedIndependence.length - 1]!.name,
            value: sortedIndependence[sortedIndependence.length - 1]!.independenceScore,
          }
        : null,
  };
}

/**
 * Build the full money report card for a resolved district.
 */
async function buildMoneyReport(resolved: ResolvedDistrict): Promise<MoneyReportCardInsight> {
  const { state, district, multiDistrict } = resolved;
  const cacheKey = `insight:money_report:${state}:${district}`;
  const cache = getRedisCache();

  // Check cache
  const cached = await cache.get<MoneyReportCardInsight>(cacheKey);
  if (cached) {
    logger.info('[MoneyReport] Cache hit', { state, district });
    return cached;
  }

  // Find all reps for this district
  const allReps = await RepresentativesCoreService.getAllRepresentatives();
  const stateUpper = state.toUpperCase();

  const districtReps = allReps.filter(rep => {
    if (rep.state !== stateUpper) return false;
    // Senate reps represent the whole state
    if (rep.chamber === 'Senate') return true;
    // House reps must match the district
    return rep.chamber === 'House' && rep.district === district;
  });

  if (districtReps.length === 0) {
    logger.warn('[MoneyReport] No representatives found', { state, district });
  }

  // Run analyzers for all reps in parallel
  const representatives = await Promise.all(
    districtReps.map(rep =>
      analyzeRepresentative(
        rep.bioguideId,
        rep.name,
        rep.party,
        rep.chamber as 'House' | 'Senate',
        rep.state
      )
    )
  );

  const aggregates = computeAggregates(representatives);

  // Build statistical fallback narrative
  const repSummaries = representatives
    .map(r => {
      const parts: string[] = [`${r.name} (${r.party}-${r.state})`];
      if (r.voteFinanceCorrelation !== null) {
        parts.push(`vote-finance correlation: ${(r.voteFinanceCorrelation * 100).toFixed(0)}%`);
      }
      if (r.financeJurisdictionOverlap !== null) {
        parts.push(`jurisdiction overlap: ${(r.financeJurisdictionOverlap * 100).toFixed(0)}%`);
      }
      if (r.independenceScore !== null) {
        parts.push(`independence score: ${(r.independenceScore * 100).toFixed(0)}%`);
      }
      if (r.influenceChainCount > 0) {
        parts.push(`${r.influenceChainCount} influence chains detected`);
      }
      return parts.join(', ');
    })
    .join('. ');

  const statisticalFallback =
    representatives.length > 0
      ? `Money report for ${stateUpper} district ${district}: ${repSummaries}.`
      : `No representatives found for ${stateUpper} district ${district}.`;

  const { narrative, source } = await generateInsightNarrative(
    'You are a civic data analyst summarizing a money report card for a congressional district. ' +
      'Use plain language. Never claim causation. ',
    `District ${stateUpper}-${district} has ${representatives.length} representatives. ` +
      repSummaries +
      ` Average vote-finance correlation: ${aggregates.averageCorrelation !== null ? (aggregates.averageCorrelation * 100).toFixed(0) + '%' : 'unavailable'}.`,
    statisticalFallback,
    '[MoneyReport]'
  );

  // Compute overall confidence
  const dataPoints = representatives.reduce((count, r) => {
    let c = count;
    if (r.voteFinanceCorrelation !== null) c++;
    if (r.financeJurisdictionOverlap !== null) c++;
    if (r.independenceScore !== null) c++;
    return c;
  }, 0);
  const maxDataPoints = representatives.length * 3;

  const confidence = confidenceScore({
    sampleSize: representatives.length,
    minimumSampleSize: 1,
    dataCompleteness: maxDataPoints > 0 ? dataPoints / maxDataPoints : 0,
    peerCount: representatives.length,
  });

  const insight: MoneyReportCardInsight = {
    state: stateUpper,
    district,
    multiDistrict,
    representatives,
    aggregates,
    narrative,
    confidence,
    dataAsOf: new Date().toISOString(),
    methodology:
      'Aggregates vote-finance correlation, finance-jurisdiction overlap, ML independence score, ' +
      'and influence chain analysis for each representative in the district.',
    disclaimer: DISCLAIMER,
    lastAnalyzedAt: new Date().toISOString(),
    source,
  };

  // Cache the result
  await cache.set(cacheKey, insight, CACHE_TTL_SECONDS).catch(err => {
    logger.warn('[MoneyReport] Cache write failed', { error: (err as Error).message });
  });

  return insight;
}

// ── POST: Address Resolution ─────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse<MoneyReportResponse>> {
  try {
    const body = (await request.json()) as Partial<MoneyReportRequest>;

    if (!body.street || !body.city || !body.state) {
      return NextResponse.json({ error: 'street, city, and state are required' }, { status: 400 });
    }

    logger.info('[MoneyReport] POST address resolution', {
      city: body.city,
      state: body.state,
    });

    const geocodeResult = await withTimeout(
      CensusGeocoderService.geocodeAddress({
        street: body.street,
        city: body.city,
        state: body.state,
        zip: body.zip,
      }),
      15_000,
      'CensusGeocode'
    );

    if (!geocodeResult.congressionalDistrict) {
      return NextResponse.json(
        { error: 'Could not resolve congressional district for this address' },
        { status: 404 }
      );
    }

    const resolved: ResolvedDistrict = {
      state: body.state.toUpperCase(),
      district: geocodeResult.congressionalDistrict.number,
      multiDistrict: false,
    };

    const insight = await withTimeout(
      buildMoneyReport(resolved),
      OVERALL_TIMEOUT_MS,
      'MoneyReportPipeline'
    );

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[MoneyReport] POST error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── GET: ZIP Code Fallback ───────────────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse<MoneyReportResponse>> {
  try {
    const zip = request.nextUrl.searchParams.get('zip');

    if (!zip || !/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { error: 'A valid 5-digit zip query parameter is required' },
        { status: 400 }
      );
    }

    logger.info('[MoneyReport] GET zip resolution', { zip });

    const districts = getAllDistrictsForZip(zip);

    if (districts.length === 0) {
      return NextResponse.json(
        { error: `No congressional district found for ZIP ${zip}` },
        { status: 404 }
      );
    }

    const multiDistrict = districts.length > 1;
    const primary = districts.find(d => d.primary) ?? districts[0]!;

    const resolved: ResolvedDistrict = {
      state: primary.state.toUpperCase(),
      district: primary.district,
      multiDistrict,
    };

    const insight = await withTimeout(
      buildMoneyReport(resolved),
      OVERALL_TIMEOUT_MS,
      'MoneyReportPipeline'
    );

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[MoneyReport] GET error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

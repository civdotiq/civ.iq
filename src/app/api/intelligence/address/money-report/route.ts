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
import { analyzeVoteFinanceWithReason } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { analyzeFinanceJurisdictionWithReason } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeVotePredictionWithReason } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { confidenceScore, mean } from '@/lib/intelligence/statistics/civic-stats';
import {
  generateInsightNarrative,
  withTimeout,
  SENATE_UPSTREAM_BLOCKED_REASON,
} from '@/lib/intelligence/analyzers/shared';
import type {
  MoneyReportCardInsight,
  RepMoneyMetrics,
  DistrictAggregates,
  InsightError,
  MetricStatus,
} from '@/lib/intelligence/types';
import { ZIP_ACCURACY_NOTE } from '@/lib/backbone/zip-accuracy';
import type { SourceStatus } from '@/types/backbone-response';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

// ADDITIVE BackboneResponse fields (geocode precedent, decision 2026-07-05):
// this route is publicly documented in openapi.json, so the existing payload
// stays top-level and dataQuality/sourceStatus are added alongside it.
function sourceStatusOf(
  source: string,
  status: SourceStatus['status'],
  errorMessage?: string
): SourceStatus {
  return {
    source,
    status,
    ...(errorMessage ? { errorMessage } : {}),
    fetchedAt: new Date().toISOString(),
  };
}

function pipelineSourceStatus(errors: InsightError[]): SourceStatus {
  return sourceStatusOf(
    'intelligence-pipeline',
    errors.length > 0 ? 'error' : 'ok',
    errors.length > 0 ? `${errors.length} analyzer error(s)` : undefined
  );
}

const CACHE_TTL_SECONDS = 86400; // 24 hours
// Plan reference: PLAN-money-report-restoration-2026-04.md (MR3)
// Budget: vote-finance cold (post-MR2) ≤50s; other analyzers ≤30s. Overall
// request must fit the Vercel Pro 120s cap with coordination + narrative headroom.
const ANALYZER_TIMEOUT_MS = 55_000; // matches shared analyzer default; vote-finance is the bottleneck
const OVERALL_TIMEOUT_MS = 110_000; // 10s headroom under the 120s Vercel cap

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

interface RepAnalysis {
  metrics: RepMoneyMetrics;
  errors: InsightError[];
}

interface MoneyReportBuild {
  insight: MoneyReportCardInsight;
  errors: InsightError[];
}

// ── Shared Pipeline ──────────────────────────────────────────────────

/**
 * Classify a PromiseSettledResult rejection reason. Errors raised by
 * `withTimeout` always contain the substring "timed out"; anything else is
 * treated as a generic upstream error.
 */
function errorForRejection(
  result: PromiseSettledResult<unknown>,
  metric: string,
  source: string,
  bioguideId: string
): InsightError | null {
  if (result.status !== 'rejected') return null;
  const message =
    result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown');
  const isTimeout = /timed out/i.test(message);
  return {
    source,
    type: isTimeout ? 'upstream_timeout' : 'upstream_error',
    message,
    timestamp: new Date().toISOString(),
    metric,
    bioguideId,
  };
}

/**
 * Run all four analyzers for a single representative in parallel.
 * Each analyzer is individually timeout-wrapped; failures yield null metrics
 * AND a structured per-metric `InsightError` entry so downstream callers can
 * surface honest "unavailable" states (per `PLAN-money-report-restoration-2026-04.md` MR3).
 * Must remain `Promise.allSettled` — `Promise.all` would reject the whole rep
 * on a single analyzer timeout.
 */
async function analyzeRepresentative(
  bioguideId: string,
  name: string,
  party: string,
  chamber: 'House' | 'Senate',
  state: string
): Promise<RepAnalysis> {
  const [vfResult, fjResult, vpResult, icResult] = await Promise.allSettled([
    withTimeout(
      analyzeVoteFinanceWithReason(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `VoteFinance:${bioguideId}`
    ),
    withTimeout(
      analyzeFinanceJurisdictionWithReason(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `FinanceJurisdiction:${bioguideId}`
    ),
    withTimeout(
      analyzeVotePredictionWithReason(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `VotePrediction:${bioguideId}`
    ),
    withTimeout(
      analyzeInfluenceChains(bioguideId),
      ANALYZER_TIMEOUT_MS,
      `InfluenceChains:${bioguideId}`
    ),
  ]);

  const errors: InsightError[] = [];
  const vfError = errorForRejection(vfResult, 'voteFinance', 'vote-finance', bioguideId);
  if (vfError) errors.push(vfError);
  const fjError = errorForRejection(
    fjResult,
    'financeJurisdiction',
    'finance-jurisdiction',
    bioguideId
  );
  if (fjError) errors.push(fjError);
  const vpError = errorForRejection(vpResult, 'independence', 'vote-prediction', bioguideId);
  if (vpError) errors.push(vpError);
  const icError = errorForRejection(icResult, 'influenceChainCount', 'influence-chain', bioguideId);
  if (icError) errors.push(icError);

  const voteFinance = toMetricStatus(
    vfResult,
    outcome => outcome.insight?.overallCorrelation ?? null
  );
  const financeJurisdiction = toMetricStatus(
    fjResult,
    outcome => outcome.insight?.overlapScore ?? null
  );
  const independence = toMetricStatus(
    vpResult,
    outcome => outcome.insight?.independenceScore?.score ?? null
  );

  const metrics: RepMoneyMetrics = {
    bioguideId,
    name,
    party,
    chamber,
    state,
    voteFinance,
    financeJurisdiction,
    independence,
    influenceChainCount:
      icResult.status === 'fulfilled' ? (icResult.value?.chains?.length ?? 0) : 0,
  };

  return { metrics, errors };
}

/**
 * Collapse a settled analyzer outcome into a honest per-metric UI state.
 *
 *  - rejected → `unavailable` (orchestrator-level timeout or analyzer error)
 *  - fulfilled + numeric value → `ready`
 *  - fulfilled + null + unavailableReason → `insufficient-data` (analyzer
 *    ran but the rep genuinely lacks enough data for a number)
 *  - fulfilled + null without reason → `unavailable` (defensive default)
 *
 * `computing` is emitted by the warm-cron path; from the request hot path we
 * never speculatively mark a metric as computing without a cache-side flag.
 */
function toMetricStatus<T>(
  result: PromiseSettledResult<{ insight: T | null; unavailableReason?: string }>,
  extract: (outcome: { insight: T | null; unavailableReason?: string }) => number | null
): MetricStatus {
  if (result.status === 'rejected') {
    const message =
      result.reason instanceof Error ? result.reason.message : String(result.reason ?? 'unknown');
    const isTimeout = /timed out/i.test(message);
    return { state: 'unavailable', reason: isTimeout ? 'timeout' : 'analyzer-error' };
  }

  const value = extract(result.value);
  if (value !== null) {
    return { state: 'ready', value };
  }

  if (result.value.unavailableReason) {
    // Senate-blocked reps are honestly `unavailable` (we can't fetch the data),
    // not `insufficient-data` (which implies the rep just hasn't accumulated
    // enough records). Match on the exact sentinel from shared.ts so the UI
    // shows the amber "Unavailable" state with the upstream-block reason.
    if (result.value.unavailableReason === SENATE_UPSTREAM_BLOCKED_REASON) {
      return { state: 'unavailable', reason: result.value.unavailableReason };
    }
    return { state: 'insufficient-data', reason: result.value.unavailableReason };
  }

  return { state: 'unavailable', reason: 'analyzer-error' };
}

/** Ready-state numeric value of a metric, else null. */
function metricValue(status: MetricStatus): number | null {
  return status.state === 'ready' ? status.value : null;
}

/**
 * Compute district-level aggregates from per-representative metrics.
 */
function computeAggregates(reps: RepMoneyMetrics[]): DistrictAggregates {
  const correlations = reps
    .map(r => metricValue(r.voteFinance))
    .filter((v): v is number => v !== null);

  const overlaps = reps
    .map(r => ({ name: r.name, value: metricValue(r.financeJurisdiction) }))
    .filter((o): o is { name: string; value: number } => o.value !== null)
    .sort((a, b) => b.value - a.value);

  const independence = reps
    .map(r => ({ name: r.name, value: metricValue(r.independence) }))
    .filter((o): o is { name: string; value: number } => o.value !== null)
    .sort((a, b) => b.value - a.value);

  return {
    averageCorrelation: correlations.length > 0 ? mean(correlations) : null,
    highestOverlap: overlaps[0] ?? null,
    lowestOverlap: overlaps.length > 0 ? overlaps[overlaps.length - 1]! : null,
    mostIndependent: independence[0] ?? null,
    leastIndependent: independence.length > 0 ? independence[independence.length - 1]! : null,
  };
}

/**
 * Build the full money report card for a resolved district.
 */
async function buildMoneyReport(resolved: ResolvedDistrict): Promise<MoneyReportBuild> {
  const { state, district, multiDistrict } = resolved;
  const cacheKey = `insight:money_report:${state}:${district}`;
  const cache = getRedisCache();

  // Check cache
  const cached = await cache.get<MoneyReportCardInsight>(cacheKey);
  if (cached) {
    logger.info('[MoneyReport] Cache hit', { state, district });
    return { insight: cached, errors: [] };
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
  const analyses = await Promise.all(
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

  const representatives = analyses.map(a => a.metrics);
  const errors = analyses.flatMap(a => a.errors);

  const aggregates = computeAggregates(representatives);

  // Build statistical fallback narrative
  const repSummaries = representatives
    .map(r => {
      const parts: string[] = [`${r.name} (${r.party}-${r.state})`];
      const voteFinance = metricValue(r.voteFinance);
      if (voteFinance !== null) {
        parts.push(`vote-finance correlation: ${(voteFinance * 100).toFixed(0)}%`);
      }
      const overlap = metricValue(r.financeJurisdiction);
      if (overlap !== null) {
        parts.push(`jurisdiction overlap: ${(overlap * 100).toFixed(0)}%`);
      }
      const independence = metricValue(r.independence);
      if (independence !== null) {
        parts.push(`independence score: ${(independence * 100).toFixed(0)}%`);
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
    if (metricValue(r.voteFinance) !== null) c++;
    if (metricValue(r.financeJurisdiction) !== null) c++;
    if (metricValue(r.independence) !== null) c++;
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

  return { insight, errors };
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
        {
          error: 'Could not resolve congressional district for this address',
          errors: [] as InsightError[],
          status: 'unavailable' as const,
          dataQuality: 'empty' as const,
          sourceStatus: [
            sourceStatusOf('census-geocoder', 'ok', 'No district matched this address'),
          ],
        },
        { status: 404 }
      );
    }

    const resolved: ResolvedDistrict = {
      state: body.state.toUpperCase(),
      district: geocodeResult.congressionalDistrict.number,
      multiDistrict: false,
    };

    const { insight, errors } = await withTimeout(
      buildMoneyReport(resolved),
      OVERALL_TIMEOUT_MS,
      'MoneyReportPipeline'
    );

    return NextResponse.json(
      {
        ...insight,
        errors,
        status: 'complete' as const,
        // Address input is authoritative; analyzer errors degrade to partial
        dataQuality: (errors.length > 0 ? 'partial' : 'complete') as 'partial' | 'complete',
        sourceStatus: [sourceStatusOf('census-geocoder', 'ok'), pipelineSourceStatus(errors)],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
        },
      }
    );
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
        {
          error: `No congressional district found for ZIP ${zip}`,
          errors: [] as InsightError[],
          status: 'unavailable' as const,
          dataQuality: 'empty' as const,
          sourceStatus: [
            sourceStatusOf('zip-district-mapping', 'ok', 'ZIP not mapped to any district'),
          ],
        },
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

    const { insight, errors } = await withTimeout(
      buildMoneyReport(resolved),
      OVERALL_TIMEOUT_MS,
      'MoneyReportPipeline'
    );

    return NextResponse.json(
      {
        ...insight,
        accuracyNote: ZIP_ACCURACY_NOTE,
        errors,
        // ZIP input is approximate — never 'complete'
        status: 'partial' as const,
        dataQuality: 'partial' as const,
        sourceStatus: [sourceStatusOf('zip-district-mapping', 'ok'), pipelineSourceStatus(errors)],
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[MoneyReport] GET error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

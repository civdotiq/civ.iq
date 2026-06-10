/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getInsightStats, ANALYZER_NAMES } from '@/lib/analytics/insight-tracker';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10);
    const startDate =
      searchParams.get('startDate') ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const stats = await getInsightStats(startDate, endDate);

    let totalRuns = 0,
      totalSuccesses = 0,
      totalFailures = 0,
      totalTimeouts = 0;
    let totalInsufficientData = 0,
      totalCacheHits = 0,
      totalAiNarratives = 0,
      totalStatFallbacks = 0;
    let confidenceSumScaled = 0,
      confidenceCount = 0,
      latencySumMs = 0,
      latencyCount = 0;

    for (const day of stats) {
      totalRuns += day.totals.runs;
      totalSuccesses += day.totals.successes;
      totalFailures += day.totals.failures;
      totalTimeouts += day.totals.timeouts;
      totalInsufficientData += day.totals.insufficientData;
      totalCacheHits += day.totals.cacheHits;
      totalAiNarratives += day.totals.aiNarratives;
      totalStatFallbacks += day.totals.statFallbacks;
      if (day.totals.avgConfidence > 0) {
        confidenceSumScaled += day.totals.avgConfidence * day.totals.successes;
        confidenceCount += day.totals.successes;
      }
      if (day.totals.avgLatencyMs > 0) {
        latencySumMs += day.totals.avgLatencyMs * day.totals.successes;
        latencyCount += day.totals.successes;
      }
    }

    const totalNarratives = totalAiNarratives + totalStatFallbacks;

    return NextResponse.json({
      dateRange: { startDate, endDate },
      daily: stats,
      aggregate: {
        totalRuns,
        totalCacheHits,
        successRate: totalRuns > 0 ? Math.round((totalSuccesses / totalRuns) * 100) : 0,
        failureRate: totalRuns > 0 ? Math.round((totalFailures / totalRuns) * 100) : 0,
        timeoutRate: totalRuns > 0 ? Math.round((totalTimeouts / totalRuns) * 100) : 0,
        insufficientDataRate:
          totalRuns > 0 ? Math.round((totalInsufficientData / totalRuns) * 100) : 0,
        avgConfidence:
          confidenceCount > 0 ? Math.round((confidenceSumScaled / confidenceCount) * 100) / 100 : 0,
        aiNarrativeRate:
          totalNarratives > 0 ? Math.round((totalAiNarratives / totalNarratives) * 100) : 0,
        avgLatencyMs: latencyCount > 0 ? Math.round(latencySumMs / latencyCount) : 0,
      },
      analyzers: ANALYZER_NAMES,
      metadata: { endpoint: '/api/analytics/insights', generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    logger.error('Insight analytics failed', error as Error, { operation: 'insight_analytics' });
    // 503 with an explicit error envelope — never fabricated zero aggregates
    return NextResponse.json(
      {
        error: 'Failed to load insight analytics',
        metadata: {
          endpoint: '/api/analytics/insights',
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

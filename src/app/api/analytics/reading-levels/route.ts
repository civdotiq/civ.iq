/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/analytics/reading-levels
 *
 * Returns reading level distribution over a date range.
 * Shows whether the system meets its 8th-grade commitment.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReadingLevelStats } from '@/lib/analytics/reading-level-tracker';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    // Default: last 30 days
    const endDate = searchParams.get('endDate') ?? new Date().toISOString().slice(0, 10);
    const startDate =
      searchParams.get('startDate') ??
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const stats = await getReadingLevelStats(startDate, endDate);

    // Compute aggregate
    let totalSummaries = 0;
    let totalPassCount = 0;
    let weightedGradeSum = 0;
    let fleschEaseSum = 0;
    let fleschEaseDays = 0;
    let fleschPassSum = 0;

    for (const day of stats) {
      totalSummaries += day.total;
      totalPassCount += Math.round((day.passRate / 100) * day.total);
      weightedGradeSum += day.avgGrade * day.total;
      if (day.avgFleschEase > 0) {
        fleschEaseSum += day.avgFleschEase * day.total;
        fleschEaseDays += day.total;
        fleschPassSum += Math.round((day.fleschEasePassRate / 100) * day.total);
      }
    }

    return NextResponse.json({
      dateRange: { startDate, endDate },
      daily: stats,
      aggregate: {
        totalSummaries,
        avgGradeLevel:
          totalSummaries > 0 ? Math.round((weightedGradeSum / totalSummaries) * 10) / 10 : 0,
        passRate: totalSummaries > 0 ? Math.round((totalPassCount / totalSummaries) * 100) : 0,
        targetGrade: 8,
        avgFleschEase:
          fleschEaseDays > 0 ? Math.round((fleschEaseSum / fleschEaseDays) * 10) / 10 : 0,
        fleschEasePassRate:
          fleschEaseDays > 0 ? Math.round((fleschPassSum / fleschEaseDays) * 100) : 0,
        fleschEaseTarget: 60,
      },
      metadata: {
        endpoint: '/api/analytics/reading-levels',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Reading level analytics failed', error as Error, {
      operation: 'reading_level_analytics',
    });

    return NextResponse.json(
      {
        dateRange: { startDate: '', endDate: '' },
        daily: [],
        aggregate: {
          totalSummaries: 0,
          avgGradeLevel: 0,
          passRate: 0,
          targetGrade: 8,
          avgFleschEase: 0,
          fleschEasePassRate: 0,
          fleschEaseTarget: 60,
        },
        metadata: {
          endpoint: '/api/analytics/reading-levels',
          generatedAt: new Date().toISOString(),
          error: 'Failed to load reading level analytics',
        },
      },
      { status: 200 }
    );
  }
}

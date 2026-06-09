/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fbiUcrService } from '@/lib/data-sources/fbi-ucr-service';
import logger from '@/lib/logging/simple-logger';

export const revalidate = 86400; // 24 hours

/**
 * Crime statistics for a U.S. state.
 *
 * Returns FBI UCR crime rates, national comparison, clearance rates, and trends.
 *
 * @example GET /api/states/CA/crime
 * @example GET /api/states/CA/crime?year=2022
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;
  const yearParam = request.nextUrl.searchParams.get('year');
  const year = yearParam ? parseInt(yearParam, 10) : undefined;

  if (!state || typeof state !== 'string' || state.length !== 2) {
    return NextResponse.json(
      { error: 'Two-letter state abbreviation is required' },
      { status: 400 }
    );
  }

  // parseInt('abc') is NaN, which silently passes range math downstream
  if (year !== undefined && (!Number.isFinite(year) || year < 1985 || year > 2030)) {
    return NextResponse.json(
      { error: 'year must be a four-digit year between 1985 and 2030' },
      { status: 400 }
    );
  }

  const stateCode = state.toUpperCase();

  try {
    const [crimeStats, violentTrend, propertyTrend] = await Promise.all([
      fbiUcrService.getCrimeStatsByState(stateCode, year).catch(e => {
        logger.error('FBI crime stats fetch failed', e as Error, { state: stateCode });
        return null;
      }),
      fbiUcrService
        .getCrimeTrend(stateCode, (year ?? 2023) - 4, year ?? 2023, 'violent-crime')
        .catch(e => {
          logger.error('FBI violent crime trend fetch failed', e as Error, { state: stateCode });
          return [];
        }),
      fbiUcrService
        .getCrimeTrend(stateCode, (year ?? 2023) - 4, year ?? 2023, 'property-crime')
        .catch(e => {
          logger.error('FBI property crime trend fetch failed', e as Error, { state: stateCode });
          return [];
        }),
    ]);

    if (!crimeStats) {
      return NextResponse.json(
        { error: 'Crime data not available. DATA_GOV_API_KEY may not be configured.' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        state: stateCode,
        crimeStats,
        trends: {
          violent: violentTrend,
          property: propertyTrend,
        },
        dataSource: 'FBI Crime Data Explorer (UCR)',
        generatedAt: new Date().toISOString(),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    logger.error('Crime data error', error as Error, { state: stateCode });
    return NextResponse.json({ error: 'Failed to fetch crime data' }, { status: 500 });
  }
}

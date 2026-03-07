/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fredEconomicService } from '@/lib/data-sources/fred-economic-service';
import logger from '@/lib/logging/simple-logger';
import type { EconomicIndicatorsResponse } from '@/types/fred';

export const revalidate = 21600; // 6 hours

/**
 * Get economic indicators for a congressional district's state.
 *
 * Returns unemployment, GDP, personal income, and labor force data
 * from FRED (Federal Reserve Economic Data).
 *
 * @example
 * GET /api/district/NY-14/economic-indicators
 * GET /api/district/CA-12/economic-indicators
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;

  logger.info('Economic indicators request', { districtId });

  try {
    if (!districtId) {
      return NextResponse.json({ error: 'District ID is required' }, { status: 400 });
    }

    // Extract state abbreviation from district ID (e.g., "NY-14" → "NY")
    const stateMatch = districtId.match(/^([A-Z]{2})/i);
    if (!stateMatch?.[1]) {
      return NextResponse.json(
        { error: 'Invalid district ID format. Expected format: ST-NN (e.g., NY-14)' },
        { status: 400 }
      );
    }

    const stateAbbrev = stateMatch[1].toUpperCase();
    const apiKey = process.env.FRED_API_KEY;

    if (!apiKey) {
      const response: EconomicIndicatorsResponse = {
        success: true,
        state: stateAbbrev,
        indicators: [],
        metadata: {
          dataSource: 'fred',
          generatedAt: new Date().toISOString(),
          fredApiAvailable: false,
        },
      };

      return NextResponse.json(response, {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      });
    }

    const indicators = await fredEconomicService.getStateIndicators(stateAbbrev);

    const response: EconomicIndicatorsResponse = {
      success: true,
      state: stateAbbrev,
      indicators,
      metadata: {
        dataSource: 'fred',
        generatedAt: new Date().toISOString(),
        fredApiAvailable: true,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Economic indicators request failed', error as Error, { districtId });

    return NextResponse.json(
      {
        success: false,
        state: '',
        indicators: [],
        metadata: {
          dataSource: 'fred',
          generatedAt: new Date().toISOString(),
          fredApiAvailable: false,
        },
        error: errorMessage,
      } satisfies EconomicIndicatorsResponse,
      { status: 500 }
    );
  }
}

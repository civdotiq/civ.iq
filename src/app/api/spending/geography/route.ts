/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  GeographicSpendingResponse,
  GeographicSpendingResult,
  USASpendingGeographyResponse,
} from '@/types/spending';

// ISR: Revalidate every 24 hours (aggregate data changes less frequently)
export const revalidate = 86400;
export const dynamic = 'force-dynamic';

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

type GeoLayer = 'state' | 'county' | 'district';
type Scope = 'place_of_performance' | 'recipient_location';

/**
 * Transform USAspending geography result
 */
function transformResult(
  result: USASpendingGeographyResponse['results'][0]
): GeographicSpendingResult {
  return {
    shapeCode: result.shape_code,
    displayName: result.display_name,
    aggregatedAmount: result.aggregated_amount,
    population: result.population ?? null,
    perCapita: result.per_capita ?? null,
  };
}

/**
 * Fetch geographic spending data
 */
async function fetchGeographicSpending(
  geoLayer: GeoLayer,
  scope: Scope,
  fiscalYear: number
): Promise<GeographicSpendingResult[]> {
  const startDate = `${fiscalYear - 1}-10-01`;
  const endDate = `${fiscalYear}-09-30`;

  const requestBody = {
    scope,
    geo_layer: geoLayer,
    filters: {
      time_period: [{ start_date: startDate, end_date: endDate }],
    },
  };

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_geography/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      logger.error('USAspending geography API error', new Error(`HTTP ${response.status}`));
      return [];
    }

    const data: USASpendingGeographyResponse = await response.json();
    return data.results.map(transformResult);
  } catch (error) {
    logger.error('Error fetching geographic spending', error as Error);
    return [];
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<GeographicSpendingResponse>> {
  try {
    const { searchParams } = request.nextUrl;

    const geoLayerParam = searchParams.get('geo_layer') ?? 'district';
    const scopeParam = searchParams.get('scope') ?? 'place_of_performance';
    const fiscalYear = parseInt(
      searchParams.get('fiscal_year') ?? String(new Date().getFullYear())
    );

    // Validate geo_layer
    const validGeoLayers: GeoLayer[] = ['state', 'county', 'district'];
    const geoLayer: GeoLayer = validGeoLayers.includes(geoLayerParam as GeoLayer)
      ? (geoLayerParam as GeoLayer)
      : 'district';

    // Validate scope
    const validScopes: Scope[] = ['place_of_performance', 'recipient_location'];
    const scope: Scope = validScopes.includes(scopeParam as Scope)
      ? (scopeParam as Scope)
      : 'place_of_performance';

    const cacheKey = `spending-geography-${geoLayer}-${scope}-${fiscalYear}`;

    logger.info('Geographic spending API request', { geoLayer, scope, fiscalYear });

    const results = await cachedFetch(
      cacheKey,
      async () => fetchGeographicSpending(geoLayer, scope, fiscalYear),
      24 * 60 * 60 * 1000 // 24 hour cache
    );

    return NextResponse.json(
      {
        success: true,
        scope,
        geoLayer,
        fiscalYear,
        results,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'usaspending.gov',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Geographic spending API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        scope: 'place_of_performance',
        geoLayer: 'district',
        fiscalYear: new Date().getFullYear(),
        results: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'usaspending.gov',
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Recent legislation for a pilot city, fetched from Legistar /Matters.
 *
 * Mirrors src/app/api/city/[cityId]/council/route.ts: cachedFetch with
 * a 24h TTL, CITY_CONFIGS validation, force-dynamic, real-data-or-
 * empty-array semantics. No fabricated data.
 *
 * Vote totals are NOT returned because /Matters does not include roll-
 * call vote tallies; a per-matter VoteHistory follow-up would be 30+
 * extra requests per page render (out of scope).
 *
 * Query params:
 *   ?days=60   trailing window (default 60). Pass 0 to disable filter.
 *   ?top=20    response size (default 20, capped at 50).
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { CITY_CONFIGS } from '@/lib/local-government/pilot-cities';
import type {
  CityLegislation,
  CityLegislationResponse,
  LegistarCityConfig,
  LegistarMatter,
} from '@/types/legistar';

export const dynamic = 'force-dynamic';

const DEFAULT_DAYS = 60;
const DEFAULT_TOP = 20;
const MAX_TOP = 50;
const CACHE_TTL_SECONDS = 24 * 60 * 60;

function transformMatter(record: LegistarMatter): CityLegislation {
  return {
    id: record.MatterId,
    fileNumber: record.MatterFile,
    title: record.MatterTitle,
    type: record.MatterTypeName,
    status: record.MatterStatusName,
    body: record.MatterBodyName,
    introducedDate: record.MatterIntroDate,
    passedDate: record.MatterPassedDate,
    enactedDate: record.MatterEnactmentDate,
    enactmentNumber: record.MatterEnactmentNumber,
  };
}

async function fetchRecentLegislation(
  cityConfig: LegistarCityConfig,
  days: number,
  top: number
): Promise<CityLegislation[]> {
  const baseUrl = `https://webapi.legistar.com/v1/${cityConfig.apiClient}`;
  const filters: string[] = [];

  if (days > 0) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    filters.push(`MatterIntroDate ge datetime'${since}'`);
  }

  const params: string[] = [`$orderby=MatterIntroDate desc`, `$top=${top}`];
  if (filters.length > 0) {
    params.push(`$filter=${encodeURIComponent(filters.join(' and '))}`);
  }
  const url = `${baseUrl}/Matters?${params.join('&')}`;

  logger.info('Fetching city legislation', {
    city: cityConfig.name,
    url: url.substring(0, 120),
  });

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) {
      logger.error('Legistar /Matters error', new Error(`HTTP ${response.status}`));
      return [];
    }

    const data: LegistarMatter[] = await response.json();
    return data.map(transformMatter);
  } catch (error) {
    logger.error('Error fetching city legislation', error as Error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
): Promise<NextResponse<CityLegislationResponse>> {
  try {
    const { cityId } = await params;
    const normalizedCityId = cityId.toLowerCase();
    const cityConfig = CITY_CONFIGS[normalizedCityId];

    if (!cityConfig) {
      const availableCities = Object.keys(CITY_CONFIGS).join(', ');
      return NextResponse.json(
        {
          success: false,
          city: { id: normalizedCityId, name: normalizedCityId, state: '' },
          legislation: [],
          pagination: { total: 0, pageSize: 0, skip: 0 },
          filters: {},
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSource: 'legistar.com',
          },
          error: `City not supported. Available cities: ${availableCities}`,
        },
        { status: 400 }
      );
    }

    const { searchParams } = request.nextUrl;
    const rawDays = parseInt(searchParams.get('days') ?? '', 10);
    const rawTop = parseInt(searchParams.get('top') ?? '', 10);
    const days = Number.isFinite(rawDays) && rawDays >= 0 ? rawDays : DEFAULT_DAYS;
    const top = Number.isFinite(rawTop) && rawTop > 0 ? Math.min(rawTop, MAX_TOP) : DEFAULT_TOP;

    const cacheKey = `legistar-legislation-${normalizedCityId}-d${days}-t${top}`;
    const legislation = await cachedFetch(
      cacheKey,
      async () => fetchRecentLegislation(cityConfig, days, top),
      CACHE_TTL_SECONDS
    );

    return NextResponse.json(
      {
        success: true,
        city: {
          id: cityConfig.id,
          name: cityConfig.name,
          state: cityConfig.state,
        },
        legislation,
        pagination: {
          total: legislation.length,
          pageSize: top,
          skip: 0,
        },
        filters: days > 0 ? { year: undefined } : {},
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'legistar.com',
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
    logger.error('City legislation API error', error as Error);
    return NextResponse.json(
      {
        success: false,
        city: { id: '', name: '', state: '' },
        legislation: [],
        pagination: { total: 0, pageSize: 0, skip: 0 },
        filters: {},
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'legistar.com',
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  CityCouncilResponse,
  CouncilMember,
  LegistarCityConfig,
  LegistarOfficeRecord,
} from '@/types/legistar';

// ISR: Revalidate every 24 hours (council membership changes infrequently)
export const revalidate = 86400;
export const dynamic = 'force-dynamic';

// Cities with open Legistar APIs (verified working without auth)
const CITY_CONFIGS: Record<string, LegistarCityConfig> = {
  chicago: {
    id: 'chicago',
    name: 'Chicago',
    state: 'IL',
    apiClient: 'chicago',
    population: 2746388,
  },
  seattle: {
    id: 'seattle',
    name: 'Seattle',
    state: 'WA',
    apiClient: 'seattle',
    population: 749256,
  },
  boston: {
    id: 'boston',
    name: 'Boston',
    state: 'MA',
    apiClient: 'boston',
    population: 675647,
  },
  denver: {
    id: 'denver',
    name: 'Denver',
    state: 'CO',
    apiClient: 'denver',
    population: 715522,
  },
  austin: {
    id: 'austin',
    name: 'Austin',
    state: 'TX',
    apiClient: 'austin',
    population: 978908,
  },
  portland: {
    id: 'portland',
    name: 'Portland',
    state: 'OR',
    apiClient: 'portland',
    population: 641162,
  },
  oakland: {
    id: 'oakland',
    name: 'Oakland',
    state: 'CA',
    apiClient: 'oakland',
    population: 433031,
  },
  minneapolis: {
    id: 'minneapolis',
    name: 'Minneapolis',
    state: 'MN',
    apiClient: 'minneapolis',
    population: 429954,
  },
  philadelphia: {
    id: 'philadelphia',
    name: 'Philadelphia',
    state: 'PA',
    apiClient: 'philacity',
    population: 1603797,
  },
  detroit: {
    id: 'detroit',
    name: 'Detroit',
    state: 'MI',
    apiClient: 'detroitmi',
    population: 639111,
  },
};

/**
 * Extract district from body name or title
 */
function extractDistrict(record: LegistarOfficeRecord): string | null {
  const bodyName = record.OfficeRecordBodyName ?? '';
  const title = record.OfficeRecordTitle ?? '';

  // Look for ward/district patterns
  const patterns = [/Ward\s*(\d+)/i, /District\s*(\d+)/i, /Position\s*(\d+)/i, /Seat\s*(\d+)/i];

  for (const pattern of patterns) {
    const bodyMatch = bodyName.match(pattern);
    if (bodyMatch) return bodyMatch[0];

    const titleMatch = title.match(pattern);
    if (titleMatch) return titleMatch[0];
  }

  return null;
}

/**
 * Transform Legistar office record to simplified council member
 */
function transformMember(record: LegistarOfficeRecord): CouncilMember {
  return {
    id: record.OfficeRecordPersonId,
    name: record.OfficeRecordFullName,
    firstName: record.OfficeRecordFirstName,
    lastName: record.OfficeRecordLastName,
    active: !record.OfficeRecordEndDate || new Date(record.OfficeRecordEndDate) > new Date(),
    title: record.OfficeRecordTitle,
    bodyName: record.OfficeRecordBodyName,
    district: extractDistrict(record),
    startDate: record.OfficeRecordStartDate,
    endDate: record.OfficeRecordEndDate,
    address: null, // Not in office record, would need person lookup
    city: null,
    state: null,
    zip: null,
    phone: null,
    email: record.OfficeRecordEmail,
    website: null,
  };
}

/**
 * Fetch city council members from Legistar API
 */
async function fetchCouncilMembers(
  cityConfig: LegistarCityConfig,
  activeOnly: boolean
): Promise<CouncilMember[]> {
  const baseUrl = `https://webapi.legistar.com/v1/${cityConfig.apiClient}`;

  try {
    // Fetch office records (current council positions)
    const filter = activeOnly
      ? "$filter=OfficeRecordEndDate eq null or OfficeRecordEndDate gt datetime'" +
        new Date().toISOString().split('T')[0] +
        "'"
      : '';

    const url = `${baseUrl}/OfficeRecords?${filter}&$orderby=OfficeRecordFullName`;

    logger.info('Fetching city council members', {
      city: cityConfig.name,
      url: url.substring(0, 100),
    });

    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
    });

    if (!response.ok) {
      logger.error('Legistar API error', new Error(`HTTP ${response.status}`));
      return [];
    }

    const data: LegistarOfficeRecord[] = await response.json();

    // Filter to council/aldermanic positions and deduplicate by person ID
    const councilKeywords = ['council', 'alderman', 'aldermanic', 'mayor', 'city council'];
    const seenPersonIds = new Set<number>();

    const members = data
      .filter(record => {
        const bodyName = record.OfficeRecordBodyName?.toLowerCase() ?? '';
        return councilKeywords.some(keyword => bodyName.includes(keyword));
      })
      .filter(record => {
        if (seenPersonIds.has(record.OfficeRecordPersonId)) {
          return false;
        }
        seenPersonIds.add(record.OfficeRecordPersonId);
        return true;
      })
      .map(transformMember);

    return members;
  } catch (error) {
    logger.error('Error fetching council members', error as Error);
    return [];
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
): Promise<NextResponse<CityCouncilResponse>> {
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
          members: [],
          totalMembers: 0,
          activeMembers: 0,
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
    const activeOnly = searchParams.get('active') !== 'false';

    const cacheKey = `legistar-council-${normalizedCityId}-${activeOnly ? 'active' : 'all'}`;

    logger.info('City council API request', { cityId: normalizedCityId, activeOnly });

    const members = await cachedFetch(
      cacheKey,
      async () => fetchCouncilMembers(cityConfig, activeOnly),
      24 * 60 * 60 * 1000 // 24 hour cache
    );

    const activeMembers = members.filter(m => m.active).length;

    return NextResponse.json(
      {
        success: true,
        city: {
          id: cityConfig.id,
          name: cityConfig.name,
          state: cityConfig.state,
        },
        members,
        totalMembers: members.length,
        activeMembers,
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

    logger.error('City council API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        city: { id: '', name: '', state: '' },
        members: [],
        totalMembers: 0,
        activeMembers: 0,
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

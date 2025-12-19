/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

interface LocationInfo {
  city: string;
  state: string;
  displayName: string;
  county: string;
}

interface LocalOfficial {
  id: string;
  name: string;
  position: string;
  jurisdiction: 'city' | 'county' | 'township' | 'school_district' | 'special_district';
  jurisdictionName: string;
  party?: 'Democratic' | 'Republican' | 'Independent' | 'Nonpartisan';
  email?: string;
  phone?: string;
  office?: string;
  photoUrl?: string;
  termStart: string;
  termEnd: string;
  isElected: boolean;
  salary?: number;
  website?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  responsibilities: string[];
  committees?: Array<{
    name: string;
    role: 'chair' | 'member';
  }>;
  contactHours?: {
    days: string[];
    hours: string;
  };
}

interface LocalGovernmentData {
  location: string;
  locationName: string;
  state: string;
  lastUpdated: string;
  officials: LocalOfficial[];
  totalCount: number;
  jurisdictions: {
    city: LocalOfficial[];
    county: LocalOfficial[];
    township: LocalOfficial[];
    school_district: LocalOfficial[];
    special_district: LocalOfficial[];
  };
  nextElections: Array<{
    date: string;
    offices: string[];
    jurisdiction: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ location: string }> }
) {
  const { location } = await params;
  const { searchParams } = request.nextUrl;
  const jurisdiction = searchParams.get('jurisdiction'); // 'city', 'county', etc.
  const _zipCode = searchParams.get('zip');

  if (!location) {
    return NextResponse.json({ error: 'Location identifier is required' }, { status: 400 });
  }

  try {
    const cacheKey = `local-government-${location}-${jurisdiction || 'all'}`;
    const TTL_12_HOURS = 12 * 60 * 60 * 1000;

    const localData = await cachedFetch(
      cacheKey,
      async (): Promise<LocalGovernmentData> => {
        logger.info(
          'Fetching local government data',
          {
            location,
            jurisdiction: jurisdiction || 'all',
            operation: 'local_government_fetch',
          },
          request
        );

        // In production, this would integrate with various local government APIs
        const locationInfo = parseLocation(location);
        const officials: LocalOfficial[] = []; // Real local government API integration needed

        // Group by jurisdiction
        const jurisdictions = {
          city: officials.filter(o => o.jurisdiction === 'city'),
          county: officials.filter(o => o.jurisdiction === 'county'),
          township: officials.filter(o => o.jurisdiction === 'township'),
          school_district: officials.filter(o => o.jurisdiction === 'school_district'),
          special_district: officials.filter(o => o.jurisdiction === 'special_district'),
        };

        const nextElections = generateNextElections(locationInfo);

        return {
          location,
          locationName: locationInfo.displayName,
          state: locationInfo.state,
          lastUpdated: new Date().toISOString(),
          officials,
          totalCount: officials.length,
          jurisdictions,
          nextElections,
        };
      },
      TTL_12_HOURS
    );

    // Apply jurisdiction filter
    let filteredOfficials = localData.officials;
    if (jurisdiction) {
      filteredOfficials = filteredOfficials.filter(
        official => official.jurisdiction === jurisdiction
      );
    }

    const response = {
      ...localData,
      officials: filteredOfficials,
      totalCount: filteredOfficials.length,
      filters: {
        jurisdiction: jurisdiction || 'all',
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      'Local Government API Error',
      error as Error,
      {
        location,
        jurisdiction: jurisdiction || 'all',
        operation: 'local_government_api_error',
      },
      request
    );

    const errorResponse = {
      location,
      locationName: 'Unknown Location',
      state: 'Unknown',
      lastUpdated: new Date().toISOString(),
      officials: [],
      totalCount: 0,
      jurisdictions: {
        city: [],
        county: [],
        township: [],
        school_district: [],
        special_district: [],
      },
      nextElections: [],
      error: 'Local government data temporarily unavailable',
    };

    return NextResponse.json(errorResponse, { status: 200 });
  }
}

function parseLocation(location: string): LocationInfo {
  // Parse location format: "city-state" or "county-state" or zip code
  const parts = location.split('-');

  if (parts.length >= 2) {
    const cityName = parts.slice(0, -1).join(' ').replace(/_/g, ' ');
    const state = parts[parts.length - 1]?.toUpperCase() || 'ST';

    return {
      city: cityName,
      state,
      displayName: `${cityName
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')}, ${state}`,
      county: generateCountyName(cityName, state),
    };
  }

  // Handle ZIP code format
  if (/^\\d{5}$/.test(location)) {
    const locationData = getEmptyLocationResponse(location);
    return locationData;
  }

  return getEmptyLocationResponse(location);
}

function getEmptyLocationResponse(zip: string): LocationInfo {
  // EMERGENCY FIX: Fake city/county data removed
  // Previously returned fake "Beverly Hills, CA", "Sample City, TX" etc.
  // that could misdirect citizens to wrong local government offices

  logger.warn('Local government data unavailable for ZIP code', {
    zip,
    reason: 'Real local government API not integrated',
  });

  return {
    city: 'Location data unavailable',
    state: '',
    county: 'County data unavailable',
    displayName: 'Location services temporarily unavailable',
  };
}

function generateCountyName(city: string, state: string): string {
  const countyMappings: Record<string, Record<string, string>> = {
    CA: {
      'los angeles': 'Los Angeles County',
      'san francisco': 'San Francisco County',
      'san diego': 'San Diego County',
    },
    NY: {
      'new york': 'New York County',
      brooklyn: 'Kings County',
      queens: 'Queens County',
    },
    TX: {
      houston: 'Harris County',
      dallas: 'Dallas County',
      austin: 'Travis County',
    },
  };

  const stateMapping = countyMappings[state];
  if (stateMapping) {
    const countyName = stateMapping[city.toLowerCase()];
    if (countyName) return countyName;
  }

  return `${city} County`;
}

function generateNextElections(_locationInfo: unknown) {
  // Real election data would come from state/local election offices
  return [];
}

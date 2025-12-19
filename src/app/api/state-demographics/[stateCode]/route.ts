/**
 * State Demographics API
 * Fetches state-level demographic data from Census Bureau ACS 5-Year Survey
 *
 * Data Source: Census.gov ACS 2021 (American Community Survey)
 * Endpoint: GET /api/state-demographics/[stateCode]
 *
 * Provides comprehensive demographic data for Senator profiles:
 * - Population and demographics
 * - Income and economics
 * - Education attainment
 * - Housing statistics
 * - Age distribution
 */

import { NextRequest, NextResponse } from 'next/server';
import { STATE_FIPS } from '@/app/api/districts/census-helpers';
import { US_STATES } from '@/lib/data/us-states';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export const dynamic = 'force-dynamic';

interface StateDemographics {
  state_code: string;
  state_name: string;
  population: number;
  population_density?: number;
  median_age: number;
  median_household_income: number;
  per_capita_income: number;
  poverty_rate: number;
  // Race and ethnicity
  demographics: {
    white_alone: number;
    black_alone: number;
    asian_alone: number;
    hispanic_latino: number;
    native_american: number;
    pacific_islander: number;
    two_or_more_races: number;
    other_race: number;
  };
  // Education
  education: {
    high_school_or_higher: number;
    bachelors_or_higher: number;
    graduate_or_professional: number;
  };
  // Housing
  housing: {
    total_units: number;
    occupied_units: number;
    median_home_value: number;
    median_rent: number;
    homeownership_rate: number;
  };
  // Employment
  employment: {
    labor_force_participation_rate: number;
    unemployment_rate: number;
  };
  // Additional metrics
  diversity_index: number;
  data_source: string;
  survey_year: number;
}

// State name mapping - using centralized US_STATES from @/lib/data/us-states

// In-memory cache for state demographics (30 minutes TTL)
const demographicsCache = new Map<string, { data: StateDemographics; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Calculate Simpson's Diversity Index
 */
function calculateDiversityIndex(demographics: {
  white_alone: number;
  black_alone: number;
  asian_alone: number;
  hispanic_latino: number;
  native_american: number;
  pacific_islander: number;
  two_or_more_races: number;
  other_race: number;
  total: number;
}): number {
  const total = demographics.total;
  if (total === 0) return 0;

  const proportions = [
    demographics.white_alone / total,
    demographics.black_alone / total,
    demographics.asian_alone / total,
    demographics.hispanic_latino / total,
    demographics.native_american / total,
    demographics.pacific_islander / total,
    demographics.two_or_more_races / total,
    demographics.other_race / total,
  ];

  const sumSquared = proportions.reduce((sum, p) => sum + p * p, 0);
  return (1 - sumSquared) * 100; // Convert to percentage
}

/**
 * Fetch state demographics from Census API
 */
async function fetchStateDemographics(
  stateCode: string,
  censusApiKey: string
): Promise<StateDemographics> {
  const stateFips = STATE_FIPS[stateCode];
  if (!stateFips) {
    throw new Error(`Invalid state code: ${stateCode}`);
  }

  // Check cache first
  const cacheKey = `state-${stateCode}`;
  const cached = demographicsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Census API variables for state-level data
  const variables = [
    'B01003_001E', // Total population
    'B01002_001E', // Median age
    'B19013_001E', // Median household income
    'B19301_001E', // Per capita income
    'B17001_002E', // Population below poverty level
    // Race (alone)
    'B02001_002E', // White alone
    'B02001_003E', // Black alone
    'B02001_004E', // Native American alone
    'B02001_005E', // Asian alone
    'B02001_006E', // Pacific Islander alone
    'B02001_007E', // Some other race alone
    'B02001_008E', // Two or more races
    // Hispanic/Latino (any race)
    'B03003_003E', // Hispanic or Latino
    // Education
    'B15003_017E', // High school graduate
    'B15003_022E', // Bachelor\'s degree
    'B15003_023E', // Master\'s degree
    'B15003_024E', // Professional degree
    'B15003_025E', // Doctorate degree
    // Housing
    'B25001_001E', // Total housing units
    'B25002_002E', // Occupied housing units
    'B25077_001E', // Median home value
    'B25064_001E', // Median gross rent
    // Employment
    'B23025_002E', // In labor force
    'B23025_005E', // Unemployed
  ].join(',');

  const url = `https://api.census.gov/data/2021/acs/acs5?get=${variables}&for=state:${stateFips}${
    censusApiKey ? `&key=${censusApiKey}` : ''
  }`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Census API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error('Invalid Census API response');
  }

  const headers = data[0];
  const row = data[1]; // State data is in the second row

  // Helper to get value by variable code
  const getValue = (varCode: string): number => {
    const index = headers.indexOf(varCode);
    return index >= 0 ? parseInt(row[index]) || 0 : 0;
  };

  const getFloat = (varCode: string): number => {
    const index = headers.indexOf(varCode);
    return index >= 0 ? parseFloat(row[index]) || 0 : 0;
  };

  // Calculate demographics
  const totalPopulation = getValue('B01003_001E');
  const povertyPopulation = getValue('B17001_002E');
  const laborForce = getValue('B23025_002E');
  const unemployed = getValue('B23025_005E');
  const occupiedUnits = getValue('B25002_002E');
  const totalUnits = getValue('B25001_001E');

  const demographics = {
    white_alone: getValue('B02001_002E'),
    black_alone: getValue('B02001_003E'),
    asian_alone: getValue('B02001_005E'),
    hispanic_latino: getValue('B03003_003E'),
    native_american: getValue('B02001_004E'),
    pacific_islander: getValue('B02001_006E'),
    two_or_more_races: getValue('B02001_008E'),
    other_race: getValue('B02001_007E'),
  };

  const stateDemographics: StateDemographics = {
    state_code: stateCode,
    state_name: US_STATES[stateCode as keyof typeof US_STATES] || stateCode,
    population: totalPopulation,
    median_age: getFloat('B01002_001E'),
    median_household_income: getValue('B19013_001E'),
    per_capita_income: getValue('B19301_001E'),
    poverty_rate: totalPopulation > 0 ? (povertyPopulation / totalPopulation) * 100 : 0,
    demographics,
    education: {
      high_school_or_higher: getValue('B15003_017E'),
      bachelors_or_higher: getValue('B15003_022E'),
      graduate_or_professional:
        getValue('B15003_023E') + getValue('B15003_024E') + getValue('B15003_025E'),
    },
    housing: {
      total_units: totalUnits,
      occupied_units: occupiedUnits,
      median_home_value: getValue('B25077_001E'),
      median_rent: getValue('B25064_001E'),
      homeownership_rate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
    },
    employment: {
      labor_force_participation_rate:
        totalPopulation > 0 ? (laborForce / totalPopulation) * 100 : 0,
      unemployment_rate: laborForce > 0 ? (unemployed / laborForce) * 100 : 0,
    },
    diversity_index: calculateDiversityIndex({
      ...demographics,
      total: totalPopulation,
    }),
    data_source: 'Census Bureau ACS 2021 (5-Year Estimates)',
    survey_year: 2021,
  };

  // Cache the result
  demographicsCache.set(cacheKey, {
    data: stateDemographics,
    timestamp: Date.now(),
  });

  return stateDemographics;
}

/**
 * Main API route handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { stateCode } = await params;
    const normalizedCode = stateCode.trim().toUpperCase();

    // Validate state code
    if (!STATE_FIPS[normalizedCode]) {
      return NextResponse.json(
        {
          error: 'Invalid state code',
          message: 'State code must be a valid 2-letter abbreviation',
          examples: ['CA', 'NY', 'TX', 'FL'],
          provided: stateCode,
        },
        { status: 400 }
      );
    }

    // Get Census API key
    const censusApiKey = process.env.CENSUS_API_KEY || '';

    // Fetch demographics
    const demographics = await fetchStateDemographics(normalizedCode, censusApiKey);

    const processingTime = Date.now() - startTime;

    // Return with cache headers
    return NextResponse.json(demographics, {
      headers: {
        'Cache-Control': 'public, max-age=1800, s-maxage=3600', // 30 min client, 1 hr CDN
        'Content-Type': 'application/json; charset=utf-8',
        'X-Processing-Time': `${processingTime}ms`,
        'X-Data-Source': 'Census Bureau ACS 2021',
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to fetch state demographics',
        message: errorMessage,
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
      },
      {
        status: 500,
        headers: {
          'X-Processing-Time': `${processingTime}ms`,
        },
      }
    );
  }
}

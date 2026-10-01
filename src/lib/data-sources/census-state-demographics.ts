/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State-level demographics from the Census Bureau's ACS 5-Year estimates.
 *
 * Every rate divides by the universe of its own table (people 25+ for
 * education, people 16+ for labor force, owner+renter households for
 * homeownership, the poverty-status universe for poverty). Race/ethnicity
 * uses B03002, whose eight categories partition the population, so the
 * diversity index never double-counts Hispanic residents.
 */

import { STATE_CODE_TO_FIPS, US_STATES } from '@/lib/data/us-states';
import { getRedisCache } from '@/lib/cache/redis-client';

export const STATE_DEMOGRAPHICS_ACS_YEAR = 2024;
export const STATE_DEMOGRAPHICS_SOURCE = `Census Bureau ACS ${STATE_DEMOGRAPHICS_ACS_YEAR} (5-Year Estimates)`;

// ACS state-level tables cover the 50 states, DC and Puerto Rico. The other
// territories are surveyed separately (the Island Areas census), not by ACS.
const ACS_TERRITORIES_COVERED = new Set(['PR']);

/** True when ACS publishes state-level estimates for this code. */
export function hasStateDemographics(stateCode: string): boolean {
  const fips = STATE_CODE_TO_FIPS[stateCode];
  return fips !== undefined && (Number(fips) <= 56 || ACS_TERRITORIES_COVERED.has(stateCode));
}

// ACS 5-Year estimates are immutable for a given survey year.
const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface StateDemographics {
  state_code: string;
  state_name: string;
  population: number;
  median_age: number;
  median_household_income: number;
  per_capita_income: number;
  /** Percent of people whose poverty status is determined. */
  poverty_rate: number;
  /** Counts. Race groups are non-Hispanic; hispanic_latino is any race. */
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
  /** Percent of people 25 and older. */
  education: {
    high_school_or_higher: number;
    bachelors_or_higher: number;
    graduate_or_professional: number;
  };
  housing: {
    total_units: number;
    occupied_units: number;
    median_home_value: number;
    median_rent: number;
    /** Percent of occupied housing units that are owner-occupied. */
    homeownership_rate: number;
  };
  employment: {
    /** Percent of people 16 and older in the labor force. */
    labor_force_participation_rate: number;
    /** Percent of the civilian labor force that is unemployed. */
    unemployment_rate: number;
  };
  /** Simpson's diversity index over the eight B03002 groups, 0-100. */
  diversity_index: number;
  data_source: string;
  survey_year: number;
}

export const STATE_DEMOGRAPHICS_VARIABLES = [
  'B01003_001E', // Total population
  'B01002_001E', // Median age
  'B19013_001E', // Median household income
  'B19301_001E', // Per capita income
  'B17001_001E', // Poverty status determined (universe)
  'B17001_002E', // Below poverty level
  // Hispanic or Latino origin by race — these eight partition the population
  'B03002_003E', // Not Hispanic: White alone
  'B03002_004E', // Not Hispanic: Black alone
  'B03002_005E', // Not Hispanic: American Indian and Alaska Native alone
  'B03002_006E', // Not Hispanic: Asian alone
  'B03002_007E', // Not Hispanic: Native Hawaiian and Other Pacific Islander alone
  'B03002_008E', // Not Hispanic: Some other race alone
  'B03002_009E', // Not Hispanic: Two or more races
  'B03002_012E', // Hispanic or Latino (any race)
  // Educational attainment, population 25+
  'B15003_001E', // Universe
  'B15003_017E', // Regular high school diploma
  'B15003_018E', // GED or alternative credential
  'B15003_019E', // Some college, less than 1 year
  'B15003_020E', // Some college, 1 or more years, no degree
  'B15003_021E', // Associate's degree
  'B15003_022E', // Bachelor's degree
  'B15003_023E', // Master's degree
  'B15003_024E', // Professional school degree
  'B15003_025E', // Doctorate degree
  // Housing
  'B25001_001E', // Total housing units
  'B25003_001E', // Occupied housing units (tenure universe)
  'B25003_002E', // Owner occupied
  'B25077_001E', // Median home value
  'B25064_001E', // Median gross rent
  // Employment status, population 16+
  'B23025_001E', // Universe
  'B23025_002E', // In labor force
  'B23025_003E', // Civilian labor force
  'B23025_005E', // Civilian labor force: unemployed
] as const;

function percent(part: number, whole: number): number {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/** Turn one ACS header row + state row into the public shape. */
export function parseStateDemographics(
  headers: readonly string[],
  row: readonly string[],
  stateCode: string
): StateDemographics {
  const num = (code: string): number => {
    const i = headers.indexOf(code);
    const v = i >= 0 ? Number(row[i]) : NaN;
    // ACS uses large negative sentinels (e.g. -666666666) for "not available".
    return Number.isFinite(v) && v >= 0 ? v : 0;
  };
  const sum = (...codes: string[]): number => codes.reduce((s, c) => s + num(c), 0);

  const population = num('B01003_001E');
  const demographics = {
    white_alone: num('B03002_003E'),
    black_alone: num('B03002_004E'),
    native_american: num('B03002_005E'),
    asian_alone: num('B03002_006E'),
    pacific_islander: num('B03002_007E'),
    other_race: num('B03002_008E'),
    two_or_more_races: num('B03002_009E'),
    hispanic_latino: num('B03002_012E'),
  };
  const groupTotal = Object.values(demographics).reduce((s, v) => s + v, 0);
  const diversity =
    groupTotal > 0
      ? (1 - Object.values(demographics).reduce((s, v) => s + (v / groupTotal) ** 2, 0)) * 100
      : 0;

  const edu25 = num('B15003_001E');
  const bachelorsPlus = sum('B15003_022E', 'B15003_023E', 'B15003_024E', 'B15003_025E');
  const graduate = sum('B15003_023E', 'B15003_024E', 'B15003_025E');
  const hsPlus =
    sum('B15003_017E', 'B15003_018E', 'B15003_019E', 'B15003_020E', 'B15003_021E') + bachelorsPlus;

  return {
    state_code: stateCode,
    state_name: US_STATES[stateCode as keyof typeof US_STATES] || stateCode,
    population,
    median_age: num('B01002_001E'),
    median_household_income: num('B19013_001E'),
    per_capita_income: num('B19301_001E'),
    poverty_rate: percent(num('B17001_002E'), num('B17001_001E')),
    demographics,
    education: {
      high_school_or_higher: percent(hsPlus, edu25),
      bachelors_or_higher: percent(bachelorsPlus, edu25),
      graduate_or_professional: percent(graduate, edu25),
    },
    housing: {
      total_units: num('B25001_001E'),
      occupied_units: num('B25003_001E'),
      median_home_value: num('B25077_001E'),
      median_rent: num('B25064_001E'),
      homeownership_rate: percent(num('B25003_002E'), num('B25003_001E')),
    },
    employment: {
      labor_force_participation_rate: percent(num('B23025_002E'), num('B23025_001E')),
      unemployment_rate: percent(num('B23025_005E'), num('B23025_003E')),
    },
    diversity_index: diversity,
    data_source: STATE_DEMOGRAPHICS_SOURCE,
    survey_year: STATE_DEMOGRAPHICS_ACS_YEAR,
  };
}

/**
 * Demographics for one state, DC or Puerto Rico (two-letter code). Throws on
 * an uncovered code or a Census failure so callers can choose between an
 * error response and "Data unavailable".
 */
export async function getStateDemographics(stateCode: string): Promise<StateDemographics> {
  const stateFips = STATE_CODE_TO_FIPS[stateCode];
  if (!stateFips || !hasStateDemographics(stateCode)) {
    throw new Error(`No ACS state-level estimates for: ${stateCode}`);
  }

  const cacheKey = `state-demographics:v2:${STATE_DEMOGRAPHICS_ACS_YEAR}:${stateCode}`;
  try {
    const cached = await getRedisCache().get<StateDemographics>(cacheKey);
    if (cached) return cached;
  } catch {
    // Redis unavailable — fall through to Census.
  }

  // Census only accepts the key as a query parameter. Sent as a header it is
  // ignored and the API 302s to an HTML "missing key" page.
  const censusApiKey = process.env.CENSUS_API_KEY || '';
  const keyParam = censusApiKey && !censusApiKey.startsWith('your_') ? `&key=${censusApiKey}` : '';
  const url = `https://api.census.gov/data/${STATE_DEMOGRAPHICS_ACS_YEAR}/acs/acs5?get=${STATE_DEMOGRAPHICS_VARIABLES.join(',')}&for=state:${stateFips}${keyParam}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) {
    throw new Error(`Census API error: ${response.status} ${response.statusText}`);
  }
  const data: unknown = await response.json();
  if (!Array.isArray(data) || data.length < 2) throw new Error('Invalid Census API response');

  const result = parseStateDemographics(data[0] as string[], data[1] as string[], stateCode);
  if (result.population <= 0) throw new Error('Census returned no population');

  try {
    await getRedisCache().set(cacheKey, result, CACHE_TTL_SECONDS);
  } catch {
    // Non-fatal
  }
  return result;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Remove React cache import - not available in current Next.js version
import { ZIP_TO_DISTRICT_MAP } from './data/zip-district-mapping';
import { findCongressionalDistrictLayer } from '@/lib/census-geocoder';
import { US_STATES } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';

export interface CongressionalDistrict {
  state: string;
  stateCode: string;
  district: string;
  districtName: string;
  population?: number;
  demographics?: {
    white_percent: number;
    black_percent: number;
    hispanic_percent: number;
    asian_percent: number;
    /** Null when the ACS estimate is suppressed (negative sentinel). */
    median_income: number | null;
    poverty_rate: number;
    bachelor_degree_percent: number;
  };
  geography?: {
    coordinates: { latitude: number; longitude: number };
    area_sqmi: number;
  };
  matchedAddress?: string;
}

interface CensusAPIResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  source: 'api' | 'fallback';
}

interface RateLimiter {
  requests: number[];
  maxRequestsPerSecond: number;
  waitIfNeeded(): Promise<void>;
}

// ZIP to Congressional District mapping for major cities (fallback data)
// Source: US Census Bureau
const ZIP_TO_DISTRICT: Record<string, { state: string; district: string }> = {
  // Michigan
  '48221': { state: 'MI', district: '13' }, // Detroit
  '48201': { state: 'MI', district: '13' }, // Detroit
  '48226': { state: 'MI', district: '13' }, // Detroit
  '49503': { state: 'MI', district: '03' }, // Grand Rapids

  // California
  '90210': { state: 'CA', district: '36' }, // Beverly Hills
  '94102': { state: 'CA', district: '11' }, // San Francisco
  '92101': { state: 'CA', district: '50' }, // San Diego

  // New York
  '10001': { state: 'NY', district: '12' }, // Manhattan
  '10013': { state: 'NY', district: '10' }, // Manhattan
  '11201': { state: 'NY', district: '07' }, // Brooklyn

  // Add more as needed...
};

// State names mapping - using centralized US_STATES from @/lib/data/us-states

// Rate limiter for Census API calls
const createRateLimiter = (): RateLimiter => ({
  requests: [],
  maxRequestsPerSecond: 5, // Census API allows 500 calls per day
  async waitIfNeeded() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;

    // Remove requests older than 1 second
    this.requests = this.requests.filter(time => time > oneSecondAgo);

    if (this.requests.length >= this.maxRequestsPerSecond) {
      const firstRequest = this.requests[0];
      if (!firstRequest) return;
      const waitTime = 1000 - (now - firstRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }

    this.requests.push(now);
  },
});

const rateLimiter = createRateLimiter();

/**
 * Fetch congressional district data from live Census API
 */
async function fetchFromCensusAPI(zipCode: string): Promise<CensusAPIResponse> {
  try {
    await rateLimiter.waitIfNeeded();

    // Census Geocoding Services API doesn't require an API key
    // Only the ACS demographic data requires an API key

    // Use Census Geocoding Services API to get congressional district
    const geocodeUrl = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress`;
    const params = new URLSearchParams({
      address: zipCode,
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      layers: 'all', // parser selects the newest Congressional Districts layer
      format: 'json',
    });

    const response = await fetch(`${geocodeUrl}?${params}`, {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.result?.addressMatches?.length > 0) {
      const match = data.result.addressMatches[0];
      const coordinates = match.coordinates;
      const geographies = match.geographies;

      // Extract congressional district info — newest Congress layer present
      const congressionalDistricts =
        findCongressionalDistrictLayer<Record<string, string>>(geographies) ?? [];

      const district = congressionalDistricts[0];
      if (district) {
        const stateCode = district.STATE || '';
        const districtCode = district.CD || district.DISTRICT || '';
        const stateName = US_STATES[stateCode as keyof typeof US_STATES] || stateCode;

        // Get additional demographic data from ACS API if API key is available
        const apiKey = process.env.CENSUS_API_KEY;
        const demographics = apiKey
          ? await fetchDemographics(stateCode, districtCode, apiKey)
          : undefined;

        const result: CongressionalDistrict = {
          state: stateCode,
          stateCode: stateCode,
          district: districtCode,
          districtName: `${stateName} ${districtCode === '00' ? 'At-Large' : `District ${parseInt(districtCode, 10)}`}`,
          geography: {
            coordinates: {
              latitude: coordinates.y,
              longitude: coordinates.x,
            },
            area_sqmi: parseFloat(district.AREALAND ?? '') / 2589988.11 || 0, // Convert sq meters to sq miles
          },
          demographics,
        };

        return { success: true, data: result, source: 'api' };
      }
    }

    return { success: false, error: 'No congressional district found', source: 'fallback' };
  } catch (error) {
    logger.error('Census API error', {
      component: 'censusApi',
      error: error as Error,
      metadata: { zipCode },
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'fallback',
    };
  }
}

/**
 * Fetch demographic data from American Community Survey API
 */
async function fetchDemographics(
  state: string,
  district: string,
  apiKey: string
): Promise<CongressionalDistrict['demographics']> {
  try {
    await rateLimiter.waitIfNeeded();

    // Get basic demographic data from 5-Year ACS
    const acsUrl = 'https://api.census.gov/data/2022/acs/acs5';
    const variables = [
      'B01003_001E', // Total population
      'B02001_002E', // White alone
      'B02001_003E', // Black alone
      'B02001_005E', // Asian alone
      'B03003_003E', // Hispanic
      'B19013_001E', // Median household income
      'B17001_002E', // Below poverty level
      'B15003_022E', // Bachelor's degree
    ].join(',');

    const params = new URLSearchParams({
      get: variables,
      for: `congressional district:${district.padStart(2, '0')}`,
      in: `state:${state}`,
      key: apiKey,
    });

    const response = await fetch(`${acsUrl}?${params}`);

    if (response.ok) {
      const data = await response.json();
      if (data.length > 1) {
        const [_headers, values] = data;
        // ACS uses large negative sentinels (e.g. -666666666) for
        // suppressed/unavailable estimates — never let them through as data.
        const parseAcsValue = (raw: unknown): number | null => {
          const n = parseInt(String(raw ?? ''), 10);
          return Number.isFinite(n) && n >= 0 ? n : null;
        };

        const totalPop = parseAcsValue(values[0]);
        const white = parseAcsValue(values[1]);
        const black = parseAcsValue(values[2]);
        const asian = parseAcsValue(values[3]);
        const hispanic = parseAcsValue(values[4]);
        const medianIncome = parseAcsValue(values[5]);
        const belowPoverty = parseAcsValue(values[6]);
        const bachelors = parseAcsValue(values[7]);

        // Percentages need real counts — if any are unavailable, report
        // no demographics rather than fabricated zeros.
        if (
          totalPop === null ||
          totalPop === 0 ||
          white === null ||
          black === null ||
          asian === null ||
          hispanic === null ||
          belowPoverty === null ||
          bachelors === null
        ) {
          logger.warn('ACS demographics unavailable or suppressed', {
            component: 'censusApi',
            metadata: { state, district },
          });
          return undefined;
        }

        return {
          white_percent: (white / totalPop) * 100,
          black_percent: (black / totalPop) * 100,
          hispanic_percent: (hispanic / totalPop) * 100,
          asian_percent: (asian / totalPop) * 100,
          median_income: medianIncome,
          poverty_rate: (belowPoverty / totalPop) * 100,
          bachelor_degree_percent: (bachelors / totalPop) * 100,
        };
      }
    }
  } catch (error) {
    logger.error('Error fetching demographics', {
      component: 'censusApi',
      error: error as Error,
      metadata: { state, district },
    });
  }

  // Data unavailable — never return fabricated zeros
  return undefined;
}

/**
 * Get congressional district from ZIP code using live Census API
 * Falls back to hardcoded mapping if API fails
 */
export const getCongressionalDistrictFromZip = async (
  zipCode: string
): Promise<CongressionalDistrict | null> => {
  // First try our comprehensive mapping
  const mapping = ZIP_TO_DISTRICT_MAP[zipCode];
  if (mapping) {
    const stateName = US_STATES[mapping.state as keyof typeof US_STATES] || mapping.state;
    const districtNumber =
      mapping.district === '00' ? 'At-Large' : parseInt(mapping.district, 10).toString();

    return {
      state: mapping.state,
      stateCode: mapping.state,
      district: mapping.district,
      districtName: `${stateName} ${districtNumber === 'At-Large' ? 'At-Large' : `District ${districtNumber}`}`,
    };
  }

  // Try the live Census API as fallback (may not work for ZIP-only queries)
  const liveResult = await fetchFromCensusAPI(zipCode);
  if (liveResult.success && liveResult.data) {
    return liveResult.data as CongressionalDistrict;
  }

  // Fall back to legacy hardcoded mapping
  const legacyMapping = ZIP_TO_DISTRICT[zipCode];
  if (legacyMapping) {
    const stateName =
      US_STATES[legacyMapping.state as keyof typeof US_STATES] || legacyMapping.state;
    const districtNumber =
      legacyMapping.district === '00'
        ? 'At-Large'
        : parseInt(legacyMapping.district, 10).toString();

    return {
      state: legacyMapping.state,
      stateCode: legacyMapping.state,
      district: legacyMapping.district,
      districtName: `${stateName} ${districtNumber === 'At-Large' ? 'At-Large' : `District ${districtNumber}`}`,
    };
  }

  // ZIP not in any mapping: report unavailable rather than fabricating a
  // district (the old behavior defaulted to "District 1", which is wrong
  // data — callers must show an empty state instead).
  return null;
};

/**
 * Alternative method using one-line address endpoint
 * For future implementation with full Census API integration
 */
export const getCongressionalDistrictFromAddress = async (
  address: string
): Promise<CongressionalDistrict | null> => {
  try {
    await rateLimiter.waitIfNeeded();

    // Clean and format the address
    const cleanAddress = address.trim().replace(/\s+/g, ' ');

    // Use Census Geocoding API for address lookup
    const params = new URLSearchParams({
      address: cleanAddress,
      benchmark: 'Public_AR_Current',
      vintage: 'Current_Current',
      layers: 'all', // parser selects the newest Congressional Districts layer
      format: 'json',
    });

    const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${params}`;

    logger.info('Geocoding address via Census API', {
      address: cleanAddress,
      url: url.replace(/address=[^&]+/, 'address=REDACTED'),
    });

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'CIV.IQ/1.0 (https://civdotiq.org; contact@civdotiq.org)',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();

    // Check if we have address matches
    if (data.result?.addressMatches?.length > 0) {
      const match = data.result.addressMatches[0];
      const coordinates = match.coordinates;
      const geographies = match.geographies;

      // Extract congressional district info — newest Congress layer present
      const congressionalDistricts =
        findCongressionalDistrictLayer<Record<string, string>>(geographies) ?? [];

      const district = congressionalDistricts[0];
      if (district) {
        const stateCode = district.STATE || '';
        const districtCode =
          district.BASENAME ||
          district.CD119 ||
          district.CD118 ||
          district.CD ||
          district.DISTRICT ||
          '';
        const stateName = US_STATES[stateCode as keyof typeof US_STATES] || stateCode;

        // Get additional demographic data from ACS API if API key is available
        const apiKey = process.env.CENSUS_API_KEY;
        const demographics = apiKey
          ? await fetchDemographics(stateCode, districtCode, apiKey)
          : undefined;

        const result: CongressionalDistrict = {
          state: stateCode,
          stateCode: stateCode,
          district: districtCode,
          districtName: `${stateName} ${districtCode === '00' || districtCode === '98' ? 'At-Large' : `District ${parseInt(districtCode, 10)}`}`,
          geography: {
            coordinates: {
              latitude: coordinates.y,
              longitude: coordinates.x,
            },
            area_sqmi: parseFloat(district.AREALAND ?? '') / 2589988.11 || 0, // Convert sq meters to sq miles
          },
          demographics,
          matchedAddress: match.matchedAddress,
        };

        return result;
      }
    }

    // If no congressional district found, try to extract ZIP and use ZIP lookup
    const zipMatch = address.match(/\b\d{5}\b/);
    if (zipMatch) {
      return getCongressionalDistrictFromZip(zipMatch[0]);
    }

    return null;
  } catch (error) {
    logger.error('Error geocoding address', {
      component: 'censusApi',
      error: error as Error,
      metadata: { address },
    });

    // Fallback: try to extract ZIP and use ZIP lookup
    const zipMatch = address.match(/\b\d{5}\b/);
    if (zipMatch) {
      return getCongressionalDistrictFromZip(zipMatch[0]);
    }

    return null;
  }
};

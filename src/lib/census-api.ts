/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cache } from 'react';
import { ZIP_TO_DISTRICT_MAP, getStateFromZip } from './data/zip-district-mapping';
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
    median_income: number;
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

// State names mapping
const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
};

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
      const waitTime = 1000 - (now - this.requests[0]);
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
      layers: '54', // Congressional Districts layer (119th Congress)
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

      // Extract congressional district info
      const congressionalDistricts =
        geographies['119th Congressional Districts'] ||
        geographies['118th Congressional Districts'] ||
        geographies['Congressional Districts'] ||
        [];

      if (congressionalDistricts.length > 0) {
        const district = congressionalDistricts[0];
        const stateCode = district.STATE || '';
        const districtCode = district.CD || district.DISTRICT || '';
        const stateName = STATE_NAMES[stateCode] || stateCode;

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
            area_sqmi: parseFloat(district.AREALAND) / 2589988.11 || 0, // Convert sq meters to sq miles
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
        const totalPop = parseInt(values[0]) || 0;
        const white = parseInt(values[1]) || 0;
        const black = parseInt(values[2]) || 0;
        const asian = parseInt(values[3]) || 0;
        const hispanic = parseInt(values[4]) || 0;
        const medianIncome = parseInt(values[5]) || 0;
        const belowPoverty = parseInt(values[6]) || 0;
        const bachelors = parseInt(values[7]) || 0;

        return {
          white_percent: totalPop > 0 ? (white / totalPop) * 100 : 0,
          black_percent: totalPop > 0 ? (black / totalPop) * 100 : 0,
          hispanic_percent: totalPop > 0 ? (hispanic / totalPop) * 100 : 0,
          asian_percent: totalPop > 0 ? (asian / totalPop) * 100 : 0,
          median_income: medianIncome,
          poverty_rate: totalPop > 0 ? (belowPoverty / totalPop) * 100 : 0,
          bachelor_degree_percent: totalPop > 0 ? (bachelors / totalPop) * 100 : 0,
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

  // Return default values if API fails
  return {
    white_percent: 0,
    black_percent: 0,
    hispanic_percent: 0,
    asian_percent: 0,
    median_income: 0,
    poverty_rate: 0,
    bachelor_degree_percent: 0,
  };
}

/**
 * Get congressional district from ZIP code using live Census API
 * Falls back to hardcoded mapping if API fails
 */
export const getCongressionalDistrictFromZip = cache(
  async (zipCode: string): Promise<CongressionalDistrict | null> => {
    // First try our comprehensive mapping
    const mapping = ZIP_TO_DISTRICT_MAP[zipCode];
    if (mapping) {
      const stateName = STATE_NAMES[mapping.state] || mapping.state;
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
      const stateName = STATE_NAMES[legacyMapping.state] || legacyMapping.state;
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

    // For MVP, if ZIP not in our mapping, try to extract state from ZIP ranges
    const state = getStateFromZip(zipCode);
    if (state) {
      const stateName = STATE_NAMES[state] || state;
      // For unknown districts, default to district 1 - this is a fallback only
      const district = '01';

      return {
        state: state,
        stateCode: state,
        district: district,
        districtName: `${stateName} District 1`,
      };
    }

    return null;
  }
);

/**
 * Alternative method using one-line address endpoint
 * For future implementation with full Census API integration
 */
export const getCongressionalDistrictFromAddress = cache(
  async (address: string): Promise<CongressionalDistrict | null> => {
    try {
      await rateLimiter.waitIfNeeded();

      // Clean and format the address
      const cleanAddress = address.trim().replace(/\s+/g, ' ');

      // Use Census Geocoding API for address lookup
      const params = new URLSearchParams({
        address: cleanAddress,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: '54', // Congressional Districts layer (119th Congress)
        format: 'json',
      });

      const url = `https://geocoding.geo.census.gov/geocoder/geographies/onelineaddress?${params}`;

      logger.info('Geocoding address via Census API', {
        address: cleanAddress,
        url: url.replace(/address=[^&]+/, 'address=REDACTED'),
      });

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'CIV.IQ/1.0 (https://civiq.org; contact@civiq.org)',
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

        // Extract congressional district info
        const congressionalDistricts =
          geographies['119th Congressional Districts'] ||
          geographies['118th Congressional Districts'] ||
          geographies['Congressional Districts'] ||
          [];

        if (congressionalDistricts.length > 0) {
          const district = congressionalDistricts[0];
          const stateCode = district.STATE || '';
          const districtCode =
            district.CD119 || district.CD118 || district.CD || district.DISTRICT || '';
          const stateName = STATE_NAMES[stateCode] || stateCode;

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
              area_sqmi: parseFloat(district.AREALAND) / 2589988.11 || 0, // Convert sq meters to sq miles
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
  }
);

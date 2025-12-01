/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

export interface GeocodeResult {
  matchedAddress: string;
  coordinates: {
    x: number; // longitude
    y: number; // latitude
  };
  geographies: {
    '119th Congressional Districts'?: Array<{
      GEOID: string;
      CENTLAT: string;
      CENTLON: string;
      NAME: string;
      STATE: string;
      BASENAME: string; // Congressional District number
      CDSESSN: string; // Congress session number
    }>;
    // Legacy field for backwards compatibility
    congressionalDistricts?: Array<{
      GEOID: string;
      CENTLAT: string;
      CENTLON: string;
      NAME: string;
      STATE: string;
      CD: string;
    }>;
  };
  addressComponents: {
    streetNumber?: string;
    streetName?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

export interface GeocodeResponse {
  result: {
    addressMatches: GeocodeResult[];
  };
}

export interface GeocodeError {
  error: string;
  code: 'NO_MATCH' | 'INVALID_INPUT' | 'API_ERROR' | 'TIMEOUT';
  details?: unknown;
}

// Cache for geocoding results
const geocodeCache = new Map<string, { data: GeocodeResult[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Clean and validate address input
 */
export function cleanAddressInput(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, ' ') // Multiple spaces to single
    .replace(/[^\w\s,.-]/g, '') // Remove special chars except comma, period, hyphen
    .substring(0, 200); // Limit length
}

/**
 * Parse address components from user input
 */
export function parseAddressComponents(input: string): {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
} {
  // First, strip country suffix (US, USA, United States) from the end
  // This handles addresses like "123 Main St, City, MI 48221 US"
  const inputWithoutCountry = input.replace(/,?\s*(United States|USA|US)\s*$/i, '').trim();

  // Try to extract ZIP code (look for it at the end or standalone)
  const zipMatch = inputWithoutCountry.match(/,?\s*(\d{5})(-\d{4})?\s*$/);
  const zip = zipMatch ? zipMatch[1] : undefined;

  // Remove ZIP from input for further parsing
  const addressWithoutZip = zip
    ? inputWithoutCountry.replace(zipMatch![0], '').trim()
    : inputWithoutCountry;

  // Try to extract state (2-letter abbreviation at the end)
  const stateMatch = addressWithoutZip.match(/,?\s*([A-Z]{2})\s*$/);
  const state = stateMatch ? stateMatch[1] : undefined;

  // Remove state from input
  const addressWithoutState = state
    ? addressWithoutZip.replace(stateMatch![0], '').trim()
    : addressWithoutZip;

  // Split by comma to separate street from city
  const parts = addressWithoutState
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  return {
    street: parts[0] || undefined,
    city: parts[1] || undefined,
    state,
    zip,
  };
}

/**
 * Geocode an address using Census Geocoding API
 */
export async function geocodeAddress(address: string): Promise<GeocodeResult[] | GeocodeError> {
  const cleanedAddress = cleanAddressInput(address);

  // Check cache
  const cached = geocodeCache.get(cleanedAddress);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('Census Geocoder cache hit', { address: cleanedAddress });
    return cached.data;
  }

  const monitor = monitorExternalApi('census', 'geocoder', cleanedAddress);

  try {
    // Parse address components for better API compatibility
    const components = parseAddressComponents(cleanedAddress);

    let params: URLSearchParams;
    let url: string;

    // If we can parse the address into components, use the parametric endpoint
    if (components.street && (components.city || components.zip)) {
      params = new URLSearchParams({
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: 'all', // Get all geographic layers including 119th Congressional Districts
        format: 'json',
      });

      params.append('street', components.street);
      if (components.city) params.append('city', components.city);
      if (components.state) params.append('state', components.state);
      if (components.zip) params.append('zip', components.zip);

      url = `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`;
    } else {
      // Fallback to single address parameter
      params = new URLSearchParams({
        address: cleanedAddress,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: 'all', // Get all geographic layers including 119th Congressional Districts
        format: 'json',
      });

      url = `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`;
    }

    logger.info('Census Geocoder API request', {
      address: cleanedAddress,
      url,
    });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000), // 10 second timeout
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-information-platform)',
      },
    });

    if (!response.ok) {
      monitor.end(false, response.status);
      throw new Error(`Census API returned ${response.status}`);
    }

    const data: GeocodeResponse = await response.json();
    monitor.end(true, 200);

    if (!data.result?.addressMatches || data.result.addressMatches.length === 0) {
      logger.warn('No address matches found', { address: cleanedAddress });
      return {
        error: 'No matching address found',
        code: 'NO_MATCH',
        details: { input: address, cleaned: cleanedAddress },
      };
    }

    // Process results to ensure we have congressional district data
    // Check for both new (119th Congressional Districts) and legacy (congressionalDistricts) fields
    const validMatches = data.result.addressMatches.filter(match => {
      const has119thDistricts =
        match.geographies?.['119th Congressional Districts']?.length ?? 0 > 0;
      const hasLegacyDistricts = match.geographies?.congressionalDistricts?.length ?? 0 > 0;
      return has119thDistricts || hasLegacyDistricts;
    });

    if (validMatches.length === 0) {
      logger.warn('Addresses found but no congressional district data', {
        address: cleanedAddress,
        matchCount: data.result.addressMatches.length,
      });
      return {
        error: 'Address found but no congressional district information available',
        code: 'NO_MATCH',
        details: {
          input: address,
          matchedAddresses: data.result.addressMatches.map(m => m.matchedAddress),
        },
      };
    }

    // Cache successful results
    geocodeCache.set(cleanedAddress, {
      data: validMatches,
      timestamp: Date.now(),
    });

    logger.info('Census Geocoder success', {
      address: cleanedAddress,
      matchCount: validMatches.length,
      districts: validMatches
        .map(m => {
          // Prefer 119th Congressional Districts, fall back to legacy
          const districts =
            m.geographies['119th Congressional Districts'] || m.geographies.congressionalDistricts;
          if (!districts) return [];

          return districts.map(d => {
            // Use BASENAME for 119th, CD for legacy
            const districtNum = 'BASENAME' in d ? d.BASENAME : d.CD;
            return `${d.STATE}-${districtNum}`;
          });
        })
        .flat(),
    });

    return validMatches;
  } catch (error) {
    monitor.end(false, 0);
    logger.error('Census Geocoder error', error as Error, { address: cleanedAddress });

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return {
          error: 'Request timed out',
          code: 'TIMEOUT',
          details: { message: error.message },
        };
      }
    }

    return {
      error: 'Failed to geocode address',
      code: 'API_ERROR',
      details: { message: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
}

// FIPS state code to two-letter abbreviation mapping
const FIPS_TO_STATE: { [key: string]: string } = {
  '01': 'AL',
  '02': 'AK',
  '04': 'AZ',
  '05': 'AR',
  '06': 'CA',
  '08': 'CO',
  '09': 'CT',
  '10': 'DE',
  '11': 'DC',
  '12': 'FL',
  '13': 'GA',
  '15': 'HI',
  '16': 'ID',
  '17': 'IL',
  '18': 'IN',
  '19': 'IA',
  '20': 'KS',
  '21': 'KY',
  '22': 'LA',
  '23': 'ME',
  '24': 'MD',
  '25': 'MA',
  '26': 'MI',
  '27': 'MN',
  '28': 'MS',
  '29': 'MO',
  '30': 'MT',
  '31': 'NE',
  '32': 'NV',
  '33': 'NH',
  '34': 'NJ',
  '35': 'NM',
  '36': 'NY',
  '37': 'NC',
  '38': 'ND',
  '39': 'OH',
  '40': 'OK',
  '41': 'OR',
  '42': 'PA',
  '44': 'RI',
  '45': 'SC',
  '46': 'SD',
  '47': 'TN',
  '48': 'TX',
  '49': 'UT',
  '50': 'VT',
  '51': 'VA',
  '53': 'WA',
  '54': 'WV',
  '55': 'WI',
  '56': 'WY',
  '60': 'AS',
  '66': 'GU',
  '69': 'MP',
  '72': 'PR',
  '78': 'VI',
};

/**
 * Extract congressional district from geocode result
 */
export function extractDistrictFromResult(result: GeocodeResult): {
  state: string;
  district: string;
  fullDistrict: string;
} | null {
  // Try new 119th Congressional Districts format first
  const cd119th = result.geographies?.['119th Congressional Districts']?.[0];
  const cdLegacy = result.geographies?.congressionalDistricts?.[0];

  const cd = cd119th || cdLegacy;
  if (!cd) return null;

  // Get district number from appropriate field
  // 119th format uses BASENAME, legacy uses CD
  const rawDistrictNumber = 'BASENAME' in cd ? cd.BASENAME : cd.CD;

  // Handle at-large districts ("00", "98", or "AL")
  const districtNumber =
    rawDistrictNumber === '00' || rawDistrictNumber === '98' ? 'AL' : rawDistrictNumber;

  // Convert FIPS code to state abbreviation
  const stateCode = FIPS_TO_STATE[cd.STATE] || cd.STATE;

  return {
    state: stateCode,
    district: districtNumber,
    fullDistrict: `${stateCode}-${districtNumber}`,
  };
}

/**
 * Format matched address for display
 */
export function formatMatchedAddress(result: GeocodeResult): string {
  return result.matchedAddress
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
    .join(', ');
}

/**
 * Clear geocode cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
  logger.info('Geocode cache cleared');
}

/**
 * Get cache statistics
 */
export function getGeocodeStats(): {
  cacheSize: number;
  oldestEntry: number | null;
} {
  let oldestTimestamp: number | null = null;

  geocodeCache.forEach(({ timestamp }) => {
    if (!oldestTimestamp || timestamp < oldestTimestamp) {
      oldestTimestamp = timestamp;
    }
  });

  return {
    cacheSize: geocodeCache.size,
    oldestEntry: oldestTimestamp,
  };
}

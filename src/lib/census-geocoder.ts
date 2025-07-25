/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { structuredLogger } from '@/lib/logging/logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

export interface GeocodeResult {
  matchedAddress: string;
  coordinates: {
    x: number; // longitude
    y: number; // latitude
  };
  geographies: {
    congressionalDistricts: Array<{
      GEOID: string;
      CENTLAT: string;
      CENTLON: string;
      NAME: string;
      STATE: string;
      CD: string; // Congressional District number
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
  // Try to extract ZIP code (look for it at the end or standalone)
  const zipMatch = input.match(/,?\s*(\d{5})(-\d{4})?\s*$/);
  const zip = zipMatch ? zipMatch[1] : undefined;

  // Remove ZIP from input for further parsing
  const addressWithoutZip = zip ? input.replace(zipMatch![0], '').trim() : input;

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
    structuredLogger.debug('Census Geocoder cache hit', { address: cleanedAddress });
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
        layers: '54', // Congressional Districts 119th Congress
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
        layers: '54', // Congressional Districts 119th Congress
        format: 'json',
      });

      url = `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`;
    }

    structuredLogger.info('Census Geocoder API request', {
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
      structuredLogger.warn('No address matches found', { address: cleanedAddress });
      return {
        error: 'No matching address found',
        code: 'NO_MATCH',
        details: { input: address, cleaned: cleanedAddress },
      };
    }

    // Process results to ensure we have congressional district data
    const validMatches = data.result.addressMatches.filter(
      match => match.geographies?.congressionalDistricts?.length > 0
    );

    if (validMatches.length === 0) {
      structuredLogger.warn('Addresses found but no congressional district data', {
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

    structuredLogger.info('Census Geocoder success', {
      address: cleanedAddress,
      matchCount: validMatches.length,
      districts: validMatches
        .map(m => m.geographies.congressionalDistricts.map(d => `${d.STATE}-${d.CD}`))
        .flat(),
    });

    return validMatches;
  } catch (error) {
    monitor.end(false, 0);
    structuredLogger.error('Census Geocoder error', error as Error, { address: cleanedAddress });

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

/**
 * Extract congressional district from geocode result
 */
export function extractDistrictFromResult(result: GeocodeResult): {
  state: string;
  district: string;
  fullDistrict: string;
} | null {
  const cd = result.geographies?.congressionalDistricts?.[0];
  if (!cd) return null;

  // Handle at-large districts (CD = "00" or "98")
  const districtNumber = cd.CD === '00' || cd.CD === '98' ? 'AL' : cd.CD;

  return {
    state: cd.STATE,
    district: districtNumber,
    fullDistrict: `${cd.STATE}-${districtNumber}`,
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
  structuredLogger.info('Geocode cache cleared');
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

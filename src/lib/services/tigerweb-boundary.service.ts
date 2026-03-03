/**
 * TIGERweb Boundary Service
 *
 * Fetches GeoJSON district boundaries from Census TIGERweb ArcGIS REST API.
 * Free, no API key required.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import type { DistrictBoundary } from '@/types/state-legislature';

const TIGERWEB_BASE =
  'https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative/MapServer';

// Layer IDs in TIGERweb Legislative MapServer
const LAYER_SLDU = 1; // State Senate Districts (upper)
const LAYER_SLDL = 2; // State House Districts (lower)

// State FIPS codes for TIGERweb queries
const STATE_FIPS: Record<string, string> = {
  AL: '01',
  AK: '02',
  AZ: '04',
  AR: '05',
  CA: '06',
  CO: '08',
  CT: '09',
  DE: '10',
  DC: '11',
  FL: '12',
  GA: '13',
  HI: '15',
  ID: '16',
  IL: '17',
  IN: '18',
  IA: '19',
  KS: '20',
  KY: '21',
  LA: '22',
  ME: '23',
  MD: '24',
  MA: '25',
  MI: '26',
  MN: '27',
  MS: '28',
  MO: '29',
  MT: '30',
  NE: '31',
  NV: '32',
  NH: '33',
  NJ: '34',
  NM: '35',
  NY: '36',
  NC: '37',
  ND: '38',
  OH: '39',
  OK: '40',
  OR: '41',
  PA: '42',
  RI: '44',
  SC: '45',
  SD: '46',
  TN: '47',
  TX: '48',
  UT: '49',
  VT: '50',
  VA: '51',
  WA: '53',
  WV: '54',
  WI: '55',
  WY: '56',
};

// 90-day TTL — boundaries only change after redistricting
const BOUNDARY_CACHE_TTL = 90 * 24 * 60 * 60 * 1000;

/**
 * Fetch a single district boundary from TIGERweb.
 *
 * @param state Two-letter state code (e.g., "MI")
 * @param chamber 'upper' (senate) or 'lower' (house)
 * @param district District number (e.g., "8")
 * @returns GeoJSON Feature or null
 */
export async function getDistrictBoundary(
  state: string,
  chamber: 'upper' | 'lower',
  district: string
): Promise<DistrictBoundary | null> {
  const stateUpper = state.toUpperCase();
  const cacheKey = `tigerweb:boundary:${stateUpper}:${chamber}:${district}`;

  try {
    // Check cache first
    const cached = await govCache.get<DistrictBoundary>(cacheKey);
    if (cached) {
      logger.info('TIGERweb boundary cache hit', { state: stateUpper, chamber, district });
      return cached;
    }

    const stateFips = STATE_FIPS[stateUpper];
    if (!stateFips) {
      logger.warn('Invalid state code for TIGERweb', { state: stateUpper });
      return null;
    }

    const layer = chamber === 'upper' ? LAYER_SLDU : LAYER_SLDL;
    const districtPadded = district.padStart(3, '0');

    // Build ArcGIS REST query
    const queryParams = new URLSearchParams({
      where: `STATE='${stateFips}' AND SLDUST='${districtPadded}'`,
      outFields: 'NAME,GEOID,STATE,SLDUST,FUNCSTAT',
      f: 'geojson',
      outSR: '4326',
    });

    // Use correct field name per layer
    if (chamber === 'lower') {
      queryParams.set('where', `STATE='${stateFips}' AND SLDLST='${districtPadded}'`);
      queryParams.set('outFields', 'NAME,GEOID,STATE,SLDLST,FUNCSTAT');
    }

    const url = `${TIGERWEB_BASE}/${layer}/query?${queryParams}`;

    logger.info('Fetching district boundary from TIGERweb', {
      state: stateUpper,
      chamber,
      district,
      layer,
    });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000), // 15s timeout
      headers: {
        'User-Agent': 'CivicIntelHub/1.0 (https://civdotiq.org)',
      },
    });

    if (!response.ok) {
      logger.error('TIGERweb API error', new Error(`HTTP ${response.status}`), {
        state: stateUpper,
        chamber,
        district,
        status: response.status,
      });
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      logger.warn('No boundary found in TIGERweb', { state: stateUpper, chamber, district });
      return null;
    }

    const feature = data.features[0] as DistrictBoundary;

    // Cache the boundary
    await govCache.set(cacheKey, feature, {
      ttl: BOUNDARY_CACHE_TTL,
      source: 'tigerweb',
      dataType: 'districts',
    });

    logger.info('TIGERweb boundary fetched', {
      state: stateUpper,
      chamber,
      district,
      hasGeometry: !!feature.geometry,
    });

    return feature;
  } catch (error) {
    logger.error('TIGERweb boundary fetch failed', error as Error, {
      state: stateUpper,
      chamber,
      district,
    });
    return null;
  }
}

/**
 * Check TIGERweb connectivity (for health endpoint).
 */
export async function checkTIGERwebHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${TIGERWEB_BASE}?f=json`, {
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

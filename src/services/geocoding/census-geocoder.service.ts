/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * U.S. Census Geocoder Service
 *
 * Integrates with the U.S. Census Bureau's Geocoding API to:
 * 1. Geocode addresses to lat/long coordinates
 * 2. Identify state legislative districts (upper and lower chambers)
 * 3. Extract geographic boundary information
 *
 * API Documentation: https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
 */

import { createHash } from 'crypto';
import logger from '@/lib/logging/simple-logger';
import { findCongressionalDistrictLayer } from '@/lib/census-geocoder';
import { currentOfficeholderVintage } from '@/lib/census-vintage';
import { govCache } from '@/services/cache';
import type {
  CensusGeocodeRequest,
  CensusGeocodeResponse,
  ParsedDistrictInfo,
  DistrictGEOID,
  CensusGeography,
  CensusGeographies,
} from './census-geocoder.types';
import { CensusGeocoderException, CensusGeocoderError } from './census-geocoder.types';

export class CensusGeocoderService {
  private static readonly BASE_URL =
    'https://geocoding.geo.census.gov/geocoder/geographies/address';
  private static readonly DEFAULT_BENCHMARK = 'Public_AR_Current';
  // Newest "<year> State Legislative Districts - Upper/Lower" layer; Census
  // renames these every vintage, so never match an exact layer name.
  private static readonly SLD_UPPER_PATTERN = /^(\d{4}) State Legislative Districts? - Upper/;
  private static readonly SLD_LOWER_PATTERN = /^(\d{4}) State Legislative Districts? - Lower/;
  private static readonly CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds (addresses don't change districts often)
  private static readonly REQUEST_TIMEOUT = 15000; // 15 seconds

  /**
   * Geocode an address and extract state legislative district information
   */
  static async geocodeAddress(request: CensusGeocodeRequest): Promise<ParsedDistrictInfo> {
    const startTime = Date.now();
    const normalizedAddress = this.normalizeAddress(request);
    // Privacy: the raw address must never appear in logs or cache keys
    // (see PRIVACY.md "Address lookups") — key on a one-way hash instead.
    const addressHash = createHash('sha256').update(normalizedAddress).digest('hex').slice(0, 16);
    const vintage = request.vintage || currentOfficeholderVintage();
    // v2: v1 entries were parsed with stale layer names (no state districts).
    // The vintage is in the key so the 120th-Congress switch invalidates itself.
    const cacheKey = `census:geocode:v2:${vintage}:${addressHash}`;

    try {
      // Check cache first
      const cached = await govCache.get<ParsedDistrictInfo>(cacheKey);
      if (cached) {
        logger.info('Census geocoder cache hit', {
          addressHash,
          state: request.state,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Make API request
      logger.info('Geocoding address via Census API', { addressHash, state: request.state });
      const response = await this.makeGeocodeRequest(request, vintage);

      // Validate response
      this.validateResponse(response);

      // Parse district information
      const districtInfo = this.parseDistrictInfo(response, normalizedAddress);

      // Cache result
      await govCache.set(cacheKey, districtInfo, {
        ttl: this.CACHE_TTL,
        source: 'census-geocoder',
      });

      logger.info('Census geocoding successful', {
        addressHash,
        state: request.state,
        upperDistrict: districtInfo.upperDistrict?.number,
        lowerDistrict: districtInfo.lowerDistrict?.number,
        responseTime: Date.now() - startTime,
      });

      return districtInfo;
    } catch (error) {
      logger.error('Census geocoding failed', error as Error, {
        addressHash,
        state: request.state,
        responseTime: Date.now() - startTime,
      });

      // Re-throw if already a CensusGeocoderException
      if (error instanceof CensusGeocoderException) {
        throw error;
      }

      // Wrap other errors
      throw new CensusGeocoderException(
        CensusGeocoderError.API_ERROR,
        `Failed to geocode address: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Make HTTP request to Census Geocoder API
   */
  private static async makeGeocodeRequest(
    request: CensusGeocodeRequest,
    vintage: string
  ): Promise<CensusGeocodeResponse> {
    const url = new URL(this.BASE_URL);
    url.searchParams.set('street', request.street);
    url.searchParams.set('city', request.city);
    url.searchParams.set('state', request.state);
    if (request.zip) {
      url.searchParams.set('zip', request.zip);
    }
    url.searchParams.set('benchmark', request.benchmark || this.DEFAULT_BENCHMARK);
    url.searchParams.set('vintage', vintage);
    url.searchParams.set('format', 'json');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'User-Agent': 'CivIQ-Hub/2.0 (Census-Geocoder)',
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 429) {
          throw new CensusGeocoderException(
            CensusGeocoderError.RATE_LIMIT,
            'Census API rate limit exceeded'
          );
        }

        throw new CensusGeocoderException(
          CensusGeocoderError.API_ERROR,
          `Census API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as CensusGeocodeResponse;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof CensusGeocoderException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new CensusGeocoderException(
          CensusGeocoderError.NETWORK_ERROR,
          'Census API request timed out'
        );
      }

      throw new CensusGeocoderException(
        CensusGeocoderError.NETWORK_ERROR,
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Validate Census API response has required data
   */
  private static validateResponse(response: CensusGeocodeResponse): void {
    if (!response.result) {
      throw new CensusGeocoderException(
        CensusGeocoderError.INVALID_RESPONSE,
        'Census API returned invalid response structure'
      );
    }

    if (!response.result.addressMatches || response.result.addressMatches.length === 0) {
      throw new CensusGeocoderException(
        CensusGeocoderError.NO_ADDRESS_MATCHES,
        'Address not found. Please verify the address is correct.'
      );
    }

    // Safe to access [0] because we just validated array is not empty
    const match = response.result.addressMatches[0]!;

    if (!match.geographies) {
      throw new CensusGeocoderException(
        CensusGeocoderError.MISSING_DISTRICT_DATA,
        'No geographic data found for this address'
      );
    }
  }

  /**
   * Parse Census response into our normalized structure
   */
  private static parseDistrictInfo(
    response: CensusGeocodeResponse,
    _normalizedAddress: string
  ): ParsedDistrictInfo {
    // Safe to access [0] because validateResponse ensures at least one match exists
    const match = response.result.addressMatches[0]!;
    const geographies = match.geographies;

    // Extract upper chamber (State Senate) district
    const upperChamberGeo =
      this.findNewestYearLayer(geographies, this.SLD_UPPER_PATTERN)?.[0] ||
      geographies['State Legislative District - Upper Chamber']?.[0];

    // Extract lower chamber (State House) district
    const lowerChamberGeo =
      this.findNewestYearLayer(geographies, this.SLD_LOWER_PATTERN)?.[0] ||
      geographies['State Legislative District - Lower Chamber']?.[0];

    // Extract congressional district (for context)
    const congressionalGeo = findCongressionalDistrictLayer(geographies)?.[0];

    // Extract county
    const countyGeo = geographies['Counties']?.[0];

    // Extract place (city/town)
    const placeGeo = geographies['Incorporated Places']?.[0];

    return {
      matchedAddress: match.matchedAddress,
      coordinates: {
        lat: match.coordinates.y,
        lon: match.coordinates.x,
      },
      upperDistrict: upperChamberGeo ? this.parseDistrictFromGeography(upperChamberGeo) : null,
      lowerDistrict: lowerChamberGeo ? this.parseDistrictFromGeography(lowerChamberGeo) : null,
      congressionalDistrict: congressionalGeo
        ? this.parseDistrictFromGeography(congressionalGeo)
        : undefined,
      county: countyGeo?.NAME,
      place: placeGeo?.NAME,
    };
  }

  /**
   * Entries of the layer whose name matches `pattern` (year in group 1) with
   * the newest year, or undefined if no such layer has entries.
   */
  private static findNewestYearLayer(
    geographies: CensusGeographies,
    pattern: RegExp
  ): CensusGeography[] | undefined {
    let best: { year: number; entries: CensusGeography[] } | null = null;
    for (const [layerName, entries] of Object.entries(geographies)) {
      const match = layerName.match(pattern);
      if (match?.[1] && entries && entries.length > 0) {
        const year = parseInt(match[1], 10);
        if (!best || year > best.year) best = { year, entries };
      }
    }
    return best?.entries;
  }

  /**
   * Parse a Census geography object into district information
   */
  private static parseDistrictFromGeography(geo: CensusGeography): {
    number: string;
    geoid: string;
    name: string;
  } {
    const geoidParsed = this.parseGEOID(geo.GEOID);

    return {
      number: geoidParsed.districtNumber,
      geoid: geo.GEOID,
      name: geo.NAME,
    };
  }

  /**
   * Parse Census GEOID to extract district number
   *
   * GEOID format: SSFFF
   * - SS: State FIPS code (2 digits)
   * - FFF: District number (3 digits, zero-padded)
   *
   * Examples:
   * - "26003" → Michigan (26), District 3
   * - "48015" → Texas (48), District 15
   */
  static parseGEOID(geoid: string): DistrictGEOID {
    if (!geoid || geoid.length < 3) {
      throw new CensusGeocoderException(
        CensusGeocoderError.INVALID_RESPONSE,
        `Invalid GEOID format: ${geoid}`
      );
    }

    const stateFips = geoid.slice(0, 2);
    const districtPadded = geoid.slice(2);
    const districtNumber = districtPadded.replace(/^0+/, '') || '0';

    return {
      geoid,
      stateFips,
      districtPadded,
      districtNumber,
    };
  }

  /**
   * Normalize address to consistent format for caching
   */
  private static normalizeAddress(request: CensusGeocodeRequest): string {
    const parts = [request.street, request.city, request.state.toUpperCase(), request.zip || ''];

    return parts.filter(Boolean).join(', ').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /**
   * Check if Census Geocoder API is available
   */
  static async healthCheck(): Promise<boolean> {
    try {
      const url = new URL(this.BASE_URL);
      url.searchParams.set('street', '1600 Pennsylvania Ave NW');
      url.searchParams.set('city', 'Washington');
      url.searchParams.set('state', 'DC');
      url.searchParams.set('zip', '20500');
      url.searchParams.set('benchmark', this.DEFAULT_BENCHMARK);
      url.searchParams.set('vintage', currentOfficeholderVintage());
      url.searchParams.set('format', 'json');

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: { 'User-Agent': 'CivIQ-Hub/2.0 (Health-Check)' },
        signal: AbortSignal.timeout(5000),
      });

      return response.ok;
    } catch (error) {
      logger.error('Census Geocoder health check failed', error as Error);
      return false;
    }
  }
}

// Export singleton-style utility functions
export const censusGeocoder = {
  geocodeAddress: (request: CensusGeocodeRequest) => CensusGeocoderService.geocodeAddress(request),
  parseGEOID: (geoid: string) => CensusGeocoderService.parseGEOID(geoid),
  healthCheck: () => CensusGeocoderService.healthCheck(),
};

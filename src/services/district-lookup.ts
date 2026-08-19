/**
 * District Lookup Service
 *
 * Provides accurate lat/lng to congressional district lookup functionality
 * using Census TIGER/Line data and geometric calculations.
 */

import {
  districtBoundaryService,
  type DistrictBoundary,
} from '@/lib/helpers/district-boundary-utils';
import { findCongressionalDistrictLayer } from '@/lib/census-geocoder';
import logger from '@/lib/logging/simple-logger';

interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  confidence: number;
}

interface DistrictLookupResult {
  found: boolean;
  district?: DistrictBoundary;
  confidence: number;
  method: 'geometry' | 'bbox' | 'census_api' | 'zip_approximation' | 'fallback';
  geocoded?: GeocodeResult;
  error?: string;
}

class DistrictLookupService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await districtBoundaryService.initialize();
      this.initialized = true;
    } catch (error) {
      logger.error('Failed to initialize district lookup service', error as Error, {
        service: 'DistrictLookupService',
      });
      throw error;
    }
  }

  /**
   * Find congressional district by latitude and longitude coordinates.
   *
   * Uses Census Bureau's coordinates→geographies API for authoritative
   * point-in-polygon district resolution. Falls back to BBOX/centroid
   * if Census API is unavailable.
   */
  async findDistrictByCoordinates(
    latitude: number,
    longitude: number
  ): Promise<DistrictLookupResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Validate coordinates
      if (!this.isValidCoordinate(latitude, longitude)) {
        return {
          found: false,
          confidence: 0,
          method: 'fallback',
          error: 'Invalid coordinates',
        };
      }

      // Primary: Census Bureau coordinate→district lookup (authoritative)
      const censusResult = await this.lookupDistrictByCensusCoordinates(latitude, longitude);
      if (censusResult) {
        return censusResult;
      }

      // Fallback: BBOX + centroid distance from local metadata
      logger.warn('Census coordinate lookup unavailable, using BBOX fallback', {
        latitude,
        longitude,
        service: 'DistrictLookupService',
      });

      const result = await districtBoundaryService.findDistrictByPoint(latitude, longitude);

      return {
        found: result.found,
        district: result.district,
        confidence: result.confidence,
        method: result.method === 'pmtiles' ? 'geometry' : result.method,
      };
    } catch (error) {
      logger.error('Error in district coordinate lookup', error as Error, {
        latitude,
        longitude,
        service: 'DistrictLookupService',
      });

      return {
        found: false,
        confidence: 0,
        method: 'fallback',
        error: 'Lookup failed',
      };
    }
  }

  /**
   * Call Census Bureau's geographies/coordinates endpoint to get the
   * congressional district for a lat/lng point. Returns null if the
   * API is unavailable or returns no data.
   */
  private async lookupDistrictByCensusCoordinates(
    latitude: number,
    longitude: number
  ): Promise<DistrictLookupResult | null> {
    try {
      const url =
        `https://geocoding.geo.census.gov/geocoder/geographies/coordinates` +
        `?x=${longitude}&y=${latitude}` +
        `&benchmark=Public_AR_Current&vintage=Current_Current` +
        `&layers=all` +
        `&format=json`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const geographies = data?.result?.geographies;

      if (!geographies) {
        return null;
      }

      // Extract the newest Congressional Districts layer present
      const congressionalDistricts =
        findCongressionalDistrictLayer<Record<string, unknown>>(geographies) ?? [];

      const censusDistrict = congressionalDistricts[0];
      if (!censusDistrict) {
        return null;
      }

      const geoid = censusDistrict.GEOID as string;

      if (!geoid || geoid.length < 4) {
        return null;
      }

      // Parse GEOID: SSFFF (state FIPS + district number)
      const stateFips = geoid.substring(0, 2);
      const districtNum = geoid.substring(2).replace(/^0+/, '') || '0';
      const districtId = `${stateFips}-${districtNum.padStart(2, '0')}`;

      // Try to match against our local metadata for full district info
      const localDistrict = districtBoundaryService.getDistrictById(districtId);

      if (localDistrict) {
        return {
          found: true,
          district: localDistrict,
          confidence: 1.0,
          method: 'census_api',
        };
      }

      // Census returned a district but we don't have local metadata —
      // construct a minimal DistrictBoundary from Census data
      const stateAbbr = this.getStateAbbrFromFips(stateFips);
      const fallbackDistrict: DistrictBoundary = {
        id: districtId,
        state_fips: stateFips,
        state_name: this.getStateNameFromAbbr(stateAbbr),
        state_abbr: stateAbbr,
        district_num: districtNum.padStart(2, '0'),
        name: `${stateAbbr}-${districtNum.padStart(2, '0')}`,
        full_name: (censusDistrict.NAME as string) || `Congressional District ${districtNum}`,
        centroid: [
          parseFloat(censusDistrict.CENTLON as string) || longitude,
          parseFloat(censusDistrict.CENTLAT as string) || latitude,
        ],
        bbox: [longitude - 1, latitude - 1, longitude + 1, latitude + 1],
        area_sqm: (censusDistrict.AREALAND as number) || 0,
        geoid: geoid,
      };

      return {
        found: true,
        district: fallbackDistrict,
        confidence: 1.0,
        method: 'census_api',
      };
    } catch (error) {
      logger.warn('Census coordinate→district lookup failed', {
        error: error instanceof Error ? error.message : 'Unknown',
        latitude,
        longitude,
        service: 'DistrictLookupService',
      });
      return null;
    }
  }

  /**
   * Find congressional district by ZIP code using direct function calls
   */
  async findDistrictByZipCode(zipCode: string): Promise<DistrictLookupResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // DIRECT FUNCTION CALL - No HTTP to localhost!
      const { getAllCongressionalDistrictsForZip } = await import(
        '@/lib/data/zip-district-mapping'
      );
      const districts = getAllCongressionalDistrictsForZip(zipCode);

      const data = { districts };

      if (!data.districts || data.districts.length === 0) {
        return {
          found: false,
          confidence: 0,
          method: 'fallback',
          error: 'No districts found for ZIP code',
        };
      }

      // Get the first district and enhance with boundary data
      const zipMapping = data.districts[0];
      if (!zipMapping) {
        return {
          found: false,
          confidence: 0,
          method: 'fallback',
          error: 'No districts found for ZIP code',
        };
      }

      // Convert state abbreviation to FIPS if needed (simplified mapping)
      const stateFipsMap: Record<string, string> = {
        AL: '01',
        AK: '02',
        AZ: '04',
        AR: '05',
        CA: '06',
        CO: '08',
        CT: '09',
        DE: '10',
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
        DC: '11',
      };

      const stateFips = stateFipsMap[zipMapping.state] || '00';
      const districtId = `${stateFips}-${zipMapping.district.padStart(2, '0')}`;
      const district = districtBoundaryService.getDistrictById(districtId);

      if (district) {
        return {
          found: true,
          district,
          // ZIP-table assignment, not Census point-in-polygon: 10-20% of
          // ZIPs span multiple districts, so this can never be authoritative
          confidence: 0.85,
          method: 'zip_approximation',
        };
      }

      // Fallback: create district boundary from ZIP mapping data
      const fallbackDistrict: DistrictBoundary = {
        id: districtId,
        state_fips: stateFips,
        state_name: this.getStateNameFromAbbr(zipMapping.state),
        state_abbr: zipMapping.state,
        district_num: zipMapping.district.padStart(2, '0'),
        name: `${zipMapping.state}-${zipMapping.district.padStart(2, '0')}`,
        full_name: `${this.getStateNameFromAbbr(zipMapping.state)} Congressional District ${zipMapping.district}`,
        centroid: [-95.7129, 37.0902], // Default US center
        bbox: [-96.7129, 36.0902, -94.7129, 38.0902], // Default bounds
        area_sqm: 0,
        geoid: districtId,
      };

      return {
        found: true,
        district: fallbackDistrict,
        // ZIP-table assignment AND placeholder geometry (US-center
        // centroid/bbox above) — lowest-trust successful path
        confidence: 0.7,
        method: 'zip_approximation',
      };
    } catch (error) {
      logger.error('Error in district ZIP lookup', error as Error, {
        zipCode,
        service: 'DistrictLookupService',
      });

      return {
        found: false,
        confidence: 0,
        method: 'fallback',
        error: 'ZIP lookup failed',
      };
    }
  }

  /**
   * Find congressional district by address using geocoding
   */
  async findDistrictByAddress(address: string): Promise<DistrictLookupResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // First, try to geocode the address using Census Geocoding API
      const geocodeResult = await this.geocodeAddress(address);

      if (!geocodeResult) {
        return {
          found: false,
          confidence: 0,
          method: 'fallback',
          error: 'Address geocoding failed',
        };
      }

      // Use the geocoded coordinates to find the district
      const districtResult = await this.findDistrictByCoordinates(
        geocodeResult.latitude,
        geocodeResult.longitude
      );

      return {
        ...districtResult,
        geocoded: geocodeResult,
      };
    } catch (error) {
      logger.error('Error in district address lookup', error as Error, {
        address,
        service: 'DistrictLookupService',
      });

      return {
        found: false,
        confidence: 0,
        method: 'fallback',
        error: 'Address lookup failed',
      };
    }
  }

  /**
   * Get districts within a geographic bounding box
   */
  async getDistrictsInBounds(
    minLatitude: number,
    minLongitude: number,
    maxLatitude: number,
    maxLongitude: number
  ): Promise<DistrictBoundary[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return districtBoundaryService.getDistrictsInBounds(
      minLatitude,
      minLongitude,
      maxLatitude,
      maxLongitude
    );
  }

  /**
   * Search districts by name, state, or other criteria
   */
  async searchDistricts(query: string): Promise<DistrictBoundary[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return districtBoundaryService.searchDistricts(query);
  }

  /**
   * Geocode an address using Census Geocoding API
   */
  private async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      // Use Census Bureau's Geocoding Services
      // https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html
      const baseUrl = 'https://geocoding.geo.census.gov/geocoder/locations/onelineaddress';
      const params = new URLSearchParams({
        address: address,
        benchmark: 'Public_AR_Current',
        format: 'json',
      });

      const response = await fetch(`${baseUrl}?${params}`);
      if (!response.ok) {
        throw new Error(`Geocoding API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.result?.addressMatches?.[0]) {
        return null;
      }

      const match = data.result.addressMatches[0];
      const coordinates = match.coordinates;

      return {
        latitude: coordinates.y,
        longitude: coordinates.x,
        address: match.formattedAddress || address,
        confidence: match.tigerLine?.score || 0.8,
      };
    } catch (error) {
      logger.error('Geocoding failed', error as Error, {
        address,
        service: 'DistrictLookupService',
      });
      return null;
    }
  }

  /**
   * Get state abbreviation from FIPS code
   */
  private getStateAbbrFromFips(fips: string): string {
    const fipsToAbbr: Record<string, string> = {
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
    return fipsToAbbr[fips] || 'XX';
  }

  /**
   * Get full state name from abbreviation
   */
  private getStateNameFromAbbr(abbr: string): string {
    const stateNames: Record<string, string> = {
      AL: 'Alabama',
      AK: 'Alaska',
      AZ: 'Arizona',
      AR: 'Arkansas',
      CA: 'California',
      CO: 'Colorado',
      CT: 'Connecticut',
      DE: 'Delaware',
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
      DC: 'District of Columbia',
    };
    return stateNames[abbr] || abbr;
  }

  /**
   * Validate if coordinates are within reasonable bounds for US
   */
  private isValidCoordinate(latitude: number, longitude: number): boolean {
    // US bounds (including Alaska and Hawaii)
    const US_BOUNDS = {
      minLat: 18.9, // Southernmost point (Hawaii)
      maxLat: 71.4, // Northernmost point (Alaska)
      minLng: -179.2, // Westernmost point (Alaska)
      maxLng: -66.9, // Easternmost point (Maine)
    };

    return (
      latitude >= US_BOUNDS.minLat &&
      latitude <= US_BOUNDS.maxLat &&
      longitude >= US_BOUNDS.minLng &&
      longitude <= US_BOUNDS.maxLng
    );
  }

  /**
   * Get detailed information about a district
   */
  async getDistrictDetails(districtId: string): Promise<DistrictBoundary | null> {
    if (!this.initialized) {
      await this.initialize();
    }

    return districtBoundaryService.getDistrictById(districtId);
  }

  /**
   * Get all districts for a state
   */
  async getStateDistricts(stateFips: string): Promise<DistrictBoundary[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return districtBoundaryService.getDistrictsByState(stateFips);
  }

  /**
   * Get summary statistics about the district data
   */
  async getSummary() {
    if (!this.initialized) {
      await this.initialize();
    }

    return districtBoundaryService.getSummary();
  }
}

// Create singleton instance
export const districtLookupService = new DistrictLookupService();

// Export types
export type { DistrictLookupResult, GeocodeResult };

/**
 * Convenience function for coordinate-based district lookup
 */
export async function findDistrictByCoordinates(
  latitude: number,
  longitude: number
): Promise<DistrictLookupResult> {
  return districtLookupService.findDistrictByCoordinates(latitude, longitude);
}

/**
 * Convenience function for ZIP code-based district lookup
 */
export async function findDistrictByZipCode(zipCode: string): Promise<DistrictLookupResult> {
  return districtLookupService.findDistrictByZipCode(zipCode);
}

/**
 * Convenience function for address-based district lookup
 */
export async function findDistrictByAddress(address: string): Promise<DistrictLookupResult> {
  return districtLookupService.findDistrictByAddress(address);
}

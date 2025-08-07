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
  method: 'geometry' | 'bbox' | 'census_api' | 'fallback';
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
   * Find congressional district by latitude and longitude coordinates
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

      // Use district boundary service for point-in-district lookup
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
   * Find congressional district by ZIP code using existing ZIP-to-district mapping
   */
  async findDistrictByZipCode(zipCode: string): Promise<DistrictLookupResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Use existing ZIP code API
      const response = await fetch(`/api/districts?zip=${zipCode}`);
      if (!response.ok) {
        throw new Error(`ZIP lookup failed: ${response.status}`);
      }

      const data = await response.json();

      if (!data.districts || data.districts.length === 0) {
        return {
          found: false,
          confidence: 0,
          method: 'fallback',
          error: 'No districts found for ZIP code',
        };
      }

      // Get the first district and enhance with boundary data
      const apiDistrict = data.districts[0];
      const districtId = `${apiDistrict.stateFips}-${apiDistrict.districtNumber.toString().padStart(2, '0')}`;
      const district = districtBoundaryService.getDistrictById(districtId);

      if (district) {
        return {
          found: true,
          district,
          confidence: 0.95,
          method: 'census_api',
        };
      }

      // Fallback: create district boundary from API data
      const fallbackDistrict: DistrictBoundary = {
        id: districtId,
        state_fips: apiDistrict.stateFips,
        state_name: apiDistrict.stateName,
        state_abbr: apiDistrict.stateAbbr,
        district_num: apiDistrict.districtNumber.toString().padStart(2, '0'),
        name: `${apiDistrict.stateAbbr}-${apiDistrict.districtNumber.toString().padStart(2, '0')}`,
        full_name: `${apiDistrict.stateName} Congressional District ${apiDistrict.districtNumber}`,
        centroid: [apiDistrict.longitude || -95.7129, apiDistrict.latitude || 37.0902],
        bbox: [
          (apiDistrict.longitude || -95.7129) - 1,
          (apiDistrict.latitude || 37.0902) - 1,
          (apiDistrict.longitude || -95.7129) + 1,
          (apiDistrict.latitude || 37.0902) + 1,
        ],
        area_sqm: 0,
        geoid: districtId,
      };

      return {
        found: true,
        district: fallbackDistrict,
        confidence: 0.8,
        method: 'census_api',
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

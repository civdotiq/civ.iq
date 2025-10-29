/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Address to State Legislators Service
 *
 * Main orchestrator that converts a full street address to state legislators:
 * 1. Geocodes address via U.S. Census Bureau API
 * 2. Extracts state legislative districts (upper/lower chambers)
 * 3. Queries OpenStates for legislators in those districts
 * 4. Returns matched legislators with full profile data
 *
 * This is the primary entry point for address-based state legislator lookup.
 */

import logger from '@/lib/logging/simple-logger';
import { censusGeocoder } from '@/services/geocoding/census-geocoder.service';
import {
  CensusGeocoderException,
  CensusGeocoderError,
  type ParsedDistrictInfo,
} from '@/services/geocoding/census-geocoder.types';
import { districtLookup } from './district-lookup.service';
import type { EnhancedStateLegislator } from '@/types/state-legislature';

// ============================================================================
// Request/Response Types
// ============================================================================

export interface AddressLookupRequest {
  /** Street address (e.g., "100 Renaissance Center") */
  street: string;
  /** City name (e.g., "Detroit") */
  city: string;
  /** State abbreviation (e.g., "MI") */
  state: string;
  /** Optional ZIP code for faster geocoding */
  zip?: string;
}

export interface AddressLookupResponse {
  /** Input address that was geocoded */
  address: AddressLookupRequest;
  /** Matched/normalized address from Census */
  matchedAddress: string;
  /** Geocoded coordinates */
  coordinates: {
    lat: number;
    lon: number;
  };
  /** State legislative districts from Census */
  districts: {
    upper: {
      number: string;
      geoid: string;
      name: string;
    } | null;
    lower: {
      number: string;
      geoid: string;
      name: string;
    } | null;
    congressional?: {
      number: string;
      geoid: string;
      name: string;
    };
  };
  /** Matched state legislators from OpenStates */
  legislators: {
    senator: EnhancedStateLegislator | null;
    representative: EnhancedStateLegislator | null;
  };
  /** Additional geographic context from Census */
  location: {
    county?: string;
    place?: string;
  };
  /** Metadata about the lookup process */
  _metadata?: {
    censusResponseTime?: number;
    openstatesResponseTime?: number;
    totalResponseTime: number;
    warnings?: string[];
  };
}

// ============================================================================
// Error Types
// ============================================================================

export enum AddressLookupError {
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',
  NO_DISTRICTS_FOUND = 'NO_DISTRICTS_FOUND',
  NO_LEGISLATORS_FOUND = 'NO_LEGISLATORS_FOUND',
  CENSUS_API_ERROR = 'CENSUS_API_ERROR',
  OPENSTATES_API_ERROR = 'OPENSTATES_API_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AddressLookupException extends Error {
  constructor(
    public readonly errorType: AddressLookupError,
    message: string,
    public readonly originalError?: unknown
  ) {
    super(message);
    this.name = 'AddressLookupException';
  }
}

// ============================================================================
// Service Implementation
// ============================================================================

export class AddressToLegislatorsService {
  /**
   * Find state legislators for a given street address
   *
   * This is the main entry point for the two-API chain:
   * Census Geocoder → OpenStates
   */
  static async findLegislatorsByAddress(
    request: AddressLookupRequest
  ): Promise<AddressLookupResponse> {
    const startTime = Date.now();
    const warnings: string[] = [];

    logger.info('Address-to-legislators lookup starting', {
      street: request.street,
      city: request.city,
      state: request.state,
      zip: request.zip,
    });

    try {
      // Step 1: Geocode address via U.S. Census API
      const censusStart = Date.now();
      let districtInfo: ParsedDistrictInfo;

      try {
        districtInfo = await censusGeocoder.geocodeAddress({
          street: request.street,
          city: request.city,
          state: request.state,
          zip: request.zip,
        });
      } catch (error) {
        if (error instanceof CensusGeocoderException) {
          // Map Census errors to AddressLookup errors
          if (error.errorType === CensusGeocoderError.NO_ADDRESS_MATCHES) {
            throw new AddressLookupException(
              AddressLookupError.ADDRESS_NOT_FOUND,
              'Address not found. Please verify the address is correct.',
              error
            );
          }
          throw new AddressLookupException(
            AddressLookupError.CENSUS_API_ERROR,
            `Census geocoding failed: ${error.message}`,
            error
          );
        }
        throw error;
      }

      const censusTime = Date.now() - censusStart;

      logger.info('Census geocoding successful', {
        matchedAddress: districtInfo.matchedAddress,
        upperDistrict: districtInfo.upperDistrict?.number,
        lowerDistrict: districtInfo.lowerDistrict?.number,
        responseTime: censusTime,
      });

      // Step 2: Find legislators via OpenStates
      const openstatesStart = Date.now();
      let senator: EnhancedStateLegislator | null = null;
      let representative: EnhancedStateLegislator | null = null;

      try {
        const lookupResult = await districtLookup.findLegislatorsByDistrict({
          state: request.state,
          upperDistrict: districtInfo.upperDistrict?.number,
          lowerDistrict: districtInfo.lowerDistrict?.number,
        });

        senator = lookupResult.senator;
        representative = lookupResult.representative;

        // Track warnings for missing legislators
        if (districtInfo.upperDistrict && !senator) {
          warnings.push(`No state senator found for district ${districtInfo.upperDistrict.number}`);
        }
        if (districtInfo.lowerDistrict && !representative) {
          warnings.push(
            `No state representative found for district ${districtInfo.lowerDistrict.number}`
          );
        }
      } catch (error) {
        throw new AddressLookupException(
          AddressLookupError.OPENSTATES_API_ERROR,
          `OpenStates lookup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          error
        );
      }

      const openstatesTime = Date.now() - openstatesStart;
      const totalTime = Date.now() - startTime;

      logger.info('Address-to-legislators lookup complete', {
        address: request,
        senator: senator?.name,
        representative: representative?.name,
        censusTime,
        openstatesTime,
        totalTime,
      });

      // Step 3: Build response
      return {
        address: request,
        matchedAddress: districtInfo.matchedAddress,
        coordinates: districtInfo.coordinates,
        districts: {
          upper: districtInfo.upperDistrict,
          lower: districtInfo.lowerDistrict,
          congressional: districtInfo.congressionalDistrict,
        },
        legislators: {
          senator,
          representative,
        },
        location: {
          county: districtInfo.county,
          place: districtInfo.place,
        },
        _metadata: {
          censusResponseTime: censusTime,
          openstatesResponseTime: openstatesTime,
          totalResponseTime: totalTime,
          warnings: warnings.length > 0 ? warnings : undefined,
        },
      };
    } catch (error) {
      logger.error('Address-to-legislators lookup failed', error as Error, {
        address: request,
        responseTime: Date.now() - startTime,
      });

      // Re-throw if already an AddressLookupException
      if (error instanceof AddressLookupException) {
        throw error;
      }

      // Wrap other errors
      throw new AddressLookupException(
        AddressLookupError.UNKNOWN_ERROR,
        `Failed to find legislators: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      );
    }
  }

  /**
   * Validate address input before processing
   */
  static validateAddress(request: AddressLookupRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Street validation with max length
    if (!request.street || request.street.trim().length === 0) {
      errors.push('Street address is required');
    } else if (request.street.length > 200) {
      errors.push('Street address must be less than 200 characters');
    }

    // City validation with max length
    if (!request.city || request.city.trim().length === 0) {
      errors.push('City is required');
    } else if (request.city.length > 100) {
      errors.push('City must be less than 100 characters');
    }

    // State validation with uppercase check
    if (!request.state || request.state.trim().length === 0) {
      errors.push('State is required');
    } else if (request.state.length !== 2) {
      errors.push('State must be a 2-letter abbreviation (e.g., "MI")');
    } else if (!/^[A-Z]{2}$/.test(request.state)) {
      errors.push('State must be uppercase (e.g., "MI" not "mi")');
    }

    // ZIP code format validation (optional but validated if provided)
    if (request.zip) {
      if (!/^\d{5}(-\d{4})?$/.test(request.zip)) {
        errors.push('ZIP code must be in format 12345 or 12345-6789');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton-style utility function
export const addressToLegislators = {
  findByAddress: (request: AddressLookupRequest) =>
    AddressToLegislatorsService.findLegislatorsByAddress(request),
  validate: (request: AddressLookupRequest) => AddressToLegislatorsService.validateAddress(request),
};

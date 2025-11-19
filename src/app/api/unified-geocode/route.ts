/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Geocode API Endpoint
 *
 * Single source of truth for address-based lookups that returns:
 * - Federal Congressional District
 * - State Senate District
 * - State House/Assembly District
 * - Federal Representatives (Senators + House Rep)
 * - State Legislators (Senator + Representative) for specific districts
 *
 * This replaces the fragmented ZIP-first approach with a unified address-first flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import { censusGeocoder } from '@/services/geocoding/census-geocoder.service';
import { districtLookup } from '@/services/state-legislators/district-lookup.service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import logger from '@/lib/logging/simple-logger';
import { CensusGeocoderException } from '@/services/geocoding/census-geocoder.types';

// ISR: Revalidate every hour - addresses rarely change districts mid-session
export const revalidate = 3600;

interface UnifiedGeocodeRequest {
  /** Full street address */
  street: string;
  /** City */
  city: string;
  /** State abbreviation (e.g., "MI") */
  state: string;
  /** Optional ZIP code */
  zip?: string;
}

interface UnifiedGeocodeResponse {
  success: boolean;
  /** The matched/normalized address from Census */
  matchedAddress?: string;
  /** Coordinates */
  coordinates?: {
    lat: number;
    lon: number;
  };
  /** All district information */
  districts?: {
    federal: {
      state: string;
      district: string;
      districtId: string;
    };
    stateSenate?: {
      number: string;
      name: string;
    };
    stateHouse?: {
      number: string;
      name: string;
    };
  };
  /** Federal representatives (2 Senators + 1 House Rep) */
  federalRepresentatives?: Array<{
    bioguideId: string;
    name: string;
    party: string;
    state: string;
    district?: string;
    chamber: 'House' | 'Senate';
    title: string;
    phone?: string;
    website?: string;
    imageUrl?: string;
  }>;
  /** State legislators (1 Senator + 1 Representative) */
  stateLegislators?: {
    senator?: {
      id: string;
      name: string;
      party: string;
      district: string;
      chamber: 'upper';
      image?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
    representative?: {
      id: string;
      name: string;
      party: string;
      district: string;
      chamber: 'lower';
      image?: string;
      email?: string;
      phone?: string;
      website?: string;
    };
  };
  error?: {
    code: string;
    message: string;
    userMessage?: string;
  };
  metadata?: {
    timestamp: string;
    processingTime: number;
    dataSource: string;
  };
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: UnifiedGeocodeRequest = await request.json();

    logger.info('Unified geocode request', {
      hasStreet: !!body.street,
      hasCity: !!body.city,
      hasState: !!body.state,
      hasZip: !!body.zip,
    });

    // Validate required fields
    if (!body.street || !body.city || !body.state) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Street, city, and state are required',
            userMessage: 'Please provide a complete address with street, city, and state.',
          },
        } as UnifiedGeocodeResponse,
        { status: 400 }
      );
    }

    // Step 1: Geocode address using Census API to get ALL districts
    logger.info('Geocoding address via Census API', {
      street: body.street,
      city: body.city,
      state: body.state,
    });

    const districtInfo = await censusGeocoder.geocodeAddress({
      street: body.street,
      city: body.city,
      state: body.state,
      zip: body.zip,
    });

    logger.info('Census geocoding successful', {
      matchedAddress: districtInfo.matchedAddress,
      hasUpperDistrict: !!districtInfo.upperDistrict,
      hasLowerDistrict: !!districtInfo.lowerDistrict,
      hasCongressionalDistrict: !!districtInfo.congressionalDistrict,
    });

    // Step 2: Fetch federal representatives for the congressional district
    const federalReps = await fetchFederalRepresentatives(
      body.state.toUpperCase(),
      districtInfo.congressionalDistrict?.number || '00'
    );

    // Step 3: Fetch state legislators for the specific state districts
    const stateLegislators = await districtLookup.findLegislatorsByDistrict({
      state: body.state.toUpperCase(),
      upperDistrict: districtInfo.upperDistrict?.number,
      lowerDistrict: districtInfo.lowerDistrict?.number,
    });

    // Build response
    const response: UnifiedGeocodeResponse = {
      success: true,
      matchedAddress: districtInfo.matchedAddress,
      coordinates: districtInfo.coordinates,
      districts: {
        federal: {
          state: body.state.toUpperCase(),
          district: districtInfo.congressionalDistrict?.number || '00',
          districtId: `${body.state.toUpperCase()}-${districtInfo.congressionalDistrict?.number || '00'}`,
        },
        stateSenate: districtInfo.upperDistrict
          ? {
              number: districtInfo.upperDistrict.number,
              name: districtInfo.upperDistrict.name,
            }
          : undefined,
        stateHouse: districtInfo.lowerDistrict
          ? {
              number: districtInfo.lowerDistrict.number,
              name: districtInfo.lowerDistrict.name,
            }
          : undefined,
      },
      federalRepresentatives: federalReps,
      stateLegislators: {
        senator: stateLegislators.senator
          ? {
              id: stateLegislators.senator.id,
              name: stateLegislators.senator.name,
              party: stateLegislators.senator.party,
              district: stateLegislators.senator.district,
              chamber: 'upper' as const,
              image: stateLegislators.senator.photo_url,
              email: stateLegislators.senator.email,
              phone: stateLegislators.senator.phone,
              website: stateLegislators.senator.website,
            }
          : undefined,
        representative: stateLegislators.representative
          ? {
              id: stateLegislators.representative.id,
              name: stateLegislators.representative.name,
              party: stateLegislators.representative.party,
              district: stateLegislators.representative.district,
              chamber: 'lower' as const,
              image: stateLegislators.representative.photo_url,
              email: stateLegislators.representative.email,
              phone: stateLegislators.representative.phone,
              website: stateLegislators.representative.website,
            }
          : undefined,
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataSource: 'census-geocoder + congress.gov + openstates',
      },
    };

    logger.info('Unified geocode successful', {
      federalRepsCount: federalReps?.length || 0,
      hasStateSenator: !!stateLegislators.senator,
      hasStateRep: !!stateLegislators.representative,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error('Unified geocode error', error as Error, {
      processingTime: Date.now() - startTime,
    });

    // Handle Census Geocoder specific errors
    if (error instanceof CensusGeocoderException) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.errorType,
            message: error.message,
            userMessage: getUserFriendlyErrorMessage(error.errorType),
          },
        } as UnifiedGeocodeResponse,
        { status: 400 }
      );
    }

    // Generic error
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred during geocoding',
          userMessage:
            'We encountered an error processing your address. Please try again or verify your address is correct.',
        },
      } as UnifiedGeocodeResponse,
      { status: 500 }
    );
  }
}

/**
 * Fetch federal representatives (Senators + House Rep) for a state/district
 */
async function fetchFederalRepresentatives(
  state: string,
  districtNum: string
): Promise<UnifiedGeocodeResponse['federalRepresentatives']> {
  try {
    const allReps = await RepresentativesCoreService.getAllRepresentatives();

    const federalReps = allReps
      .filter(rep => {
        // Include senators from the state
        if (rep.chamber === 'Senate' && rep.state === state) {
          return true;
        }
        // Include house representative from the district
        if (rep.chamber === 'House' && rep.state === state) {
          const repDistrict = rep.district?.padStart(2, '0') || '00';
          const targetDistrictNorm = districtNum.padStart(2, '0');
          return repDistrict === targetDistrictNorm;
        }
        return false;
      })
      .map(rep => ({
        bioguideId: rep.bioguideId,
        name: rep.name,
        party: rep.party,
        state: rep.state,
        district: rep.district,
        chamber: rep.chamber,
        title: rep.title,
        phone: rep.phone,
        website: rep.website,
        imageUrl: rep.imageUrl,
      }));

    return federalReps;
  } catch (error) {
    logger.error('Error fetching federal representatives', error as Error, {
      state,
      district: districtNum,
    });
    return [];
  }
}

/**
 * Convert Census Geocoder error codes to user-friendly messages
 */
function getUserFriendlyErrorMessage(errorType: string): string {
  switch (errorType) {
    case 'NO_ADDRESS_MATCHES':
    case 'ADDRESS_NOT_FOUND':
      return 'We could not find this address. Please verify the street address, city, and state are correct.';
    case 'MISSING_DISTRICT_DATA':
      return 'We found your address but could not determine the political districts. This address may be in an area without district assignments.';
    case 'RATE_LIMIT':
      return 'Too many requests. Please wait a moment and try again.';
    case 'NETWORK_ERROR':
      return 'Unable to connect to the address lookup service. Please check your internet connection and try again.';
    default:
      return 'An error occurred while processing your address. Please try again.';
  }
}

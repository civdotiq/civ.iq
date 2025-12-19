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
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import { CensusGeocoderException } from '@/services/geocoding/census-geocoder.types';

// ISR: Revalidate every 30 days - addresses/districts are very stable
// Districts only change during redistricting (every 10 years)
// State legislators change during biennial elections (handled by govCache)
export const revalidate = 2592000; // 30 days

// FIPS state codes to 2-letter abbreviations (for deriving state from Census GEOID)
const FIPS_TO_STATE: Record<string, string> = {
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
 * Extract state code from Census GEOID
 * GEOID format: SSFFF where SS is state FIPS code
 */
function getStateFromGEOID(geoid: string): string | null {
  if (!geoid || geoid.length < 2) return null;
  const stateFips = geoid.slice(0, 2);
  return FIPS_TO_STATE[stateFips] || null;
}

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

    // Derive state from Census GEOID (authoritative) rather than trusting client input
    // This prevents issues where client-side address parsing fails to extract correct state
    const derivedState =
      (districtInfo.congressionalDistrict?.geoid &&
        getStateFromGEOID(districtInfo.congressionalDistrict.geoid)) ||
      (districtInfo.upperDistrict?.geoid && getStateFromGEOID(districtInfo.upperDistrict.geoid)) ||
      (districtInfo.lowerDistrict?.geoid && getStateFromGEOID(districtInfo.lowerDistrict.geoid)) ||
      body.state.toUpperCase(); // Fallback to client-provided state

    logger.info('Census geocoding successful', {
      matchedAddress: districtInfo.matchedAddress,
      hasUpperDistrict: !!districtInfo.upperDistrict,
      hasLowerDistrict: !!districtInfo.lowerDistrict,
      hasCongressionalDistrict: !!districtInfo.congressionalDistrict,
      derivedState,
      clientState: body.state.toUpperCase(),
    });

    // Step 2: Fetch federal representatives for the congressional district
    const federalReps = await fetchFederalRepresentatives(
      derivedState,
      districtInfo.congressionalDistrict?.number || '00'
    );

    // Step 3: Fetch state legislators using EITHER geographic or district-based lookup
    // Try geographic lookup first (faster, single API call), fallback to district-based
    let stateLegislators: Awaited<ReturnType<typeof districtLookup.findLegislatorsByDistrict>> = {
      senator: null,
      representative: null,
    };

    if (districtInfo.coordinates) {
      try {
        logger.info('Attempting geographic state legislator lookup', {
          lat: districtInfo.coordinates.lat,
          lon: districtInfo.coordinates.lon,
        });

        const geoLegislators = await StateLegislatureCoreService.getStateLegislatorsByLocation(
          districtInfo.coordinates.lat,
          districtInfo.coordinates.lon
        );

        if (geoLegislators.senator || geoLegislators.representative) {
          // Success! Use geographic lookup results
          // Transform EnhancedStateLegislator to match districtLookup return type
          stateLegislators = {
            senator: geoLegislators.senator
              ? {
                  id: geoLegislators.senator.id,
                  name: geoLegislators.senator.name,
                  party: geoLegislators.senator.party,
                  state: geoLegislators.senator.state,
                  chamber: geoLegislators.senator.chamber,
                  district: geoLegislators.senator.district,
                  photo_url: geoLegislators.senator.photo_url,
                  email: geoLegislators.senator.email,
                  phone: geoLegislators.senator.phone,
                  website: undefined,
                }
              : null,
            representative: geoLegislators.representative
              ? {
                  id: geoLegislators.representative.id,
                  name: geoLegislators.representative.name,
                  party: geoLegislators.representative.party,
                  state: geoLegislators.representative.state,
                  chamber: geoLegislators.representative.chamber,
                  district: geoLegislators.representative.district,
                  photo_url: geoLegislators.representative.photo_url,
                  email: geoLegislators.representative.email,
                  phone: geoLegislators.representative.phone,
                  website: undefined,
                }
              : null,
          };

          logger.info('Geographic state legislator lookup successful', {
            hasSenator: !!stateLegislators.senator,
            hasRep: !!stateLegislators.representative,
          });
        } else {
          // No results from geographic lookup, fallback
          throw new Error('No legislators found via geographic lookup');
        }
      } catch (geoError) {
        // Fallback to district-based lookup
        logger.warn('Geographic lookup failed, falling back to district-based lookup', {
          error: geoError instanceof Error ? geoError.message : 'Unknown error',
        });

        stateLegislators = await districtLookup.findLegislatorsByDistrict({
          state: body.state.toUpperCase(),
          upperDistrict: districtInfo.upperDistrict?.number,
          lowerDistrict: districtInfo.lowerDistrict?.number,
        });
      }
    } else {
      // No coordinates available, use district-based lookup
      stateLegislators = await districtLookup.findLegislatorsByDistrict({
        state: body.state.toUpperCase(),
        upperDistrict: districtInfo.upperDistrict?.number,
        lowerDistrict: districtInfo.lowerDistrict?.number,
      });
    }

    // Build response
    const response: UnifiedGeocodeResponse = {
      success: true,
      matchedAddress: districtInfo.matchedAddress,
      coordinates: districtInfo.coordinates,
      districts: {
        federal: {
          state: derivedState,
          district: districtInfo.congressionalDistrict?.number || '00',
          districtId: `${derivedState}-${districtInfo.congressionalDistrict?.number || '00'}`,
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

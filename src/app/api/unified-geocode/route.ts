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
 * - Federal Representatives (Senators + House member or delegate)
 * - Every state legislator for the address's districts, from the roster corpus
 *
 * Resolution lives in resolve-representatives.service.ts; this route keeps
 * its response shape and adds the multi-member fields.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { CensusGeocoderException } from '@/services/geocoding/census-geocoder.types';
import type { BallotDistrict2026 } from '@/lib/data-sources/cd120-districts';
import {
  resolveByAddress,
  stateMembersByBucket,
  type FederalMember,
  type StateMember,
  type StateSeat,
} from '@/services/lookup/resolve-representatives.service';

// ISR: Revalidate every 30 days - addresses/districts are very stable
// Districts only change during redistricting (every 10 years)
// State legislators change during biennial elections (handled by govCache)
export const revalidate = 2592000; // 30 days

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
  /**
   * ADDITIVE: the 120th-Congress district on the Nov 3, 2026 ballot, from the
   * committed CD120 corpus. `districts.federal` stays the 119th-Congress
   * (current representative) answer; in the ten redrawn states they differ.
   * Omitted when the corpus is unavailable or no coordinates were resolved.
   */
  ballotDistrict2026?: BallotDistrict2026;
  /** Senators plus the House member or delegate. */
  federalRepresentatives?: FederalMember[];
  stateLegislators?: {
    /** First member holding the address's upper-bucket district (one-per-chamber legacy field). */
    senator?: ReturnType<typeof legacyLegislator<'upper'>>;
    /** First member holding the address's lower-bucket district (one-per-chamber legacy field). */
    representative?: ReturnType<typeof legacyLegislator<'lower'>>;
    /** ADDITIVE: every upper-bucket member for the address, at-large members last. */
    senators?: StateMember[];
    /** ADDITIVE: every lower-bucket member for the address, at-large members last. */
    representatives?: StateMember[];
  };
  /** ADDITIVE: per Census district, how it maps to the legislature and who holds it. */
  stateSeats?: StateSeat[];
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

    // Privacy: never log the street address (see PRIVACY.md "Address lookups")
    logger.info('Resolving address', { city: body.city, state: body.state });

    const resolved = await resolveByAddress({
      street: body.street,
      city: body.city,
      state: body.state,
      zip: body.zip,
    });
    const { state, congressionalDistrict: cd } = resolved;
    const upperSeat = resolved.stateSeats.find(s => s.censusChamber === 'upper');
    const lowerSeat = resolved.stateSeats.find(s => s.censusChamber === 'lower');
    const byBucket = stateMembersByBucket(resolved.stateSeats);
    // The one-per-chamber fields predate multi-member seats: first district holder.
    const senator = byBucket.upper.find(m => !m.atLarge);
    const representative = byBucket.lower.find(m => !m.atLarge);
    const cdNumber = cd?.number || '00';

    // Build response
    const response: UnifiedGeocodeResponse = {
      success: true,
      matchedAddress: resolved.matchedAddress,
      coordinates: resolved.coordinates,
      districts: {
        federal: {
          state,
          district: cdNumber,
          districtId: `${state}-${cdNumber}`,
        },
        stateSenate: upperSeat
          ? { number: upperSeat.census.number, name: upperSeat.census.name }
          : undefined,
        stateHouse: lowerSeat
          ? { number: lowerSeat.census.number, name: lowerSeat.census.name }
          : undefined,
      },
      ...(resolved.ballotDistrict2026 ? { ballotDistrict2026: resolved.ballotDistrict2026 } : {}),
      federalRepresentatives: resolved.federal ?? [],
      stateLegislators: {
        senator: senator ? legacyLegislator(senator, 'upper') : undefined,
        representative: representative ? legacyLegislator(representative, 'lower') : undefined,
        senators: byBucket.upper,
        representatives: byBucket.lower,
      },
      stateSeats: resolved.stateSeats,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        dataSource: 'census-geocoder + congress-legislators + openstates-people corpus',
      },
    };

    logger.info('Unified geocode successful', {
      federalRepsCount: resolved.federal?.length ?? 0,
      seatStatuses: resolved.stateSeats.map(s => `${s.censusChamber}:${s.status}`).join(','),
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=5184000',
      },
    });
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

/** The one-member-per-chamber shape the route returned before multi-member seats. */
function legacyLegislator<C extends 'upper' | 'lower'>(m: StateMember, chamber: C) {
  return {
    id: m.id,
    name: m.name,
    party: m.party,
    district: m.district,
    chamber,
    image: m.image,
    email: m.email,
    phone: m.phone,
    website: m.website,
  };
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

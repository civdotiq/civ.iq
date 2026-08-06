/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Address → council district → members.
 *
 * GET /api/city/detroit/district?address=<full street address>
 *
 * Census Geocoder resolves the address to a point; the city's own district
 * layer answers which council district contains it; the verified roster
 * corpus maps the district to the members who represent it (district seat
 * plus both at-large seats). Detroit only for now — other pilot cities
 * return an honest not-supported error rather than a wrong answer.
 */

import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, formatMatchedAddress } from '@/lib/census-geocoder';
import logger from '@/lib/logging/simple-logger';
import {
  DETROIT_ROSTER_META,
  getDetroitMembersForDistrict,
} from '@/lib/local-government/detroit-council-roster';
import {
  DETROIT_DISTRICT_LAYER,
  lookupDetroitCouncilDistrict,
} from '@/lib/local-government/detroit-district-lookup';
import { CITY_CONFIGS } from '@/lib/local-government/pilot-cities';
import type { DetroitCouncilSeat } from '@/lib/local-government/detroit-council-roster';

export const dynamic = 'force-dynamic';

export interface CityDistrictLookupResponse {
  success: boolean;
  city: { id: string; name: string; state: string };
  query: { address: string };
  match: { matchedAddress: string; longitude: number; latitude: number } | null;
  district: { number: number; name: string } | null;
  members: Array<{
    name: string;
    seat: string;
    title: string | null;
    website: string;
  }>;
  metadata: {
    generatedAt: string;
    districtSource: string;
    boundariesEffective: string;
    rosterSource: string;
    rosterVerifiedAt: string;
  };
  error?: string;
}

function buildMetadata(): CityDistrictLookupResponse['metadata'] {
  return {
    generatedAt: new Date().toISOString(),
    districtSource: DETROIT_DISTRICT_LAYER.source,
    boundariesEffective: DETROIT_DISTRICT_LAYER.boundariesEffective,
    rosterSource: DETROIT_ROSTER_META.source,
    rosterVerifiedAt: DETROIT_ROSTER_META.verifiedAt,
  };
}

function errorResponse(
  status: number,
  cityId: string,
  address: string,
  error: string
): NextResponse<CityDistrictLookupResponse> {
  const config = CITY_CONFIGS[cityId];
  return NextResponse.json(
    {
      success: false,
      city: config
        ? { id: config.id, name: config.name, state: config.state }
        : { id: cityId, name: cityId, state: '' },
      query: { address },
      match: null,
      district: null,
      members: [],
      metadata: buildMetadata(),
      error,
    },
    { status }
  );
}

function toMemberSummary(seat: DetroitCouncilSeat) {
  return {
    name: seat.name,
    seat: seat.district === null ? 'At-Large' : `District ${seat.district}`,
    title: seat.title,
    website: seat.website,
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
): Promise<NextResponse<CityDistrictLookupResponse>> {
  const { cityId } = await params;
  const normalizedCityId = cityId.toLowerCase();
  const address = request.nextUrl.searchParams.get('address')?.trim() ?? '';

  if (!CITY_CONFIGS[normalizedCityId]) {
    const available = Object.keys(CITY_CONFIGS).join(', ');
    return errorResponse(
      400,
      normalizedCityId,
      address,
      `City not supported. Available cities: ${available}`
    );
  }

  if (normalizedCityId !== 'detroit') {
    return errorResponse(
      501,
      normalizedCityId,
      address,
      'District lookup is currently only available for Detroit.'
    );
  }

  if (!address) {
    return errorResponse(400, normalizedCityId, address, 'Missing required "address" parameter.');
  }

  // ZIP codes are wrong 10-20% of the time for district lookup; a bare ZIP
  // is refused rather than answered wrongly.
  if (/^\d{5}(-\d{4})?$/.test(address)) {
    return errorResponse(
      400,
      normalizedCityId,
      address,
      'A full street address is required — ZIP code boundaries do not align with council districts.'
    );
  }

  const geocoded = await geocodeAddress(address);
  if ('error' in geocoded) {
    const status = geocoded.code === 'NO_MATCH' ? 404 : 502;
    return errorResponse(status, normalizedCityId, address, geocoded.error);
  }

  const match = geocoded[0];
  if (!match) {
    return errorResponse(404, normalizedCityId, address, 'No matching address found.');
  }

  const { x: longitude, y: latitude } = match.coordinates;
  const lookup = await lookupDetroitCouncilDistrict(longitude, latitude);
  if (!lookup.ok) {
    return errorResponse(502, normalizedCityId, address, lookup.error);
  }

  if (lookup.district === null) {
    return errorResponse(
      404,
      normalizedCityId,
      address,
      'This address is outside Detroit city limits, so it has no Detroit council district.'
    );
  }

  const members = getDetroitMembersForDistrict(lookup.district);
  if (members.length === 0) {
    // The layer returned a district number the roster does not know —
    // surface the inconsistency instead of a partial answer.
    logger.error(
      'Detroit district layer returned a district missing from the roster',
      new Error(`district ${lookup.district}`)
    );
    return errorResponse(
      502,
      normalizedCityId,
      address,
      `District ${lookup.district} is not in the verified roster. Data unavailable.`
    );
  }

  logger.info('Detroit district lookup success', { district: lookup.district });

  return NextResponse.json(
    {
      success: true,
      city: { id: 'detroit', name: 'Detroit', state: 'MI' },
      query: { address },
      match: {
        matchedAddress: formatMatchedAddress(match),
        longitude,
        latitude,
      },
      district: { number: lookup.district, name: `District ${lookup.district}` },
      members: members.map(toMemberSummary),
      metadata: buildMetadata(),
    },
    {
      headers: {
        // District assignment for an address is stable between redraws
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}

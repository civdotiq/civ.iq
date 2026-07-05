/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { districtLookupService } from '@/services/district-lookup';
import logger from '@/lib/logging/simple-logger';
import { getAllCongressionalDistrictsForZip } from '@/lib/data/zip-district-mapping';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import {
  getZipAccuracyNote,
  BOUNDARY_FALLBACK_NOTE,
  type InputMode,
} from '@/lib/backbone/zip-accuracy';
import type { DataQuality, SourceStatus } from '@/types/backbone-response';

function sourceStatusOf(
  source: string,
  status: SourceStatus['status'],
  errorMessage?: string
): SourceStatus {
  return {
    source,
    status,
    ...(errorMessage ? { errorMessage } : {}),
    fetchedAt: new Date().toISOString(),
  };
}

// Dynamic route with ISR caching - uses searchParams
export const dynamic = 'force-dynamic';

interface GeocodeRequest {
  mode: 'address' | 'coordinates';
  address?: string;
  latitude?: number;
  longitude?: number;
  zipCode?: string;
}

interface GeocodeResponse {
  success: boolean;
  district?: {
    state: string;
    district: string;
    districtId: string;
    name: string;
  };
  representatives?: unknown[];
  stateLegislators?: unknown[];
  stateInfo?: {
    state: string;
    stateName: string;
    legislatorCount: number;
  };
  geocoded?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  isMultiDistrict?: boolean;
  allDistricts?: Array<{
    state: string;
    district: string;
    name: string;
  }>;
  /**
   * How the district was resolved. 'census_api' is the authoritative Census
   * point-in-polygon path; 'bbox'/'fallback' mean the boundary service
   * degraded to bounding-box or centroid-distance matching, and the result
   * carries BOUNDARY_FALLBACK_NOTE in accuracyNote.
   */
  lookup?: {
    method: 'geometry' | 'bbox' | 'census_api' | 'fallback';
    confidence: number;
  };
  // Populated only when the resolved district was inherited from ZIP input
  // (either via `body.zipCode` on POST or because the address resolved to a
  // ZIP-spanning block). Per .claude/rules/security.md, ZIP ↔ district
  // alignment is 10–20% wrong — consumers should surface this to end users.
  accuracyNote?: string;
  // ADDITIVE BackboneResponse fields. This route is publicly documented in
  // openapi.json, so the existing top-level payload is preserved and the
  // envelope's honesty fields are added alongside it (decision 2026-07-05)
  // rather than wrapping the payload under `data`.
  dataQuality?: DataQuality;
  sourceStatus?: SourceStatus[];
  error?: {
    code: string;
    message: string;
  };
}

// GET handler for simple coordinate-to-ZIP lookups
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);

  try {
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    if (!lat || !lng) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing lat or lng parameters',
        },
        { status: 400 }
      );
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid lat or lng values',
        },
        { status: 400 }
      );
    }

    logger.info('Geocode GET request', { latitude, longitude });

    // Initialize district lookup service
    await districtLookupService.initialize();

    // Find district by coordinates
    const result = await districtLookupService.findDistrictByCoordinates(latitude, longitude);

    if (!result.found || !result.district) {
      return NextResponse.json(
        {
          success: false,
          error: 'Could not find district for these coordinates',
        },
        { status: 404 }
      );
    }

    // Try to get ZIP code from the geocoded address if available
    let zipCode: string | undefined;

    // The district lookup service might provide additional geocoded info
    // For now, we'll use a reverse geocoding service to get the ZIP
    try {
      const censusUrl = `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${longitude}&y=${latitude}&benchmark=Public_AR_Current&vintage=Current_Current&format=json&layers=all`;
      const censusResponse = await fetch(censusUrl);

      if (censusResponse.ok) {
        const censusData = await censusResponse.json();

        // Check if we can extract ZIP from the matched address
        if (censusData.result?.addressMatches?.[0]?.matchedAddress) {
          const addressMatch = censusData.result.addressMatches[0].matchedAddress;
          const zipMatch = addressMatch.match(/\b(\d{5})\b/);
          if (zipMatch) {
            zipCode = zipMatch[1];
          }
        }
      }
    } catch (error) {
      logger.warn('Failed to get ZIP from Census geocoding', {
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }

    logger.info('Geocode GET successful', {
      latitude,
      longitude,
      state: result.district.state_abbr,
      district: result.district.district_num,
      zipCode,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        zipCode,
        district: {
          state: result.district.state_abbr,
          district: result.district.district_num,
          districtId: result.district.id,
          name: result.district.name,
        },
        coordinates: {
          latitude,
          longitude,
        },
        lookup: {
          method: result.method,
          confidence: result.confidence,
        },
        // Coordinates are precise input; quality only degrades when the
        // boundary service fell back from Census point-in-polygon
        dataQuality: (result.method === 'census_api' ? 'complete' : 'partial') as DataQuality,
        sourceStatus: [
          sourceStatusOf(
            'census-geocoder',
            'ok',
            result.method !== 'census_api' ? `degraded to ${result.method}` : undefined
          ),
        ],
        ...(result.method !== 'census_api' ? { accuracyNote: BOUNDARY_FALLBACK_NOTE } : {}),
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    logger.error('Geocode GET error', error as Error, {
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during geocoding',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const body: GeocodeRequest = await request.json();

    logger.info('Geocode API request', {
      mode: body.mode,
      hasAddress: !!body.address,
      hasCoordinates: !!(body.latitude && body.longitude),
      hasZip: !!body.zipCode,
    });

    // Validate request
    if (body.mode === 'address' && !body.address) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ADDRESS',
            message: 'Address is required for address mode',
          },
        } as GeocodeResponse,
        { status: 400 }
      );
    }

    if (body.mode === 'coordinates' && (!body.latitude || !body.longitude)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_COORDINATES',
            message: 'Latitude and longitude are required for coordinates mode',
          },
        } as GeocodeResponse,
        { status: 400 }
      );
    }

    // Initialize district lookup service
    await districtLookupService.initialize();

    let result;
    let geocoded;

    if (body.mode === 'coordinates' && body.latitude && body.longitude) {
      // Direct coordinate lookup
      result = await districtLookupService.findDistrictByCoordinates(body.latitude, body.longitude);
      geocoded = {
        latitude: body.latitude,
        longitude: body.longitude,
        address: 'Current Location',
      };
    } else if (body.mode === 'address' && body.address) {
      // Address geocoding and lookup
      let fullAddress = body.address;
      if (body.zipCode) {
        // Append ZIP code if not already in address
        if (!fullAddress.includes(body.zipCode)) {
          fullAddress = `${fullAddress} ${body.zipCode}`;
        }
      }

      result = await districtLookupService.findDistrictByAddress(fullAddress);
      geocoded = result.geocoded;
    } else {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid geocoding request',
          },
        } as GeocodeResponse,
        { status: 400 }
      );
    }

    if (!result.found || !result.district) {
      logger.warn('District not found for geocoding request', {
        mode: body.mode,
        confidence: result.confidence,
        method: result.method,
      });

      return NextResponse.json(
        {
          success: false,
          geocoded,
          dataQuality: 'empty',
          sourceStatus: [
            sourceStatusOf('census-geocoder', 'ok', 'No district matched this location'),
          ],
          error: {
            code: 'DISTRICT_NOT_FOUND',
            message: result.error || 'Could not determine congressional district for this location',
          },
        } as GeocodeResponse,
        { status: 404 }
      );
    }

    // Extract state and district from the result
    const state = result.district.state_abbr;
    const districtNum = result.district.district_num;

    // Check if this ZIP code (if provided) spans multiple districts
    let isMultiDistrict = false;
    let allDistricts: GeocodeResponse['allDistricts'] = [];

    if (body.zipCode) {
      const zipDistricts = getAllCongressionalDistrictsForZip(body.zipCode);
      if (zipDistricts && zipDistricts.length > 1) {
        isMultiDistrict = true;
        allDistricts = zipDistricts.map(d => ({
          state: d.state,
          district: d.district,
          name:
            d.district === '00' || d.district === 'AL'
              ? `${d.state} At-Large`
              : `${d.state} District ${d.district}`,
        }));
      }
    }

    // Fetch federal representatives for the found district
    let representatives: unknown[] = [];
    let repsFailed = false;
    try {
      const allReps = await RepresentativesCoreService.getAllRepresentatives();
      representatives = allReps.filter(rep => {
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
      });
    } catch (error) {
      repsFailed = true;
      logger.error('Error fetching representatives for geocoded district', error as Error, {
        state,
        district: districtNum,
      });
    }

    // Fetch state legislators for the state
    let stateLegislators: unknown[] = [];
    let stateInfo;
    let stateLegsFailed = false;
    try {
      const legislators = await StateLegislatureCoreService.getAllStateLegislators(state);
      stateLegislators = legislators;

      // Get state name from the jurisdiction
      const jurisdiction = await StateLegislatureCoreService.getStateJurisdiction(state);

      stateInfo = {
        state,
        stateName: jurisdiction?.name || state,
        legislatorCount: legislators.length,
      };
    } catch (error) {
      stateLegsFailed = true;
      logger.error('Error fetching state legislators for geocoded location', error as Error, {
        state,
      });
    }

    // Determine input mode for ZIP-honesty. POST supports three inputs:
    //   • coordinates → 'lat-lon' (precise)
    //   • address-only → 'address' (authoritative)
    //   • address + zipCode → we treat the zipCode branch as ZIP-adjacent,
    //     because the returned isMultiDistrict/allDistricts fields are
    //     derived from ZIP → district mapping, which is 10–20% wrong.
    const inputMode: InputMode =
      body.mode === 'coordinates' ? 'lat-lon' : body.zipCode ? 'zip' : 'address';

    // Honesty: the district itself is only authoritative when it came from the
    // Census point-in-polygon path. If the boundary service degraded to
    // bbox/centroid matching, say so — even for full-address input.
    const boundaryDegraded = result.method !== 'census_api';
    const noteParts = [
      ...(boundaryDegraded ? [BOUNDARY_FALLBACK_NOTE] : []),
      ...(getZipAccuracyNote(inputMode) ? [getZipAccuracyNote(inputMode) as string] : []),
    ];
    const accuracyNote = noteParts.length > 0 ? noteParts.join(' ') : undefined;

    // Additive envelope quality: 'complete' only for authoritative input
    // (non-ZIP) resolved via Census point-in-polygon with all sub-sources
    // healthy; ZIP input, boundary degradation, or a failed sub-source
    // all cap it at 'partial'.
    const dataQuality: DataQuality =
      inputMode !== 'zip' && !boundaryDegraded && !repsFailed && !stateLegsFailed
        ? 'complete'
        : 'partial';

    const response: GeocodeResponse = {
      success: true,
      district: {
        state,
        district: districtNum,
        districtId: result.district.id,
        name: result.district.name,
      },
      representatives,
      stateLegislators,
      stateInfo,
      geocoded,
      isMultiDistrict,
      lookup: {
        method: result.method,
        confidence: result.confidence,
      },
      dataQuality,
      sourceStatus: [
        sourceStatusOf(
          'census-geocoder',
          'ok',
          boundaryDegraded ? `degraded to ${result.method}` : undefined
        ),
        sourceStatusOf(
          'congress-legislators',
          repsFailed ? 'error' : 'ok',
          repsFailed ? 'Representative lookup failed' : undefined
        ),
        sourceStatusOf(
          'openstates',
          stateLegsFailed ? 'error' : 'ok',
          stateLegsFailed ? 'State legislator lookup failed' : undefined
        ),
      ],
      ...(isMultiDistrict && { allDistricts }),
      ...(accuracyNote ? { accuracyNote } : {}),
    };

    logger.info('Geocode API request successful', {
      mode: body.mode,
      state,
      district: districtNum,
      confidence: result.confidence,
      method: result.method,
      representativeCount: representatives.length,
      stateLegislatorCount: stateLegislators.length,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('Geocode API error', error as Error, {
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        dataQuality: 'unavailable',
        sourceStatus: [
          sourceStatusOf(
            'geocode-api',
            'error',
            error instanceof Error ? error.message : 'Unknown error'
          ),
        ],
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred during geocoding',
        },
      } as GeocodeResponse,
      { status: 500 }
    );
  }
}

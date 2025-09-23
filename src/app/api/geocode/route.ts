/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { districtLookupService } from '@/services/district-lookup';
import logger from '@/lib/logging/simple-logger';
import { getAllCongressionalDistrictsForZip } from '@/lib/data/zip-district-mapping';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';

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
  error?: {
    code: string;
    message: string;
  };
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

    // Fetch representatives for the found district
    let representatives: unknown[] = [];
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
      logger.error('Error fetching representatives for geocoded district', error as Error, {
        state,
        district: districtNum,
      });
    }

    const response: GeocodeResponse = {
      success: true,
      district: {
        state,
        district: districtNum,
        districtId: result.district.id,
        name: result.district.name,
      },
      representatives,
      geocoded,
      isMultiDistrict,
      ...(isMultiDistrict && { allDistricts }),
    };

    logger.info('Geocode API request successful', {
      mode: body.mode,
      state,
      district: districtNum,
      confidence: result.confidence,
      method: result.method,
      representativeCount: representatives.length,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error('Geocode API error', error as Error, {
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal error occurred during geocoding',
        },
      } as GeocodeResponse,
      { status: 500 }
    );
  }
}

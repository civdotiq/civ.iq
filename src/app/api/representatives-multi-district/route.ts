/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllCongressionalDistrictsForZip,
  isZipMultiDistrict,
} from '@/lib/data/zip-district-mapping';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import type { MultiDistrictResponse, DistrictInfo } from '@/lib/multi-district/detection';
import logger from '@/lib/logging/simple-logger';
import { ZIP_ACCURACY_NOTE } from '@/lib/backbone/zip-accuracy';
import type { SourceStatus } from '@/types/backbone-response';

// Dynamic route with ISR caching - uses searchParams
export const dynamic = 'force-dynamic';

function failureEnvelope(args: {
  zipCode: string;
  startTime: number;
  dataSource: string;
  lookupMethod: 'comprehensive' | 'fallback';
  zipFound: boolean;
  source: string;
  sourceStatus: SourceStatus['status'];
  errorCode: string;
  errorMessage: string;
  errorDetails?: unknown;
  dataQuality: MultiDistrictResponse['dataQuality'];
}): MultiDistrictResponse {
  return {
    data: {
      zipCode: args.zipCode,
      isMultiDistrict: false,
      districts: [],
      metadata: {
        timestamp: new Date().toISOString(),
        dataSource: args.dataSource,
        totalDistricts: 0,
        lookupMethod: args.lookupMethod,
        processingTime: Date.now() - args.startTime,
        coverage: {
          zipFound: args.zipFound,
          representativesFound: false,
        },
      },
    },
    dataQuality: args.dataQuality,
    sourceStatus: [
      {
        source: args.source,
        status: args.sourceStatus,
        errorMessage: args.errorMessage,
        fetchedAt: new Date().toISOString(),
      },
    ],
    error: {
      code: args.errorCode,
      message: args.errorMessage,
      ...(args.errorDetails !== undefined ? { details: args.errorDetails } : {}),
    },
  };
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;
  const zipCode = searchParams.get('zip');
  const selectedDistrict = searchParams.get('district');

  logger.info('Multi-district API request started', { zipCode, selectedDistrict });

  // Input validation
  if (!zipCode) {
    return NextResponse.json(
      failureEnvelope({
        zipCode: '',
        startTime,
        dataSource: 'validation-error',
        lookupMethod: 'fallback',
        zipFound: false,
        source: 'input-validation',
        sourceStatus: 'error',
        errorCode: 'MISSING_ZIP_CODE',
        errorMessage: 'ZIP code parameter is required',
        dataQuality: 'unavailable',
      }),
      { status: 400 }
    );
  }

  // Validate ZIP code format
  if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
    return NextResponse.json(
      failureEnvelope({
        zipCode,
        startTime,
        dataSource: 'validation-error',
        lookupMethod: 'fallback',
        zipFound: false,
        source: 'input-validation',
        sourceStatus: 'error',
        errorCode: 'INVALID_ZIP_CODE',
        errorMessage: 'ZIP code must be 5 digits (e.g., 10001) or 9 digits (e.g., 10001-1234)',
        dataQuality: 'unavailable',
      }),
      { status: 400 }
    );
  }

  try {
    // Get all districts for this ZIP code
    const allDistrictMappings = getAllCongressionalDistrictsForZip(zipCode);
    const isMultiDistrict = isZipMultiDistrict(zipCode);

    logger.info('District lookup completed', {
      zipCode,
      districtCount: allDistrictMappings?.length || 0,
      isMultiDistrict,
    });

    if (!allDistrictMappings || allDistrictMappings.length === 0) {
      // The mapping answered but holds nothing for this ZIP — 'empty'
      // (no data exists), not an upstream outage
      return NextResponse.json(
        failureEnvelope({
          zipCode,
          startTime,
          dataSource: 'zip-district-mapping',
          lookupMethod: 'comprehensive',
          zipFound: false,
          source: 'zip-district-mapping',
          sourceStatus: 'ok',
          errorCode: 'DISTRICT_NOT_FOUND',
          errorMessage: `No congressional districts found for ZIP code ${zipCode}`,
          errorDetails:
            'This ZIP code may be invalid or not currently mapped to a congressional district',
          dataQuality: 'empty',
        }),
        { status: 404 }
      );
    }

    // Convert to DistrictInfo format
    const districts: DistrictInfo[] = allDistrictMappings.map((mapping, index) => ({
      state: mapping.state,
      district: mapping.district,
      primary: index === 0, // Mark first district as primary
      confidence: 'high' as const,
    }));

    // Determine primary district (first one in the list)
    const primaryDistrict = districts[0];

    // Get representatives for the districts
    let representatives: unknown[] = [];
    let representativesFound = false;

    try {
      if (selectedDistrict) {
        // User has selected a specific district - get representatives for that district only
        const targetDistrict = districts.find(
          d => `${d.state}-${d.district}` === selectedDistrict || d.district === selectedDistrict
        );

        if (targetDistrict) {
          const allReps = await RepresentativesCoreService.getAllRepresentatives();
          representatives = allReps.filter(rep => {
            // Include senators from the state
            if (rep.chamber === 'Senate' && rep.state === targetDistrict.state) {
              return true;
            }
            // Include house representative from specific district
            if (rep.chamber === 'House' && rep.state === targetDistrict.state) {
              const repDistrict = rep.district?.padStart(2, '0') || '00';
              const targetDistrictNorm = targetDistrict.district.padStart(2, '0');
              return repDistrict === targetDistrictNorm;
            }
            return false;
          });
          representativesFound = representatives.length > 0;
        }
      } else if (!isMultiDistrict) {
        // Single district - get all representatives
        const primaryState = primaryDistrict?.state;
        const primaryDistrictNum = primaryDistrict?.district;

        if (primaryState && primaryDistrictNum) {
          const allReps = await RepresentativesCoreService.getAllRepresentatives();
          representatives = allReps.filter(rep => {
            // Include senators from the state
            if (rep.chamber === 'Senate' && rep.state === primaryState) {
              return true;
            }
            // Include house representative from the district
            if (rep.chamber === 'House' && rep.state === primaryState) {
              const repDistrict = rep.district?.padStart(2, '0') || '00';
              const targetDistrictNorm = primaryDistrictNum.padStart(2, '0');
              return repDistrict === targetDistrictNorm;
            }
            return false;
          });
          representativesFound = representatives.length > 0;
        }
      }
      // For multi-district ZIPs without selection, don't return representatives
      // This will prompt the user to select a district or provide an address
    } catch (error) {
      logger.error('Error fetching representatives', error as Error, { zipCode });
      // Continue without representatives - the response will indicate this
    }

    const warnings = [];
    if (isMultiDistrict && !selectedDistrict) {
      warnings.push(
        `This ZIP code spans ${districts.length} congressional districts. Please provide your street address or select a district for accurate representation.`
      );
      // Don't return representatives for multi-district ZIPs without selection
      // This forces users to select a district first, preventing confusion
      // (e.g., showing 4 representatives instead of 3 for Las Vegas ZIPs)
    }

    // ZIP is always the input for this route — surface the honesty signal
    // unconditionally. Multi-district ZIPs are the clearest case, but
    // single-district ZIPs can also mis-align with districts after
    // redistricting. ZIP input is never 'complete' → 'partial' at best.
    const response: MultiDistrictResponse = {
      data: {
        zipCode,
        isMultiDistrict,
        districts,
        primaryDistrict,
        representatives,
        warnings,
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'zip-district-mapping + congress-legislators',
          totalDistricts: districts.length,
          lookupMethod: 'comprehensive',
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: true,
            representativesFound,
          },
        },
      },
      dataQuality: 'partial',
      sourceStatus: [
        {
          source: 'zip-district-mapping',
          status: 'ok',
          fetchedAt: new Date().toISOString(),
        },
        {
          source: 'congress-legislators',
          status: 'ok',
          fetchedAt: new Date().toISOString(),
        },
      ],
      accuracyNote: ZIP_ACCURACY_NOTE,
    };

    logger.info('Multi-district API request completed successfully', {
      zipCode,
      isMultiDistrict,
      districtCount: districts.length,
      representativeCount: representatives.length,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('Unexpected error in multi-district API', error as Error, { zipCode });

    return NextResponse.json(
      failureEnvelope({
        zipCode,
        startTime,
        dataSource: 'error',
        lookupMethod: 'fallback',
        zipFound: false,
        source: 'representatives-multi-district',
        sourceStatus: 'error',
        errorCode: 'INTERNAL_ERROR',
        errorMessage: 'An internal server error occurred',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        dataQuality: 'unavailable',
      }),
      { status: 500 }
    );
  }
}

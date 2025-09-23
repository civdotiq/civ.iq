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
import { MultiDistrictResponse, DistrictInfo } from '@/lib/multi-district/detection';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;
  const zipCode = searchParams.get('zip');
  const selectedDistrict = searchParams.get('district');

  logger.info('Multi-district API request started', { zipCode, selectedDistrict });

  // Input validation
  if (!zipCode) {
    return NextResponse.json(
      {
        success: false,
        zipCode: '',
        isMultiDistrict: false,
        districts: [],
        error: {
          code: 'MISSING_ZIP_CODE',
          message: 'ZIP code parameter is required',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'validation-error',
          totalDistricts: 0,
          lookupMethod: 'fallback',
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: false,
            representativesFound: false,
            dataQuality: 'poor',
          },
        },
      } as MultiDistrictResponse,
      { status: 400 }
    );
  }

  // Validate ZIP code format
  if (!/^\d{5}(-\d{4})?$/.test(zipCode)) {
    return NextResponse.json(
      {
        success: false,
        zipCode,
        isMultiDistrict: false,
        districts: [],
        error: {
          code: 'INVALID_ZIP_CODE',
          message: 'ZIP code must be 5 digits (e.g., 10001) or 9 digits (e.g., 10001-1234)',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'validation-error',
          totalDistricts: 0,
          lookupMethod: 'fallback',
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: false,
            representativesFound: false,
            dataQuality: 'poor',
          },
        },
      } as MultiDistrictResponse,
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
      return NextResponse.json(
        {
          success: false,
          zipCode,
          isMultiDistrict: false,
          districts: [],
          error: {
            code: 'DISTRICT_NOT_FOUND',
            message: `No congressional districts found for ZIP code ${zipCode}`,
            details:
              'This ZIP code may be invalid or not currently mapped to a congressional district',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: 'zip-district-mapping',
            totalDistricts: 0,
            lookupMethod: 'comprehensive',
            processingTime: Date.now() - startTime,
            coverage: {
              zipFound: false,
              representativesFound: false,
              dataQuality: 'poor',
            },
          },
        } as MultiDistrictResponse,
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

      // When multi-district with no selection, include all possible representatives
      const allStates = [...new Set(districts.map(d => d.state))];
      try {
        const allReps = await RepresentativesCoreService.getAllRepresentatives();
        representatives = allReps.filter(rep => {
          // Include all senators from states in the multi-district ZIP
          if (rep.chamber === 'Senate' && allStates.includes(rep.state)) {
            return true;
          }
          // Include all house representatives from the districts
          if (rep.chamber === 'House') {
            return districts.some(district => {
              if (rep.state !== district.state) return false;
              const repDistrict = rep.district?.padStart(2, '0') || '00';
              const targetDistrictNorm = district.district.padStart(2, '0');
              return repDistrict === targetDistrictNorm;
            });
          }
          return false;
        });
        representativesFound = representatives.length > 0;
      } catch (error) {
        logger.error('Error fetching multi-district representatives', error as Error, { zipCode });
      }
    }

    const response: MultiDistrictResponse = {
      success: true,
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
          dataQuality: isMultiDistrict && !selectedDistrict ? 'fair' : 'excellent',
        },
      },
    };

    logger.info('Multi-district API request completed successfully', {
      zipCode,
      isMultiDistrict,
      districtCount: districts.length,
      representativeCount: representatives.length,
      processingTime: Date.now() - startTime,
    });

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    logger.error('Unexpected error in multi-district API', error as Error, { zipCode });

    return NextResponse.json(
      {
        success: false,
        zipCode,
        isMultiDistrict: false,
        districts: [],
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'error',
          totalDistricts: 0,
          lookupMethod: 'fallback',
          processingTime: Date.now() - startTime,
          coverage: {
            zipFound: false,
            representativesFound: false,
            dataQuality: 'poor',
          },
        },
      } as MultiDistrictResponse,
      { status: 500 }
    );
  }
}

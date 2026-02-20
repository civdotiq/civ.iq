/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State District Profile API
 *
 * GET /api/state-districts/[state]/[chamber]/[district]
 * Returns demographics, legislators, and GeoJSON boundary for a state legislative district.
 *
 * @example GET /api/state-districts/MI/lower/8
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStateDistrictProfile } from '@/services/state-district-profile.service';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import { isValidChamber } from '@/types/state-legislature';
import logger from '@/lib/logging/simple-logger';

// District data changes infrequently — long revalidation
export const revalidate = 86400; // 24 hours

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string; chamber: string; district: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, chamber, district } = await params;
    const stateCode = normalizeStateIdentifier(state);

    if (!stateCode) {
      return NextResponse.json(
        { success: false, error: 'Valid state abbreviation is required' },
        { status: 400 }
      );
    }

    if (!isValidChamber(chamber)) {
      return NextResponse.json(
        { success: false, error: 'Chamber must be "upper" or "lower"' },
        { status: 400 }
      );
    }

    if (!district || district.length === 0) {
      return NextResponse.json(
        { success: false, error: 'District number is required' },
        { status: 400 }
      );
    }

    const profile = await getStateDistrictProfile(stateCode, chamber, district);

    logger.info('State district profile request successful', {
      state: stateCode,
      chamber,
      district,
      hasDemographics: !!profile.demographics,
      hasBoundary: !!profile.boundary,
      legislatorCount: profile.legislators.length,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        profile,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    logger.error('State district profile request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch state district profile',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

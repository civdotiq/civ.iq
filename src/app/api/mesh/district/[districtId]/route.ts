/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Intelligence Profile API
 *
 * Returns the computed district intelligence profile — economic DNA,
 * representation alignment scores, peer comparison, and bill exposure.
 *
 * GET /api/mesh/district/CA-12
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { buildDistrictProfile } from '@/lib/mesh/district-profile';
import { ApiErrors } from '@/lib/api/error-responses';

export const revalidate = 21600; // 6 hours
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse> {
  const { districtId } = await params;

  if (!districtId || !/^[A-Z]{2}-(\d{1,2}|AL|STATE|Senate)$/i.test(districtId)) {
    return ApiErrors.validation(
      'Invalid district ID format. Expected: "ST-DD" (e.g., "CA-12"), "ST-AL", or "ST-STATE"'
    );
  }

  try {
    logger.info('[Mesh:District API] Request', { districtId });

    const profile = await buildDistrictProfile(districtId.toUpperCase());

    if (!profile) {
      return ApiErrors.notFound('District', districtId);
    }

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Mesh:District API] Error', error as Error, { districtId });
    return ApiErrors.serverError(error as Error);
  }
}

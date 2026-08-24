/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Policy Area Search API — Gap 6 Join Endpoint
 *
 * Cross-domain search by Congress.gov policyArea. Delegates to
 * policy-area-search.service.ts for the actual data fetching.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ApiErrors,
  createErrorResponse,
  ErrorCodes,
  type ApiError,
} from '@/lib/api/error-responses';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { searchPolicyArea } from '@/lib/services/policy-area-search.service';
import type { PolicyAreaResults } from '@/types/joins';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
): Promise<NextResponse<PolicyAreaResults | ApiError>> {
  const { searchParams } = request.nextUrl;
  const policyArea = searchParams.get('policyArea');

  if (!policyArea) {
    return ApiErrors.validation('Query parameter "policyArea" is required');
  }

  try {
    logger.info('Policy area search request', { policyArea });

    const mapping = getPolicyAreaMapping(policyArea);
    if (!mapping) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, `Unknown policy area: ${policyArea}`, 404);
    }

    // parseInt('abc') is NaN and Math.min(NaN, 30) stays NaN — fall back to the default
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 30);
    const result = await searchPolicyArea(policyArea, limit);

    if (!result) {
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to fetch policy area results',
        500
      );
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Policy area search error', error as Error, { policyArea });
    return ApiErrors.serverError();
  }
}

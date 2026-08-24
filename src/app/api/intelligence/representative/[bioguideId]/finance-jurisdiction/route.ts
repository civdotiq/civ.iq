/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Finance-Jurisdiction Overlap
 *
 * Returns finance-jurisdiction overlap analysis for a legislator.
 * Split from the base route for independent loading and better timeout handling.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/finance-jurisdiction
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ApiErrors,
  createErrorResponse,
  ErrorCodes,
  type ApiError,
} from '@/lib/api/error-responses';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { FinanceJurisdictionInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<FinanceJurisdictionInsight | ApiError>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return ApiErrors.validation('Bioguide ID is required');
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Finance-jurisdiction request', { bioguideId: upperId });
    const errors: InsightError[] = [];

    const insight = await analyzeFinanceJurisdiction(upperId).catch(e => {
      errors.push(classifyError(e, 'finance-jurisdiction-analyzer'));
      return null;
    });

    if (!insight) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        'Finance-jurisdiction analysis not available for this legislator',
        404
      );
    }

    return NextResponse.json(
      { ...insight, errors, status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Finance-jurisdiction error', error as Error, {
      bioguideId: upperId,
    });
    return ApiErrors.serverError();
  }
}

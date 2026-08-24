/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Vote Prediction
 *
 * Returns ML-based vote prediction analysis for a legislator,
 * including independence score and notable deviations.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/vote-prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ApiErrors,
  createErrorResponse,
  ErrorCodes,
  type ApiError,
} from '@/lib/api/error-responses';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import type { VotePredictionInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<VotePredictionInsight | ApiError>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return ApiErrors.validation('Bioguide ID is required');
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Vote prediction request', { bioguideId: upperId });

    const insight = await analyzeVotePrediction(upperId);

    if (!insight) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        'Vote prediction not available for this legislator',
        404
      );
    }

    return NextResponse.json(
      { ...insight, errors: [] as InsightError[], status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Vote prediction error', error as Error, {
      bioguideId: upperId,
    });
    return ApiErrors.serverError();
  }
}

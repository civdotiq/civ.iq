/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Temporal Vote Pattern Shifts
 *
 * Analyzes a legislator's party-alignment voting shifts over calendar quarters
 * of the 119th Congress. Separate endpoint from the main intelligence route
 * because temporal analysis reads the full chamber roll-call corpus.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/temporal
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ApiErrors,
  createErrorResponse,
  ErrorCodes,
  type ApiError,
} from '@/lib/api/error-responses';
import { analyzeTemporalVotes } from '@/lib/intelligence/analyzers/temporal-vote-analyzer';
import { withTimeout } from '@/lib/intelligence/analyzers/shared';
import type { TemporalVoteInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** Leaves headroom under maxDuration to answer with an honest 503. */
const ANALYZER_TIMEOUT_MS = 50_000;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<TemporalVoteInsight | ApiError>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return ApiErrors.validation('Bioguide ID is required');
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Temporal vote insights request', { bioguideId: upperId });

    const insight = await withTimeout(
      analyzeTemporalVotes(upperId),
      ANALYZER_TIMEOUT_MS,
      `TemporalVotes:${upperId}`
    );

    if (!insight) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        'Insufficient voting data for temporal analysis',
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
    if (error instanceof Error && /timed out/i.test(error.message)) {
      logger.warn('[Intelligence] Temporal vote insights timed out', { bioguideId: upperId });
      return createErrorResponse(
        ErrorCodes.SERVICE_UNAVAILABLE,
        'Temporal analysis is temporarily unavailable. Try again shortly.',
        503
      );
    }
    logger.error('[Intelligence] Temporal vote insights error', error as Error, {
      bioguideId: upperId,
    });
    return ApiErrors.serverError();
  }
}

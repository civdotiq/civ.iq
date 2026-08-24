/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Influence Chain
 *
 * Returns influence chain analysis for a legislator,
 * tracing lobbying money through contributions to voting records.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/influence-chain
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  ApiErrors,
  createErrorResponse,
  ErrorCodes,
  type ApiError,
} from '@/lib/api/error-responses';
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { InfluenceChainInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<InfluenceChainInsight | ApiError>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return ApiErrors.validation('Bioguide ID is required');
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Influence chain request', { bioguideId: upperId });
    const errors: InsightError[] = [];

    const insight = await analyzeInfluenceChains(upperId).catch(e => {
      errors.push(classifyError(e, 'influence-chain-analyzer'));
      return null;
    });

    if (!insight) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        'Influence chain analysis not available for this legislator',
        404
      );
    }

    const status = errors.length === 0 ? 'complete' : 'partial';

    return NextResponse.json(
      { ...insight, errors, status },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Influence chain error', error as Error, {
      bioguideId: upperId,
    });
    return ApiErrors.serverError();
  }
}

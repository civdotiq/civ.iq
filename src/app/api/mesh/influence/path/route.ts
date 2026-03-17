/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Influence Path Scoring API
 *
 * GET /api/mesh/influence/path?from=org:lockheed-martin&to=reg:2024-12345
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { scoreInfluence } from '@/lib/mesh/propagation/path-scorer';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const fromId = searchParams.get('from');
  const toId = searchParams.get('to');
  const maxDepth = parseInt(searchParams.get('maxDepth') ?? '3');

  if (!fromId || !toId) {
    return ApiErrors.validation('from and to query parameters are required');
  }

  if (!fromId.includes(':') || !toId.includes(':')) {
    return ApiErrors.validation('IDs must use canonical format (e.g., "org:name", "rep:A000360")');
  }

  try {
    logger.info('[API:InfluencePath] Request', { fromId, toId, maxDepth });

    const result = await scoreInfluence(fromId, toId, { maxDepth });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('[API:InfluencePath] Error', error as Error);
    return ApiErrors.serverError(error as Error);
  }
}

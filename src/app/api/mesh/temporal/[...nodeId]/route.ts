/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Mesh API
 *
 * Returns the temporal profile for a graph node — quarterly
 * time-series of edge activity with trend detection and events.
 *
 * GET /api/mesh/temporal/rep:A000360?quarters=8
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { buildTemporalProfile } from '@/lib/mesh/temporal';
import { ApiErrors } from '@/lib/api/error-responses';

export const revalidate = 3600;
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string[] }> }
): Promise<NextResponse> {
  const { nodeId: segments } = await params;
  const nodeId = segments.join('/');

  if (!nodeId || !nodeId.includes(':')) {
    return ApiErrors.validation(
      'Invalid node ID format. Expected pattern: "type:identifier" (e.g., "rep:A000360")'
    );
  }

  const { searchParams } = request.nextUrl;
  const quarters = parseInt(searchParams.get('quarters') ?? '8');

  if (quarters < 1 || quarters > 20) {
    return ApiErrors.validation('quarters must be between 1 and 20');
  }

  try {
    logger.info('[Mesh:Temporal API] Request', { nodeId, quarters });

    const profile = await buildTemporalProfile(nodeId, { quarters });

    if (!profile) {
      return ApiErrors.notFound('Node', nodeId);
    }

    return NextResponse.json(profile, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('[Mesh:Temporal API] Error', error as Error, { nodeId });
    return ApiErrors.serverError(error as Error);
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Mesh Entity API
 *
 * Returns everything the Civic Mesh knows about an entity:
 * identity (with schema), neighborhood, computed intelligence, temporal context.
 *
 * GET /api/mesh/entity/rep:A000360
 * GET /api/mesh/entity/bill:119-hr-1234
 * GET /api/mesh/entity/sector:defense
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { resolveEntity } from '@/lib/mesh/protocol/entity-api';
import { ApiErrors } from '@/lib/api/error-responses';

export const revalidate = 3600; // 1 hour ISR
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ nodeId: string[] }> }
): Promise<NextResponse> {
  const { nodeId: segments } = await params;
  const canonicalId = segments.join('/');

  if (!canonicalId || !canonicalId.includes(':')) {
    return ApiErrors.validation(
      'Invalid entity ID. Expected: "type:identifier" (e.g., "rep:A000360", "bill:119-hr-1234")'
    );
  }

  try {
    logger.info('[Mesh:Entity API] Request', { canonicalId });

    const entity = await resolveEntity(canonicalId);

    if (!entity) {
      return ApiErrors.notFound('Entity', canonicalId);
    }

    return NextResponse.json(entity, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('[Mesh:Entity API] Error', error as Error, { canonicalId });
    return ApiErrors.serverError(error as Error);
  }
}

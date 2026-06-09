/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph Path Finding API
 *
 * Finds connection paths between two nodes in the civic knowledge graph.
 *
 * GET /api/graph/path?from=rep:P000197&to=org:lockheed-martin&maxDepth=3
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { findPaths } from '@/lib/graph/path-finder';
import { GRAPH_EDGE_TYPES, type GraphEdgeType } from '@/types/graph';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const maxDepth = parseInt(searchParams.get('maxDepth') ?? '3');
  const edgeTypesParam = searchParams.get('edgeTypes');

  if (!from || !to) {
    return ApiErrors.validation('Both "from" and "to" query parameters are required');
  }

  if (!from.includes(':') || !to.includes(':')) {
    return ApiErrors.validation(
      'Node IDs must use canonical format: "type:identifier" (e.g., "rep:P000197")'
    );
  }

  if (!Number.isFinite(maxDepth) || maxDepth < 1 || maxDepth > 4) {
    return ApiErrors.validation('maxDepth must be an integer between 1 and 4');
  }

  // Validate edgeTypes
  let edgeTypes: GraphEdgeType[] | undefined;
  if (edgeTypesParam) {
    const requested = edgeTypesParam.split(',');
    const invalid = requested.filter(t => !GRAPH_EDGE_TYPES.includes(t as GraphEdgeType));
    if (invalid.length > 0) {
      return ApiErrors.validation(`Invalid edge types: ${invalid.join(', ')}`);
    }
    edgeTypes = requested as GraphEdgeType[];
  }

  try {
    logger.info('[Graph API] Path request', { from, to, maxDepth });

    const result = await findPaths(from, to, { maxDepth, edgeTypes });

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    logger.error('[Graph API] Path error', error as Error, { from, to });
    return ApiErrors.serverError(error as Error);
  }
}

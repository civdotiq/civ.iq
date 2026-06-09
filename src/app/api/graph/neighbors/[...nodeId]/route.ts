/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph Neighborhood API
 *
 * Returns the graph neighborhood for a given node.
 * Catch-all route handles canonical IDs with colons (e.g., rep:A000360).
 *
 * GET /api/graph/neighbors/rep:A000360
 * GET /api/graph/neighbors/bill:119-hr-1234?edgeTypes=sponsored,voted_on&minConfidence=0.7
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import { GRAPH_EDGE_TYPES, type GraphEdgeType, type GraphNeighborhood } from '@/types/graph';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string[] }> }
): Promise<NextResponse> {
  const { nodeId: segments } = await params;

  // Reconstruct canonical ID from path segments (Next.js splits on /)
  const nodeId = segments.join('/');

  if (!nodeId || !nodeId.includes(':')) {
    return ApiErrors.validation(
      'Invalid node ID format. Expected pattern: "type:identifier" (e.g., "rep:A000360")'
    );
  }

  // Parse optional query params
  const { searchParams } = request.nextUrl;
  const edgeTypesParam = searchParams.get('edgeTypes');
  const minConfidence = parseFloat(searchParams.get('minConfidence') ?? '0');
  const since = searchParams.get('since');
  const until = searchParams.get('until');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  // NaN fails every comparison, so the finite checks must be explicit
  if (!Number.isFinite(minConfidence) || minConfidence < 0 || minConfidence > 1) {
    return ApiErrors.validation('minConfidence must be a number between 0 and 1');
  }
  if (!Number.isFinite(limit) || limit < 1 || limit > 500) {
    return ApiErrors.validation('limit must be an integer between 1 and 500');
  }

  // Validate edgeTypes if provided
  let edgeTypeFilter: Set<GraphEdgeType> | null = null;
  if (edgeTypesParam) {
    const requested = edgeTypesParam.split(',');
    const invalid = requested.filter(t => !GRAPH_EDGE_TYPES.includes(t as GraphEdgeType));
    if (invalid.length > 0) {
      return ApiErrors.validation(`Invalid edge types: ${invalid.join(', ')}`);
    }
    edgeTypeFilter = new Set(requested as GraphEdgeType[]);
  }

  try {
    logger.info('[Graph API] Neighborhood request', { nodeId });

    const neighborhood = await hydrateNeighborhood(nodeId);

    if (!neighborhood) {
      return ApiErrors.notFound('Node', nodeId);
    }

    // Apply filters
    const filtered = applyFilters(neighborhood, {
      edgeTypeFilter,
      minConfidence,
      since,
      until,
      limit,
    });

    return NextResponse.json(filtered, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('[Graph API] Neighborhood error', error as Error, { nodeId });
    return ApiErrors.serverError(error as Error);
  }
}

interface FilterOptions {
  edgeTypeFilter: Set<GraphEdgeType> | null;
  minConfidence: number;
  since: string | null;
  until: string | null;
  limit: number;
}

function applyFilters(neighborhood: GraphNeighborhood, options: FilterOptions): GraphNeighborhood {
  let edges = neighborhood.edges;

  // Filter by edge type
  if (options.edgeTypeFilter) {
    edges = edges.filter(e => options.edgeTypeFilter?.has(e.type));
  }

  // Filter by confidence
  if (options.minConfidence > 0) {
    edges = edges.filter(e => e.confidence >= options.minConfidence);
  }

  // Filter by time range
  if (options.since) {
    edges = edges.filter(e => !e.temporal?.date || e.temporal.date >= options.since!);
  }
  if (options.until) {
    edges = edges.filter(e => !e.temporal?.date || e.temporal.date <= options.until!);
  }

  // Apply limit
  if (edges.length > options.limit) {
    // Sort by weight descending, keep top N
    edges = edges.sort((a, b) => b.weight - a.weight).slice(0, options.limit);
  }

  // Only include nodes that are referenced by remaining edges
  const referencedNodeIds = new Set<string>();
  for (const edge of edges) {
    referencedNodeIds.add(edge.sourceId);
    referencedNodeIds.add(edge.targetId);
  }
  referencedNodeIds.delete(neighborhood.center.id);

  const connectedNodes = neighborhood.connectedNodes.filter(n => referencedNodeIds.has(n.id));

  return {
    ...neighborhood,
    edges,
    connectedNodes,
  };
}

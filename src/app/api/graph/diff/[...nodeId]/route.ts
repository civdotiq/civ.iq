/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph Neighborhood Diff API
 *
 * Compares current neighborhood to a stored snapshot.
 * Returns added, removed, and modified edges.
 *
 * GET /api/graph/diff/rep:P000197?since=2026-01-01
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import type { GraphEdge, GraphNeighborhood } from '@/types/graph';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SNAPSHOT_PREFIX = 'graph:snap:';
const SNAPSHOT_TTL = 30 * 24 * 60 * 60; // 30 days

interface DiffResult {
  added: GraphEdge[];
  removed: GraphEdge[];
  modified: GraphEdge[];
  snapshotDate: string | null;
  currentDate: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ nodeId: string[] }> }
): Promise<NextResponse> {
  const { nodeId: segments } = await params;
  const nodeId = segments.join('/');

  if (!nodeId || !nodeId.includes(':')) {
    return ApiErrors.validation('Invalid node ID format');
  }

  const since = request.nextUrl.searchParams.get('since');

  try {
    logger.info('[Graph API] Diff request', { nodeId, since });

    // Get current neighborhood
    const current = await hydrateNeighborhood(nodeId);
    if (!current) {
      return ApiErrors.notFound('Node', nodeId);
    }

    const now = new Date().toISOString().split('T')[0]!;
    const cache = getRedisCache();

    // Try to get snapshot
    const snapshotKey = since ? `${SNAPSHOT_PREFIX}${nodeId}:${since}` : null;

    let snapshot: GraphNeighborhood | null = null;
    if (snapshotKey) {
      snapshot = await cache.get<GraphNeighborhood>(snapshotKey);
    }

    // Store current as today's snapshot
    const todayKey = `${SNAPSHOT_PREFIX}${nodeId}:${now}`;
    await cache.set(todayKey, current, SNAPSHOT_TTL);

    if (!snapshot) {
      // No snapshot to compare — return all edges as "added"
      const result: DiffResult = {
        added: current.edges,
        removed: [],
        modified: [],
        snapshotDate: null,
        currentDate: now,
      };
      return NextResponse.json(result);
    }

    // Compare edges
    const snapshotEdgeMap = new Map(snapshot.edges.map(e => [e.id, e]));
    const currentEdgeMap = new Map(current.edges.map(e => [e.id, e]));

    const added: GraphEdge[] = [];
    const removed: GraphEdge[] = [];
    const modified: GraphEdge[] = [];

    // Find added and modified
    for (const [id, edge] of currentEdgeMap) {
      const prev = snapshotEdgeMap.get(id);
      if (!prev) {
        added.push(edge);
      } else if (
        edge.weight !== prev.weight ||
        JSON.stringify(edge.properties) !== JSON.stringify(prev.properties)
      ) {
        modified.push(edge);
      }
    }

    // Find removed
    for (const [id, edge] of snapshotEdgeMap) {
      if (!currentEdgeMap.has(id)) {
        removed.push(edge);
      }
    }

    const result: DiffResult = {
      added,
      removed,
      modified,
      snapshotDate: since,
      currentDate: now,
    };

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('[Graph API] Diff error', error as Error, { nodeId });
    return ApiErrors.serverError(error as Error);
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Full Influence Graph
 *
 * Returns the complete 6-node influence graph for a legislator,
 * tracing lobbying money through legislation, regulation, enforcement,
 * court cases, and economic outcomes.
 *
 * Additive to (does NOT replace) the existing influence-chain endpoint.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/influence-graph
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeInfluenceGraph } from '@/lib/intelligence/analyzers/influence-graph-analyzer';
import type { InfluenceGraphInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<InfluenceGraphInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Influence graph request', { bioguideId: upperId });

    const insight = await analyzeInfluenceGraph(upperId).catch(() => null);

    if (!insight) {
      return NextResponse.json(
        { error: 'Influence graph analysis not available for this legislator' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Influence graph error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

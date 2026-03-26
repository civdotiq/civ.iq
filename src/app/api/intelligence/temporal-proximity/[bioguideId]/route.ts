/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Temporal Proximity Intelligence API
 *
 * Returns temporal pattern analysis for a legislator's network.
 * Detects timing correlations between contributions, lobbying, and votes.
 *
 * GET /api/intelligence/temporal-proximity/[bioguideId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { hydrateNeighborhood } from '@/lib/graph/hydrator';
import {
  analyzeTemporalProximity,
  type TemporalProximityInsight,
} from '@/lib/intelligence/analyzers/temporal-proximity-analyzer';
import { toCanonicalId } from '@/lib/graph/normalize';
import type { InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<TemporalProximityInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Temporal proximity request', { bioguideId: upperId });

    const nodeId = toCanonicalId('representative', upperId);
    const neighborhood = await hydrateNeighborhood(nodeId);

    if (!neighborhood) {
      return NextResponse.json(
        {
          error: 'Temporal analysis not available for this legislator',
          errors: [] as InsightError[],
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    const insight = await analyzeTemporalProximity(neighborhood, upperId);

    return NextResponse.json(
      { ...insight, errors: [] as InsightError[], status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Temporal proximity error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

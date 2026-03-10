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
import { analyzeInfluenceChains } from '@/lib/intelligence/analyzers/influence-chain-analyzer';
import type { InfluenceChainInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<InfluenceChainInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Influence chain request', { bioguideId: upperId });

    const insight = await analyzeInfluenceChains(upperId).catch(() => null);

    if (!insight) {
      return NextResponse.json(
        { error: 'Influence chain analysis not available for this legislator' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Influence chain error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

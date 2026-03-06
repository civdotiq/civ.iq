/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Stock Trade-Committee Jurisdiction
 *
 * Serves cached stock trade-committee overlap insight or generates
 * on-demand. House members only.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/stock-trades
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeStockCommittee } from '@/lib/intelligence/analyzers/stock-committee-analyzer';
import type { StockCommitteeInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<StockCommitteeInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'bioguideId is required' }, { status: 400 });
  }

  try {
    logger.info('[Intelligence] Stock trade-committee request', { bioguideId });

    const insight = await analyzeStockCommittee(bioguideId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Insufficient stock trade or committee data for this representative' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Stock trade-committee error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

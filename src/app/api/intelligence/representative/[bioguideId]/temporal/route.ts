/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Temporal Vote Pattern Shifts
 *
 * Analyzes a legislator's party-alignment voting shifts over calendar quarters
 * of the 119th Congress. Separate endpoint from the main intelligence route
 * because temporal analysis is expensive (fetches many roll call XMLs).
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/temporal
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeTemporalVotes } from '@/lib/intelligence/analyzers/temporal-vote-analyzer';
import type { TemporalVoteInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<TemporalVoteInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Temporal vote insights request', { bioguideId: upperId });

    const insight = await analyzeTemporalVotes(upperId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Insufficient voting data for temporal analysis' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Temporal vote insights error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

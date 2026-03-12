/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Vote Prediction
 *
 * Returns ML-based vote prediction analysis for a legislator,
 * including independence score and notable deviations.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/vote-prediction
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';
import type { VotePredictionInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<VotePredictionInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Vote prediction request', { bioguideId: upperId });

    const insight = await analyzeVotePrediction(upperId);

    if (!insight) {
      return NextResponse.json(
        { error: 'Vote prediction not available for this legislator' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Vote prediction error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

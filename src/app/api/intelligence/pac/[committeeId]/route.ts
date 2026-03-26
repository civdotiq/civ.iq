/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — PAC Vote Tracing
 *
 * Serves cached PAC-to-legislator vote insight or generates on-demand.
 * Committee ID must be a valid FEC committee ID (C followed by digits).
 *
 * Endpoint: GET /api/intelligence/pac/[committeeId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzePACVotes } from '@/lib/intelligence/analyzers/pac-vote-analyzer';
import type { PACVoteInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<PACVoteInsight | { error: string }>> {
  const { committeeId } = await params;

  if (!committeeId || !/^C\d+$/.test(committeeId)) {
    return NextResponse.json(
      { error: 'Invalid committee ID format. Expected C followed by digits.' },
      { status: 400 }
    );
  }

  const upperCommitteeId = committeeId.toUpperCase();

  try {
    logger.info('[Intelligence] PAC vote tracing request', {
      committeeId: upperCommitteeId,
    });

    const insight = await analyzePACVotes(upperCommitteeId);

    if (!insight) {
      return NextResponse.json(
        {
          error:
            'Insufficient data for PAC vote analysis. The PAC may not be classifiable or may have too few linked recipients.',
          errors: [] as InsightError[],
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ...insight, errors: [] as InsightError[], status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] PAC vote tracing error', error as Error, {
      committeeId: upperCommitteeId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

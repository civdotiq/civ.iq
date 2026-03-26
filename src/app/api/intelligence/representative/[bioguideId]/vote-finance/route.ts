/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Vote-Finance Correlation
 *
 * Returns vote-finance correlation analysis for a legislator.
 * Split from the base route for independent loading and better timeout handling.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/vote-finance
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { VoteFinanceInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<VoteFinanceInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Vote-finance request', { bioguideId: upperId });
    const errors: InsightError[] = [];

    const insight = await analyzeVoteFinance(upperId).catch(e => {
      errors.push(classifyError(e, 'vote-finance-analyzer'));
      return null;
    });

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Vote-finance analysis not available for this legislator',
          errors,
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        ...insight,
        errors,
        status: errors.length === 0 ? ('complete' as const) : ('partial' as const),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Vote-finance error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

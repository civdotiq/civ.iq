/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Representative Insights
 *
 * Serves cached intelligence insights for a legislator or generates them
 * on-demand. Runs both analyzers in parallel and returns combined results.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import type { FinanceJurisdictionInsight, VoteFinanceInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

interface RepresentativeInsightsResponse {
  bioguideId: string;
  insights: {
    financeJurisdiction: FinanceJurisdictionInsight | null;
    voteFinance: VoteFinanceInsight | null;
  };
  generatedAt: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<RepresentativeInsightsResponse | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Representative insights request', { bioguideId: upperId });

    // Run both analyzers in parallel — each handles its own caching
    const [financeJurisdiction, voteFinance] = await Promise.all([
      analyzeFinanceJurisdiction(upperId).catch(error => {
        logger.error('[Intelligence] Finance-jurisdiction analyzer failed', error as Error, {
          bioguideId: upperId,
        });
        return null;
      }),
      analyzeVoteFinance(upperId).catch(error => {
        logger.error('[Intelligence] Vote-finance analyzer failed', error as Error, {
          bioguideId: upperId,
        });
        return null;
      }),
    ]);

    // Return even if both are null — the UI handles empty states
    const response: RepresentativeInsightsResponse = {
      bioguideId: upperId,
      insights: {
        financeJurisdiction,
        voteFinance,
      },
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Representative insights error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

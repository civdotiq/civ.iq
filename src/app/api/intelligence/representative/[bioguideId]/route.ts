/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Representative Insights (Legacy Combined Endpoint)
 *
 * Kept for backward compatibility. The UI now fetches finance-jurisdiction
 * and vote-finance independently via their own sub-routes.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type {
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
  InsightError,
} from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
    const errors: InsightError[] = [];

    const [financeJurisdiction, voteFinance] = await Promise.all([
      analyzeFinanceJurisdiction(upperId).catch(e => {
        errors.push(classifyError(e, 'finance-jurisdiction-analyzer'));
        return null;
      }),
      analyzeVoteFinance(upperId).catch(e => {
        errors.push(classifyError(e, 'vote-finance-analyzer'));
        return null;
      }),
    ]);

    const hasData = financeJurisdiction !== null || voteFinance !== null;
    const status = errors.length === 0 ? 'complete' : hasData ? 'partial' : 'unavailable';

    const response: RepresentativeInsightsResponse = {
      bioguideId: upperId,
      insights: {
        financeJurisdiction,
        voteFinance,
      },
      generatedAt: new Date().toISOString(),
    };

    // All analyzers failed: this is an upstream outage, not an insight.
    // 503 + no-store so the failure is never CDN-cached as success.
    if (status === 'unavailable') {
      return NextResponse.json(
        { ...response, errors, status },
        { status: 503, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      { ...response, errors, status },
      {
        headers: {
          // Partial results cache briefly so the missing analyzer can recover;
          // only complete results get the long 12h CDN cache.
          'Cache-Control':
            status === 'complete'
              ? 'public, s-maxage=43200, stale-while-revalidate=3600'
              : 'public, s-maxage=300, stale-while-revalidate=60',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Representative insights error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

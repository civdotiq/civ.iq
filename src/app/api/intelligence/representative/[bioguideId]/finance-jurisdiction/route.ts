/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Finance-Jurisdiction Overlap
 *
 * Returns finance-jurisdiction overlap analysis for a legislator.
 * Split from the base route for independent loading and better timeout handling.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/finance-jurisdiction
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import type { FinanceJurisdictionInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<FinanceJurisdictionInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Finance-jurisdiction request', { bioguideId: upperId });

    const insight = await analyzeFinanceJurisdiction(upperId).catch(error => {
      logger.error('[Intelligence] Finance-jurisdiction analyzer failed', error as Error, {
        bioguideId: upperId,
      });
      return null;
    });

    if (!insight) {
      return NextResponse.json(
        { error: 'Finance-jurisdiction analysis not available for this legislator' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Finance-jurisdiction error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

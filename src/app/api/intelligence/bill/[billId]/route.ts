/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Bill Intelligence
 *
 * Serves sponsor/cosponsor funding analysis and related lobbying
 * activity for a specific bill. Generates on-demand with caching.
 *
 * Endpoint: GET /api/intelligence/bill/[billId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeBillIntelligence } from '@/lib/intelligence/analyzers/bill-intelligence-analyzer';
import type { BillIntelligenceInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse<BillIntelligenceInsight | { error: string }>> {
  const { billId } = await params;

  if (!billId || typeof billId !== 'string') {
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
  }

  // Validate billId format: e.g., "119-hr-1", "119-s-100"
  const billIdPattern = /^\d{1,3}-[a-z]+-\d+$/;
  if (!billIdPattern.test(billId)) {
    return NextResponse.json({ error: `Invalid bill ID format: ${billId}` }, { status: 400 });
  }

  try {
    logger.info('[Intelligence] Bill intelligence request', { billId });

    const insight = await analyzeBillIntelligence(billId);

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Insufficient data for bill intelligence analysis',
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
    logger.error('[Intelligence] Bill intelligence error', error as Error, { billId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

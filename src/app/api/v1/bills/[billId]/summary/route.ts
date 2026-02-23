/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Bill AI Summary (Cached Only)
 *
 * Returns cached AI-generated plain-language summaries.
 * Does NOT trigger new AI generation — returns 404 if no cached summary.
 */

import { NextRequest, NextResponse } from 'next/server';
import { BillSummaryCache } from '@/features/legislation/services/ai/bill-summary-cache';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse> {
  try {
    const { billId } = await params;

    if (!billId || !/^[A-Z0-9\-\.]+$/i.test(billId) || billId.length < 5 || billId.length > 20) {
      return NextResponse.json(v1Error(400, 'Invalid bill ID'), { status: 400 });
    }

    const cachedSummary = await BillSummaryCache.getSummary(billId);

    if (!cachedSummary) {
      return NextResponse.json(v1Error(404, 'No cached summary available for this bill'), {
        status: 404,
      });
    }

    const data = {
      billId: cachedSummary.billId,
      title: cachedSummary.title,
      summary: cachedSummary.summary,
      whatItDoes: cachedSummary.whatItDoes,
      whyItMatters: cachedSummary.whyItMatters,
      keyPoints: cachedSummary.keyPoints,
      whoItAffects: cachedSummary.whoItAffects,
      readingLevel: cachedSummary.readingLevel,
      confidence: cachedSummary.confidence,
      lastUpdated: cachedSummary.lastUpdated,
      source: cachedSummary.source,
    };

    logger.info('v1 bill summary (cached)', { billId });

    return NextResponse.json(v1Success(data, 'civ.iq-ai-cache'), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('v1 bill summary error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Bill AI Summary API
 *
 * GET /api/ai/state-bill-summary/[state]/[billId]
 * Returns an AI-generated plain language summary for a state bill.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { StateBillSummarizer } from '@/features/legislation/services/ai/state-bill-summarizer';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import { decodeBase64Url } from '@/lib/url-encoding';
import logger from '@/lib/logging/simple-logger';

// Bill summaries are cached for 24 hours
export const revalidate = 86400;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string; billId: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, billId: rawBillId } = await params;
    const stateCode = normalizeStateIdentifier(state);
    const billId = decodeBase64Url(rawBillId);

    if (!stateCode || !billId) {
      return NextResponse.json(
        { success: false, error: 'State and bill ID are required' },
        { status: 400 }
      );
    }

    // Fetch the bill
    const bill = await StateLegislatureCoreService.getStateBillById(stateCode, billId);

    if (!bill) {
      return NextResponse.json({ success: false, error: 'State bill not found' }, { status: 404 });
    }

    // Generate summary
    const summary = await StateBillSummarizer.summarize(bill, stateCode);

    logger.info('State bill AI summary request successful', {
      state: stateCode,
      billId,
      identifier: bill.identifier,
      source: summary.source,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        ...summary,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    logger.error('State bill AI summary request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate bill summary',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Bill Full Text API
 *
 * GET /api/state-legislature/[state]/bill/[id]/text
 * Returns parsed bill text from OpenStates version URLs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { fetchBillText } from '@/lib/services/bill-text-fetcher.service';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import { decodeBase64Url } from '@/lib/url-encoding';
import logger from '@/lib/logging/simple-logger';

// Bill text can change as new versions are published
export const revalidate = 86400; // 24 hours

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;
    const stateCode = normalizeStateIdentifier(state);
    const billId = decodeBase64Url(id);

    if (!stateCode || !billId) {
      return NextResponse.json(
        { success: false, error: 'State and bill ID are required' },
        { status: 400 }
      );
    }

    // Fetch the bill to get version URLs
    const bill = await StateLegislatureCoreService.getStateBillById(stateCode, billId);

    if (!bill) {
      return NextResponse.json({ success: false, error: 'State bill not found' }, { status: 404 });
    }

    // Fetch and parse bill text
    const billText = await fetchBillText(bill, stateCode);

    logger.info('State bill text request successful', {
      state: stateCode,
      billId,
      identifier: bill.identifier,
      versionCount: billText.versions.length,
      hasContent: billText.versions.some(v => !!v.content),
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        ...billText,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    logger.error('State bill text request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch bill text',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

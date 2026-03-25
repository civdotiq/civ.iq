/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import type { Bill, BillAPIResponse } from '@/types/bill';

// Congress-aware revalidation: 24 hours for current congress bills
export const revalidate = 86400; // 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse<BillAPIResponse>> {
  try {
    const { billId } = await params;

    if (!billId) {
      return NextResponse.json(
        {
          bill: {} as Bill,
          metadata: {
            dataSource: 'unavailable',
            lastUpdated: new Date().toISOString(),
            votesCount: 0,
            cosponsorsCount: 0,
            committeesCount: 0,
          },
          errors: [{ code: 'MISSING_BILL_ID', message: 'Bill ID is required' }],
        },
        { status: 400 }
      );
    }

    logger.info('Bill API request', { billId });

    let bill: Bill | null = null;

    // Try to fetch from Congress.gov if API key is available
    if (process.env.CONGRESS_API_KEY) {
      bill = await fetchBillFromCongress(billId);
    }

    // EMERGENCY FIX: Never return fake bills with real representative data
    if (!bill) {
      logger.warn('Bill data unavailable from Congress.gov', { billId });
      return NextResponse.json(
        {
          bill: {} as Bill,
          metadata: {
            dataSource: 'unavailable',
            lastUpdated: new Date().toISOString(),
            votesCount: 0,
            cosponsorsCount: 0,
            committeesCount: 0,
          },
          errors: [
            {
              code: 'BILL_NOT_FOUND',
              message: 'Bill not found - data unavailable from Congress.gov API',
            },
          ],
        },
        { status: 404 }
      );
    }

    const response: BillAPIResponse = {
      bill,
      metadata: {
        dataSource: 'congress.gov',
        lastUpdated: bill.lastUpdated,
        votesCount: bill.votes.length,
        cosponsorsCount: bill.cosponsors.length,
        committeesCount: bill.committees.length,
      },
    };

    // Congress-aware caching:
    // - Past congresses (118th and earlier): Indefinite cache (immutable historical data)
    // - Current congress (119th): 24 hours (active legislation)
    const CURRENT_CONGRESS = 119;
    const billCongress = parseInt(bill.congress);
    const isHistorical = billCongress < CURRENT_CONGRESS;

    const cacheMaxAge = isHistorical ? 31536000 : 86400; // 1 year vs 24 hours
    const staleWhileRevalidate = isHistorical ? 86400 : 3600; // 1 day vs 1 hour

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
        'CDN-Cache-Control': `public, max-age=${cacheMaxAge}`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';

    logger.error('Bill API error', error as Error, {
      billId: (await params).billId,
    });

    return NextResponse.json(
      {
        bill: {} as Bill,
        metadata: {
          dataSource: 'unavailable',
          lastUpdated: new Date().toISOString(),
          votesCount: 0,
          cosponsorsCount: 0,
          committeesCount: 0,
        },
        errors: [
          {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          },
        ],
      },
      { status: 500 }
    );
  }
}

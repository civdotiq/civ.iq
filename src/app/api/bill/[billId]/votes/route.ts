/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Votes API — Gap 4 Join Endpoint
 *
 * Returns enriched vote data for a bill including party breakdowns.
 * Delegates to fetchBillFromCongress from bill.service.ts.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fetchBillFromCongress } from '@/lib/services/bill.service';
import type { BillVotesResponse } from '@/types/joins';

export const revalidate = 86400; // 24 hours

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ billId: string }> }
): Promise<NextResponse<BillVotesResponse | { error: string }>> {
  const { billId } = await params;

  if (!billId) {
    return NextResponse.json({ error: 'Bill ID is required' }, { status: 400 });
  }

  try {
    logger.info('Bill votes join request', { billId });

    if (!process.env.CONGRESS_API_KEY) {
      return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
    }

    const bill = await fetchBillFromCongress(billId);

    if (!bill) {
      return NextResponse.json({ error: `Bill ${billId} not found` }, { status: 404 });
    }

    const passedCount = bill.votes.filter(
      v => v.result === 'Passed' || v.result === 'Agreed to'
    ).length;
    const failedCount = bill.votes.filter(
      v => v.result === 'Failed' || v.result === 'Disagreed to'
    ).length;

    const response: BillVotesResponse = {
      billId: bill.id,
      billTitle: bill.title,
      votes: bill.votes,
      summary: {
        totalVotes: bill.votes.length,
        passedCount,
        failedCount,
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSources: ['congress.gov'],
        joinType: 'bill-votes',
        dataQuality: bill.votes.length > 0 ? 'complete' : 'partial',
      },
    };

    const CURRENT_CONGRESS = 119;
    const billCongress = parseInt(bill.congress);
    const isHistorical = billCongress < CURRENT_CONGRESS;
    const cacheMaxAge = isHistorical ? 31536000 : 86400;

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': `public, s-maxage=${cacheMaxAge}, stale-while-revalidate=3600`,
      },
    });
  } catch (error) {
    logger.error('Bill votes join error', error as Error, { billId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — List Bills
 *
 * Returns the latest bills from Congress.gov.
 * Wraps the same Congress.gov API call as /api/bills/latest.
 */

import { NextRequest, NextResponse } from 'next/server';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';
import { buildBillUrl } from '@/lib/helpers/url-builders';

export const dynamic = 'force-dynamic';

interface CongressBill {
  congress: number;
  latestAction?: { actionDate: string; text: string };
  number: string;
  originChamber?: string;
  originChamberCode?: string;
  title?: string;
  type?: string;
  updateDate?: string;
  url?: string;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const apiKey = process.env.CONGRESS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(v1Error(500, 'Congress.gov API key not configured'), {
        status: 500,
      });
    }

    const congress = process.env.CURRENT_CONGRESS || '119';
    const { searchParams } = request.nextUrl;
    const validSorts = ['updateDate+desc', 'updateDate+asc', 'number+desc', 'number+asc'];
    const sortParam = searchParams.get('sort') || 'updateDate+desc';
    const sort = validSorts.includes(sortParam) ? sortParam : 'updateDate+desc';
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 250);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const response = await fetch(
      `https://api.congress.gov/v3/bill/${congress}?limit=${limit}&offset=${offset}&sort=${sort}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          'X-API-Key': apiKey,
        },
      }
    );

    if (!response.ok) {
      logger.error('v1 bills: Congress.gov API failed', new Error(`HTTP ${response.status}`));
      return NextResponse.json(v1Error(502, 'Failed to fetch bills from Congress.gov'), {
        status: 502,
      });
    }

    const raw = await response.json();
    const bills: CongressBill[] = raw.bills ?? [];

    const data = bills.map(bill => ({
      congress: bill.congress,
      number: bill.number,
      type: bill.type ?? null,
      title: bill.title ?? null,
      originChamber: bill.originChamber ?? null,
      updateDate: bill.updateDate ?? null,
      latestAction: bill.latestAction ?? null,
      url: `https://civdotiq.org${buildBillUrl(bill.congress, bill.type || 'hr', bill.number)}`,
    }));

    // Congress.gov doesn't give total count in this endpoint, estimate from pagination
    const pagination = raw.pagination;
    const total = pagination?.count ?? bills.length + offset;

    logger.info('v1 bills list', { congress, returned: data.length, sort });

    return NextResponse.json(v1Success(data, 'congress.gov', { total, limit, offset }), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('v1 bills error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}

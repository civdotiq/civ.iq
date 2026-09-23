/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { ApiErrors } from '@/lib/api/error-responses';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { getBillsByPolicyArea } from '@/lib/data-sources/bill-policy-areas/load';
import type { CorpusBill } from '@/lib/data-sources/bill-policy-areas/corpus';

export const dynamic = 'force-dynamic';

const CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
};

function parseLimit(raw: string | null): number {
  return Math.min(Math.max(parseInt(raw || '50', 10) || 50, 1), 250);
}

/** Corpus bill → the Congress.gov list-item shape /legislation already renders. */
function toCongressBill(bill: CorpusBill) {
  const upper = bill.type.toUpperCase();
  return {
    congress: bill.congress,
    type: upper,
    number: String(bill.number),
    title: bill.title,
    originChamber: bill.type.startsWith('h') ? 'House' : 'Senate',
    originChamberCode: bill.type.startsWith('h') ? 'H' : 'S',
    introducedDate: bill.introducedDate,
    latestAction: bill.latestActionDate
      ? { actionDate: bill.latestActionDate, text: bill.latestActionText ?? '' }
      : null,
    policyArea: { name: bill.policyArea },
  };
}

/**
 * Congress.gov's /bill list never carries policyArea and has no policy-area
 * filter, so topic-filtered lists come from the GovInfo BILLSTATUS corpus.
 * totalBills is the area's full count, not the page size.
 */
async function policyAreaResponse(policyArea: string, limit: number): Promise<NextResponse> {
  const mapping = getPolicyAreaMapping(policyArea);
  if (!mapping) {
    return ApiErrors.validation(`Unknown policy area: ${policyArea}`);
  }
  const result = await getBillsByPolicyArea(mapping.policyArea, limit);
  const source = 'GovInfo BILLSTATUS bulk data (CRS policy areas)';
  if (!result) {
    return NextResponse.json({
      bills: [],
      metadata: {
        congress: null,
        totalBills: null,
        policyArea: mapping.policyArea,
        source,
        dataAvailable: false,
        note: 'Bill policy-area data is temporarily unavailable.',
        generatedAt: new Date().toISOString(),
        queryParams: { limit, policyArea: mapping.policyArea },
      },
    });
  }
  return NextResponse.json(
    {
      bills: result.bills.map(toCongressBill),
      metadata: {
        congress: result.congress,
        totalBills: result.total,
        policyArea: mapping.policyArea,
        source,
        dataAvailable: true,
        dataAsOf: result.generatedAt,
        generatedAt: new Date().toISOString(),
        queryParams: { limit, policyArea: mapping.policyArea },
      },
    },
    { headers: CACHE_HEADERS }
  );
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const policyArea = req.nextUrl.searchParams.get('policyArea');
    if (policyArea) {
      return await policyAreaResponse(
        policyArea,
        parseLimit(req.nextUrl.searchParams.get('limit'))
      );
    }

    if (!process.env.CONGRESS_API_KEY) {
      return new NextResponse('Congress.gov API key required', { status: 500 });
    }

    // Use current Congress (119th - 2025-2027)
    const congress = process.env.CURRENT_CONGRESS || String(getCurrentCongressNumber());
    const { searchParams } = req.nextUrl;
    const validSorts = ['updateDate+desc', 'updateDate+asc', 'number+desc', 'number+asc'];
    const sortParam = searchParams.get('sort') || 'updateDate+desc';
    const sort = validSorts.includes(sortParam) ? sortParam : 'updateDate+desc';
    const limit = parseLimit(searchParams.get('limit'));

    const response = await fetch(
      `https://api.congress.gov/v3/bill/${congress}?limit=${limit}&sort=${sort}&format=json`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          'X-API-Key': process.env.CONGRESS_API_KEY || '',
        },
      }
    );

    if (!response.ok) {
      logger.error('Congress.gov latest bills API failed', new Error(`HTTP ${response.status}`), {
        status: response.status,
        congress,
      });
      return new NextResponse('Failed to fetch latest bills from Congress.gov', {
        status: 500,
      });
    }

    const data = await response.json();

    logger.info('Successfully fetched latest bills from Congress.gov', {
      congress,
      billCount: data.bills?.length || 0,
      limit,
    });

    return NextResponse.json(
      {
        ...data,
        metadata: {
          congress: parseInt(congress),
          totalBills: data.bills?.length || 0,
          source: 'Congress.gov API',
          generatedAt: new Date().toISOString(),
          queryParams: {
            limit,
            sort,
          },
        },
      },
      { headers: CACHE_HEADERS }
    );
  } catch (error) {
    logger.error('Latest bills API error', error as Error);
    return new NextResponse('Failed to fetch latest bills', { status: 500 });
  }
}

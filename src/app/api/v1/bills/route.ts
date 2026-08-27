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

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { NextRequest, NextResponse } from 'next/server';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import { unknownParamWarnings } from '@/lib/api/v1-params';
import logger from '@/lib/logging/simple-logger';
import { buildBillUrl } from '@/lib/helpers/url-builders';

export const dynamic = 'force-dynamic';

/** Query parameters this route understands; anything else is reported in meta.warnings. */
const SUPPORTED_PARAMS = ['congress', 'sort', 'limit', 'offset'] as const;

/** Congress.gov's /bill collection starts at the 93rd Congress (1973). */
const MIN_CONGRESS = 93;

/**
 * The Congress to query when the caller doesn't name one.
 *
 * CURRENT_CONGRESS is an operator override; a non-numeric value falls back to
 * the date-derived number rather than reaching Congress.gov as garbage.
 */
function resolveDefaultCongress(): number {
  const override = Number.parseInt(process.env.CURRENT_CONGRESS ?? '', 10);
  return Number.isInteger(override) && override >= MIN_CONGRESS
    ? override
    : getCurrentCongressNumber();
}

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

    const { searchParams } = request.nextUrl;

    // `congress` is new as of 2026-08-27. Callers were already guessing it —
    // rejecting an out-of-range value breaks nobody, since no value worked
    // before, and a silent fallback would repeat the bug this change fixes.
    const defaultCongress = resolveDefaultCongress();
    const congressParam = searchParams.get('congress');
    let congress = defaultCongress;
    if (congressParam !== null) {
      const parsed = Number.parseInt(congressParam, 10);
      if (!Number.isInteger(parsed) || parsed < MIN_CONGRESS || parsed > defaultCongress) {
        return NextResponse.json(
          v1Error(
            400,
            'Invalid congress parameter',
            `Expected an integer between ${MIN_CONGRESS} and ${defaultCongress}; received '${congressParam}'`
          ),
          { status: 400 }
        );
      }
      congress = parsed;
    }

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

    const warnings = unknownParamWarnings(searchParams, SUPPORTED_PARAMS);

    return NextResponse.json(v1Success(data, 'congress.gov', { total, limit, offset }, warnings), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('v1 bills error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cross-Congress stock trade query endpoint
 *
 * Returns STOCK Act trades across all members of Congress with filtering
 * by chamber, party, member name, ticker, transaction type, and date range.
 *
 * @example
 * GET /api/stock-trades?party=R&transactionType=purchase&from=2026-01-01
 * GET /api/stock-trades?chamber=senate&ticker=NVDA
 * GET /api/stock-trades?name=pelosi&limit=100
 */

import { NextRequest, NextResponse } from 'next/server';
import { queryCongressionalTrades } from '@/lib/data-sources/congress-trades-query';
import type { TradeQueryFilters } from '@/lib/data-sources/congress-trades-query';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';
// Cold path loads the Senate corpus (per-filer files) + member enrichment
export const maxDuration = 60;

const VALID_CHAMBERS = ['house', 'senate'] as const;
const VALID_PARTIES = ['D', 'R', 'I'] as const;
const VALID_TYPES = ['purchase', 'sale', 'exchange'] as const;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const chamber = searchParams.get('chamber')?.toLowerCase();
  const party = searchParams.get('party')?.toUpperCase();
  const name = searchParams.get('name') ?? undefined;
  const bioguideId = searchParams.get('bioguideId') ?? undefined;
  const ticker = searchParams.get('ticker') ?? undefined;
  const transactionType = searchParams.get('transactionType')?.toLowerCase();
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10) || 50, 1), 200);
  const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

  if (chamber && !VALID_CHAMBERS.includes(chamber as (typeof VALID_CHAMBERS)[number])) {
    return NextResponse.json({ error: 'chamber must be "house" or "senate"' }, { status: 400 });
  }
  if (party && !VALID_PARTIES.includes(party as (typeof VALID_PARTIES)[number])) {
    return NextResponse.json({ error: 'party must be D, R, or I' }, { status: 400 });
  }
  if (transactionType && !VALID_TYPES.includes(transactionType as (typeof VALID_TYPES)[number])) {
    return NextResponse.json(
      { error: 'transactionType must be "purchase", "sale", or "exchange"' },
      { status: 400 }
    );
  }
  if ((from && !ISO_DATE.test(from)) || (to && !ISO_DATE.test(to))) {
    return NextResponse.json({ error: 'from/to must be ISO dates (YYYY-MM-DD)' }, { status: 400 });
  }

  const filters: TradeQueryFilters = {
    ...(chamber ? { chamber: chamber as TradeQueryFilters['chamber'] } : {}),
    ...(party ? { party: party as TradeQueryFilters['party'] } : {}),
    ...(name ? { name } : {}),
    ...(bioguideId ? { bioguideId } : {}),
    ...(ticker ? { ticker } : {}),
    ...(transactionType
      ? { transactionType: transactionType as TradeQueryFilters['transactionType'] }
      : {}),
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  };

  try {
    logger.info('Cross-Congress stock trades query', { ...filters, limit, offset });

    const result = await queryCongressionalTrades(filters, limit, offset);

    return NextResponse.json(
      {
        trades: result.trades,
        pagination: {
          total: result.total,
          limit,
          offset,
          hasMore: offset + result.trades.length < result.total,
        },
        filters,
        metadata: {
          timestamp: new Date().toISOString(),
          membersMatched: result.membersMatched,
          sources: {
            senate:
              'Congress Trading Monitor (Senate eFD, electronic filings 2015-present); ' +
              `${result.sources.senateMembersLoaded} senators loaded`,
            house:
              'Congress Trading Monitor (House Clerk filings, electronic filings 2015-present); ' +
              `${result.sources.houseMembersLoaded} representatives loaded`,
          },
          note:
            'Both chambers are sourced from Congress Trading Monitor (electronic filings ' +
            '2015-present); pre-2015 paper filings are not included. Members whose party ' +
            'could not be resolved are excluded from party-filtered results.',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    logger.error('Cross-Congress stock trades query error', error as Error, {
      ...filters,
    });

    return NextResponse.json(
      {
        error: 'Failed to query congressional stock trades',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

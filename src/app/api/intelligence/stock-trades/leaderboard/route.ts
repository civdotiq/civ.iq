/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Stock Trade Leaderboard
 *
 * Returns members of Congress ranked by stock trading activity.
 * Supports ranking by trade count, estimated value, or late filing count.
 *
 * Endpoint: GET /api/intelligence/stock-trades/leaderboard
 *   ?chamber=house|senate  (optional, defaults to all)
 *   ?party=D|R|I           (optional, defaults to all)
 *   ?sort=trades|value|late (optional, defaults to trades)
 *   ?limit=25              (optional, 1-100, defaults to 25)
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { buildStockTradeLeaderboard } from '@/lib/intelligence/analyzers/stock-trade-leaderboard-analyzer';
import type { StockTradeLeaderboardResponse, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const VALID_CHAMBERS = new Set(['house', 'senate']);
const VALID_PARTIES = new Set(['D', 'R', 'I']);
const VALID_SORTS = new Set(['trades', 'value', 'late']);
const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 100;

export async function GET(
  request: NextRequest
): Promise<NextResponse<StockTradeLeaderboardResponse | { error: string }>> {
  const searchParams = request.nextUrl.searchParams;
  const chamberParam = searchParams.get('chamber');
  const partyParam = searchParams.get('party');
  const sortParam = searchParams.get('sort');
  const limitParam = searchParams.get('limit');

  const chamber =
    chamberParam && VALID_CHAMBERS.has(chamberParam)
      ? (chamberParam as 'house' | 'senate')
      : undefined;

  const party = partyParam && VALID_PARTIES.has(partyParam) ? partyParam : undefined;

  const sortBy =
    sortParam && VALID_SORTS.has(sortParam)
      ? (sortParam as 'trades' | 'value' | 'late')
      : undefined;

  let limit = DEFAULT_LIMIT;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= MAX_LIMIT) {
      limit = parsed;
    }
  }

  try {
    logger.info('[Intelligence] Stock trade leaderboard request', {
      chamber: chamber ?? 'all',
      party: party ?? 'all',
      sortBy: sortBy ?? 'trades',
      limit,
    });

    const result = await buildStockTradeLeaderboard({ chamber, party, sortBy, limit });

    if (!result) {
      return NextResponse.json(
        {
          error:
            'No stock trade leaderboard data available. Trade data is populated as member pages are visited.',
          errors: [] as InsightError[],
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ...result, errors: [] as InsightError[], status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Stock trade leaderboard error', error as Error, {
      chamber: chamber ?? 'all',
      party: party ?? 'all',
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Ballot Status API
 *
 * GET /api/record-card/ballot-status?ids=D000624,P000595
 *
 * Lightweight batch lookup powering the your-reps "Your Nov 3 ballot" box:
 * which of a voter's federal seats are on the next general-election ballot,
 * from term-end date math. Members whose lookup fails are omitted rather
 * than guessed.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getMemberBallotStatus } from '@/features/record-card/record-card-data';

export const dynamic = 'force-dynamic';

const MAX_IDS = 6;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const idsParam = request.nextUrl.searchParams.get('ids') ?? '';
  const ids = idsParam
    .split(',')
    .map(s => s.trim())
    .filter(s => /^[A-Za-z]\d{6}$/.test(s))
    .slice(0, MAX_IDS);

  if (ids.length === 0) {
    return NextResponse.json(
      { error: 'ids must be a comma-separated list of bioguide IDs' },
      { status: 400 }
    );
  }

  try {
    const results = await Promise.all(ids.map(id => getMemberBallotStatus(id)));
    return NextResponse.json(
      { members: results.filter(Boolean) },
      { headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600' } }
    );
  } catch (error) {
    logger.error('Ballot status lookup failed', error as Error, { ids });
    return NextResponse.json({ error: 'Ballot status unavailable' }, { status: 502 });
  }
}

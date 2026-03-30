/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/elections/2024
 *
 * Query 2024 election results by type and district/state.
 *
 * Single-result queries:
 *   /api/elections/2024?type=house&district=PA-07
 *   /api/elections/2024?type=president&state=GA
 *   /api/elections/2024?type=state-leg&district=AL-lower-1
 *
 * Bulk queries (omit district/state for all results):
 *   /api/elections/2024?type=president              — all presidential results
 *   /api/elections/2024?type=senate                 — all senate results
 *   /api/elections/2024?type=governor               — all governor results
 *   /api/elections/2024?type=house&state=PA         — all PA house results
 *   /api/elections/2024?type=house                  — all house results
 *   /api/elections/2024?type=state-leg&state=AL     — all AL state-leg results
 *   /api/elections/2024?type=state-leg&state=AL&chamber=upper — AL state senate only
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getHouseResult2024,
  getStatewideResult2024,
  getStateLegResult2024,
  getAllStatewideResults2024,
  getAllHouseResults2024,
  getAllStateLegResults2024,
  ELECTION_2024_METADATA,
} from '@/lib/services/election-results.service';

export const dynamic = 'force-dynamic'; // 24 hours — static data, rarely changes

const VALID_TYPES = ['house', 'president', 'senate', 'governor', 'state-leg'] as const;
type QueryType = (typeof VALID_TYPES)[number];

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') as QueryType | null;
  const district = searchParams.get('district');
  const state = searchParams.get('state');

  if (!type || !VALID_TYPES.includes(type)) {
    return NextResponse.json(
      {
        error: 'Missing or invalid "type" parameter',
        validTypes: VALID_TYPES,
        examples: [
          '/api/elections/2024?type=house&district=PA-07',
          '/api/elections/2024?type=president&state=GA',
          '/api/elections/2024?type=senate&state=GA',
          '/api/elections/2024?type=governor&state=WA',
          '/api/elections/2024?type=state-leg&district=AL-lower-1',
        ],
      },
      { status: 400 }
    );
  }

  const cacheHeaders = {
    'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
  };

  // House races — single lookup or bulk
  if (type === 'house') {
    if (district) {
      const dashIdx = district.indexOf('-');
      if (dashIdx < 1) {
        return NextResponse.json(
          { error: 'Invalid district format. Expected STATE-DD (e.g., PA-07)' },
          { status: 400 }
        );
      }
      const result = getHouseResult2024(district.slice(0, dashIdx), district.slice(dashIdx + 1));
      return NextResponse.json(
        { result, metadata: ELECTION_2024_METADATA },
        { headers: cacheHeaders }
      );
    }
    const results = getAllHouseResults2024(state || undefined);
    return NextResponse.json(
      { results, metadata: ELECTION_2024_METADATA },
      { headers: cacheHeaders }
    );
  }

  // Statewide races (president, senate, governor) — single or bulk
  if (type === 'president' || type === 'senate' || type === 'governor') {
    const officeMap = {
      president: 'US_PRESIDENT',
      senate: 'US_SENATE',
      governor: 'GOVERNOR',
    } as const;
    if (state) {
      const result = getStatewideResult2024(state, officeMap[type]);
      return NextResponse.json(
        { result, metadata: ELECTION_2024_METADATA },
        { headers: cacheHeaders }
      );
    }
    const results = getAllStatewideResults2024(officeMap[type]);
    return NextResponse.json(
      { results, metadata: ELECTION_2024_METADATA },
      { headers: cacheHeaders }
    );
  }

  // State legislature — single lookup or bulk (state required for bulk)
  if (type === 'state-leg') {
    if (district) {
      const result = getStateLegResult2024(district);
      return NextResponse.json(
        { result, metadata: ELECTION_2024_METADATA },
        { headers: cacheHeaders }
      );
    }
    if (!state) {
      return NextResponse.json(
        { error: 'State legislature bulk queries require a "state" parameter (e.g., state=AL)' },
        { status: 400 }
      );
    }
    const chamber = searchParams.get('chamber') as 'upper' | 'lower' | null;
    const results = getAllStateLegResults2024(state, chamber || undefined);
    return NextResponse.json(
      { results, metadata: ELECTION_2024_METADATA },
      { headers: cacheHeaders }
    );
  }

  return NextResponse.json({ error: 'Unhandled type' }, { status: 400 });
}

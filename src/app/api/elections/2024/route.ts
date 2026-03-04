/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/elections/2024
 *
 * Query 2024 election results by type and district/state.
 *
 * Params:
 *   type     — house | president | senate | governor | state-leg
 *   district — District key (e.g., 'PA-07' for house, 'AL-lower-1' for state-leg)
 *   state    — Two-letter state code (for statewide queries)
 *
 * Examples:
 *   /api/elections/2024?type=house&district=PA-07
 *   /api/elections/2024?type=president&state=GA
 *   /api/elections/2024?type=senate&state=GA
 *   /api/elections/2024?type=governor&state=WA
 *   /api/elections/2024?type=state-leg&district=AL-lower-1
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getHouseResult2024,
  getStatewideResult2024,
  getStateLegResult2024,
  ELECTION_2024_METADATA,
} from '@/lib/services/election-results.service';

export const revalidate = 86400; // 24 hours — static data, rarely changes

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

  if (type === 'house') {
    if (!district) {
      return NextResponse.json(
        { error: 'Missing "district" parameter (e.g., district=PA-07)' },
        { status: 400 }
      );
    }
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
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  }

  if (type === 'president' || type === 'senate' || type === 'governor') {
    if (!state) {
      return NextResponse.json(
        { error: `Missing "state" parameter (e.g., state=GA)` },
        { status: 400 }
      );
    }
    const officeMap = {
      president: 'US_PRESIDENT',
      senate: 'US_SENATE',
      governor: 'GOVERNOR',
    } as const;
    const result = getStatewideResult2024(state, officeMap[type]);
    return NextResponse.json(
      { result, metadata: ELECTION_2024_METADATA },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  }

  if (type === 'state-leg') {
    if (!district) {
      return NextResponse.json(
        { error: 'Missing "district" parameter (e.g., district=AL-lower-1)' },
        { status: 400 }
      );
    }
    const result = getStateLegResult2024(district);
    return NextResponse.json(
      { result, metadata: ELECTION_2024_METADATA },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  }

  return NextResponse.json({ error: 'Unhandled type' }, { status: 400 });
}

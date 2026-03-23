/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/elections/history
 *
 * Query multi-year House election history for a district (2014-2024).
 *
 * Params:
 *   district — District key in STATE-DD format (e.g., 'PA-07')
 *
 * Examples:
 *   /api/elections/history?district=PA-07
 *   /api/elections/history?district=GA-06
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getHouseElectionHistory,
  ELECTION_YEARS,
  REDISTRICTING_YEAR,
} from '@/lib/services/election-results.service';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const district = searchParams.get('district');

  if (!district) {
    return NextResponse.json(
      {
        error: 'Missing "district" parameter (e.g., district=PA-07)',
        example: '/api/elections/history?district=PA-07',
      },
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

  const state = district.slice(0, dashIdx);
  const distNum = district.slice(dashIdx + 1);
  const history = getHouseElectionHistory(state, distNum);

  return NextResponse.json(
    {
      success: true,
      history,
      metadata: {
        source: 'MIT Election Data and Science Lab (MEDSL)',
        doi: '10.7910/DVN/IG0UN2',
        availableYears: ELECTION_YEARS,
        redistrictingYear: REDISTRICTING_YEAR,
        note: 'Districts changed after the 2020 Census. Results from 2014-2020 use pre-redistricting boundaries.',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
      },
    }
  );
}

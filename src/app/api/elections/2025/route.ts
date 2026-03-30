/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/elections/2025
 *
 * Query 2025 election results. Only NJ and VA held statewide races in 2025.
 *
 * Params:
 *   type  — governor (only type available for 2025)
 *   state — Two-letter state code (NJ or VA)
 *
 * Examples:
 *   /api/elections/2025?type=governor&state=NJ
 *   /api/elections/2025?type=governor&state=VA
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  STATEWIDE_RESULTS_2025,
  ELECTION_2025_METADATA,
} from '@/data/election-results-2025-statewide';

export const revalidate = 86400; // 24 hours — static data

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type');
  const state = searchParams.get('state');

  if (!type || type !== 'governor') {
    return NextResponse.json(
      {
        error: 'Only type=governor is available for 2025',
        examples: [
          '/api/elections/2025?type=governor&state=NJ',
          '/api/elections/2025?type=governor&state=VA',
        ],
      },
      { status: 400 }
    );
  }

  if (!state) {
    return NextResponse.json({ error: 'Missing "state" parameter' }, { status: 400 });
  }

  const stateUpper = state.toUpperCase();
  const key = `${stateUpper}-GOVERNOR`;
  const result = STATEWIDE_RESULTS_2025[key];

  if (!result) {
    return NextResponse.json({
      year: 2025,
      office: 'GOVERNOR',
      districtId: key,
      dataAvailable: false,
      reason: ELECTION_2025_METADATA.coveredStates.includes(stateUpper)
        ? 'district_not_found'
        : 'state_not_in_dataset',
    });
  }

  return NextResponse.json(
    {
      ...result,
      year: 2025,
      office: 'GOVERNOR',
      districtId: key,
      dataAvailable: true,
    },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=172800',
      },
    }
  );
}

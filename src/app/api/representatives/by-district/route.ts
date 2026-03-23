/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRepresentativesByState } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const state = searchParams.get('state');
  const district = searchParams.get('district');

  if (!state || !district) {
    return NextResponse.json({ error: 'State and district required' }, { status: 400 });
  }

  try {
    logger.info('Fetching representative by district', { state, district });

    // Get representatives for this state only (not all 535)
    const stateReps = await getRepresentativesByState(state);

    // Filter for the specific district
    const districtReps = stateReps.filter(
      rep => rep.district === district && rep.chamber === 'House'
    );

    // Add senators for the state
    const senators = stateReps.filter(rep => rep.chamber === 'Senate');

    const representatives = [...districtReps, ...senators];

    if (representatives.length === 0) {
      logger.warn('No representatives found for district', { state, district });
      return NextResponse.json(
        {
          representatives: [],
          message: `No representatives found for ${state}-${district}`,
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        }
      );
    }

    logger.info('Successfully found representatives for district', {
      state,
      district,
      count: representatives.length,
    });

    return NextResponse.json(
      { representatives },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    logger.error('Error fetching district representative', error as Error, {
      state,
      district,
    });
    return NextResponse.json({ error: 'Failed to fetch representative' }, { status: 500 });
  }
}

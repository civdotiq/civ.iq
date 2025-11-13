/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

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

    // Get all representatives
    const allReps = await getAllEnhancedRepresentatives();

    // Filter for the specific district
    const districtReps = allReps.filter(
      rep => rep.state === state && rep.district === district && rep.chamber === 'House'
    );

    // Add senators for the state
    const senators = allReps.filter(rep => rep.state === state && rep.chamber === 'Senate');

    const representatives = [...districtReps, ...senators];

    if (representatives.length === 0) {
      logger.warn('No representatives found for district', { state, district });
      return NextResponse.json({
        representatives: [],
        message: `No representatives found for ${state}-${district}`,
      });
    }

    logger.info('Successfully found representatives for district', {
      state,
      district,
      count: representatives.length,
    });

    return NextResponse.json({ representatives });
  } catch (error) {
    logger.error('Error fetching district representative', error as Error, {
      state,
      district,
    });
    return NextResponse.json({ error: 'Failed to fetch representative' }, { status: 500 });
  }
}

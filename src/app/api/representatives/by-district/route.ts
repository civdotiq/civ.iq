/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { structuredLogger } from '@/lib/logging/logger';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const state = searchParams.get('state');
  const district = searchParams.get('district');

  if (!state || !district) {
    return NextResponse.json({ error: 'State and district required' }, { status: 400 });
  }

  try {
    structuredLogger.info('Fetching representative by district', { state, district });

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
      structuredLogger.warn('No representatives found for district', { state, district });
      return NextResponse.json({
        representatives: [],
        message: `No representatives found for ${state}-${district}`,
      });
    }

    structuredLogger.info('Successfully found representatives for district', {
      state,
      district,
      count: representatives.length,
    });

    return NextResponse.json({ representatives });
  } catch (error) {
    structuredLogger.error('Error fetching district representative', error as Error, {
      state,
      district,
    });
    return NextResponse.json({ error: 'Failed to fetch representative' }, { status: 500 });
  }
}

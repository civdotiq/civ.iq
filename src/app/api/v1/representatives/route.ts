/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — List Representatives
 *
 * Returns all current members of Congress with optional filters.
 * Wraps the same service as /api/representatives/all.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { v1Success, v1Error } from '@/lib/api/v1-response';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = request.nextUrl;
    const chamber = searchParams.get('chamber');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1),
      535
    );
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const allReps = await getAllEnhancedRepresentatives();

    if (!allReps || allReps.length === 0) {
      return NextResponse.json(v1Error(503, 'Representative data temporarily unavailable'), {
        status: 503,
      });
    }

    // Apply filters
    let filtered = allReps;

    if (chamber) {
      const chamberFilter = chamber.toLowerCase() === 'house' ? 'House' : 'Senate';
      filtered = filtered.filter(rep => rep.chamber === chamberFilter);
    }

    if (state) {
      const stateFilter = state.toUpperCase();
      filtered = filtered.filter(rep => rep.state === stateFilter);
    }

    if (party) {
      const partyFilter = party.toUpperCase();
      filtered = filtered.filter(rep => rep.party === partyFilter);
    }

    const total = filtered.length;
    const paged = filtered.slice(offset, offset + limit);

    // Map to v1 shape
    const data = paged.map(rep => ({
      bioguideId: rep.bioguideId,
      name: rep.name,
      party: rep.party,
      state: rep.state,
      district: rep.district ?? null,
      chamber: rep.chamber,
      title: rep.title,
      phone: rep.currentTerm?.phone || rep.phone || null,
      website: rep.currentTerm?.website || rep.website || null,
      yearsInOffice: rep.yearsInOffice ?? null,
      nextElection: rep.nextElection ?? null,
    }));

    logger.info('v1 representatives list', {
      total,
      returned: data.length,
      filters: { chamber, state, party },
    });

    return NextResponse.json(v1Success(data, 'congress-legislators', { total, limit, offset }), {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    logger.error('v1 representatives error', error as Error);
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}

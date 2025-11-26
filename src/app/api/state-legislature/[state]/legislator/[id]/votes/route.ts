/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Voting Records API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/votes
 * Returns voting records for a specific state legislator using OpenStates v3 API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import { normalizeStateIdentifier } from '@/lib/data/us-states';

// Votes are immutable historical records - use long-term caching
export const revalidate = 15552000; // 6 months in seconds

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id); // Decode Base64 ID
    const page = parseInt(searchParams.get('page') || '1', 10);
    const perPage = parseInt(searchParams.get('per_page') || '20', 10);
    // Fetch more to calculate statistics (max 100)
    const limit = Math.min(100, Math.max(perPage * 5, 50));

    // Normalize state identifier (handles both "MI" and "Michigan")
    const stateCode = normalizeStateIdentifier(state);

    if (!stateCode || !legislatorId) {
      logger.warn('State legislator votes API request missing parameters', {
        state,
        stateCode,
        id: legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator voting records', {
      state: stateCode,
      legislatorId,
      limit,
    });

    // Verify the legislator exists first
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      stateCode,
      legislatorId
    );

    if (!legislator) {
      logger.warn('State legislator not found for votes request', {
        state: stateCode,
        legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Fetch voting records using core service
    const votes = await StateLegislatureCoreService.getStateLegislatorVotes(
      stateCode,
      legislatorId,
      limit
    );

    // Calculate statistics from all fetched votes
    const statistics = {
      total: votes.length,
      yes: votes.filter(v => v.option === 'yes').length,
      no: votes.filter(v => v.option === 'no').length,
      abstain: votes.filter(v => v.option === 'abstain' || v.option === 'not voting').length,
      absent: votes.filter(v => v.option === 'absent' || v.option === 'excused').length,
    };

    // Paginate the results
    const startIdx = (page - 1) * perPage;
    const endIdx = startIdx + perPage;
    const paginatedVotes = votes.slice(startIdx, endIdx);

    logger.info('State legislator votes request successful', {
      state: stateCode,
      legislatorId,
      legislatorName: legislator.name,
      voteCount: votes.length,
      page,
      perPage,
      responseTime: Date.now() - startTime,
    });

    // Votes never change once cast - use long-term cache headers
    const headers = new Headers({
      'Cache-Control': 'public, max-age=15552000, stale-while-revalidate=86400', // 6 months cache
      'CDN-Cache-Control': 'public, max-age=15552000',
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(
      {
        success: true,
        votes: paginatedVotes,
        total: votes.length,
        page,
        per_page: perPage,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          chamber: legislator.chamber,
          district: legislator.district,
          party: legislator.party,
        },
        statistics,
        state: stateCode,
      },
      { status: 200, headers }
    );
  } catch (error) {
    logger.error('State legislator votes request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch state legislator voting records',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id); // Decode Base64 ID
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!state || !legislatorId) {
      logger.warn('State legislator votes API request missing parameters', {
        state,
        id: legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator voting records', {
      state: state.toUpperCase(),
      legislatorId,
      limit,
    });

    // Verify the legislator exists first
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      legislatorId
    );

    if (!legislator) {
      logger.warn('State legislator not found for votes request', {
        state: state.toUpperCase(),
        legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Fetch voting records using core service
    const votes = await StateLegislatureCoreService.getStateLegislatorVotes(
      state.toUpperCase(),
      legislatorId,
      limit
    );

    logger.info('State legislator votes request successful', {
      state: state.toUpperCase(),
      legislatorId,
      legislatorName: legislator.name,
      voteCount: votes.length,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        votes,
        count: votes.length,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          chamber: legislator.chamber,
          district: legislator.district,
          party: legislator.party,
        },
        state: state.toUpperCase(),
      },
      { status: 200 }
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

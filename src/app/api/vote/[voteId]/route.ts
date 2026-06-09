/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Vote Detail API - Individual Vote Analysis
 *
 * This endpoint fetches comprehensive vote details for both House and Senate votes.
 * It automatically determines the chamber from the vote ID format and routes appropriately.
 * Supports numeric IDs and chamber-prefixed IDs like 'house-119-116' or 'senate-119-2-00042'.
 *
 * All parsing lives in the shared vote service (src/lib/services/vote.service.ts),
 * which is also used by server components.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getVoteDetailsService, type UnifiedVoteDetail } from '@/lib/services/vote.service';

export const dynamic = 'force-dynamic';

interface VoteResponse {
  vote: UnifiedVoteDetail | null;
  success: boolean;
  error?: string;
  metadata: {
    timestamp: string;
    requestId: string;
    responseTime: number;
  };
}

function buildMetadata(startTime: number): VoteResponse['metadata'] {
  return {
    timestamp: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    responseTime: Date.now() - startTime,
  };
}

/**
 * API Route Handler - GET /api/vote/[voteId]
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ voteId: string }> }
) {
  const startTime = Date.now();
  let voteId = '';

  try {
    const resolvedParams = await params;
    voteId = resolvedParams?.voteId?.toString() || '';

    if (!voteId) {
      logger.warn('Missing vote ID', { voteId });
      const errorResponse: VoteResponse = {
        vote: null,
        success: false,
        error: 'Vote ID is required.',
        metadata: buildMetadata(startTime),
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    logger.info('Detailed vote API called', { voteId });

    const voteDetail = await getVoteDetailsService(voteId);

    if (!voteDetail) {
      logger.warn('Vote not found or failed to parse', { voteId });
      const notFoundResponse: VoteResponse = {
        vote: null,
        success: false,
        error: `Vote ${voteId} not found or could not be parsed`,
        metadata: buildMetadata(startTime),
      };
      return NextResponse.json(notFoundResponse, { status: 404 });
    }

    const successResponse: VoteResponse = {
      vote: voteDetail,
      success: true,
      metadata: buildMetadata(startTime),
    };

    logger.info('Detailed vote API completed successfully', {
      voteId,
      responseTime: Date.now() - startTime,
      memberCount: voteDetail.members.length,
    });

    return NextResponse.json(successResponse, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    logger.error('Unexpected error in detailed vote API', error as Error, { voteId });

    const errorResponse: VoteResponse = {
      vote: null,
      success: false,
      error: 'Internal server error while fetching vote details',
      metadata: buildMetadata(startTime),
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

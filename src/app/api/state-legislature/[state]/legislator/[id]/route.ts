/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Detail API
 *
 * GET /api/state-legislature/[state]/legislator/[id]
 * Returns detailed information about a specific state legislator using StateLegislatureCoreService.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;
    const legislatorId = decodeURIComponent(id); // Decode URL-encoded ID

    if (!state || !legislatorId) {
      logger.warn('State legislator API request missing parameters', { state, id: legislatorId });
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator via core service', {
      state: state.toUpperCase(),
      legislatorId,
    });

    // Use StateLegislatureCoreService for direct access (NO HTTP calls!)
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      state.toUpperCase(),
      legislatorId
    );

    if (!legislator) {
      logger.warn('State legislator not found', {
        state: state.toUpperCase(),
        legislatorId,
      });
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    logger.info('State legislator request successful', {
      state: state.toUpperCase(),
      legislatorId,
      legislatorName: legislator.name,
      chamber: legislator.chamber,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        legislator,
      },
      { status: 200 }
    );
  } catch (error) {
    logger.error('State legislator request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch state legislator',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

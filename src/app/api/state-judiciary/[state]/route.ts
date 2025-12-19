/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Judiciary API Endpoint
 *
 * GET /api/state-judiciary/[state]
 *
 * Returns state supreme court justices and judicial system information
 * powered by Wikidata.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getStateCourtSystem } from '@/lib/api/wikidata-state-judiciary';
import type { StateJudiciaryApiResponse } from '@/types/state-judiciary';

export const runtime = 'edge';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string }> }
) {
  const { state } = await params;

  if (!state || state.length !== 2) {
    const response: StateJudiciaryApiResponse = {
      success: false,
      error: 'Valid state abbreviation is required',
    };
    return NextResponse.json(response, { status: 400 });
  }

  try {
    const cacheKey = `state-judiciary-${state.toUpperCase()}`;
    const TTL_24_HOURS = 24 * 60 * 60 * 1000;

    const courtSystem = await cachedFetch(
      cacheKey,
      async () => {
        logger.info(
          'Fetching state judiciary',
          {
            state: state.toUpperCase(),
            operation: 'state_judiciary_fetch',
          },
          request
        );

        return await getStateCourtSystem(state.toUpperCase());
      },
      TTL_24_HOURS
    );

    if (!courtSystem) {
      const response: StateJudiciaryApiResponse = {
        success: false,
        error: 'State judiciary data not available',
      };
      return NextResponse.json(response, { status: 404 });
    }

    const response: StateJudiciaryApiResponse = {
      success: true,
      data: courtSystem,
      metadata: {
        cacheHit: false, // cachedFetch doesn't return this info
        responseTime: 0,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error(
      'State Judiciary API Error',
      error as Error,
      {
        state: state.toUpperCase(),
        operation: 'state_judiciary_api_error',
      },
      request
    );

    const response: StateJudiciaryApiResponse = {
      success: false,
      error: 'State judiciary data temporarily unavailable',
    };

    return NextResponse.json(response, { status: 200 });
  }
}

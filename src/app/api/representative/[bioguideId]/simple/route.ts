/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const runtime = 'edge';

// ISR: Revalidate every 1 week
export const revalidate = 604800;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();

  logger.info('Simple API: Fetching representative', { bioguideId: upperBioguideId });

  const API_KEY = process.env.CONGRESS_API_KEY;

  if (!API_KEY) {
    logger.error('Simple API: No CONGRESS_API_KEY found');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  // Congress.gov API endpoint
  const url = `https://api.congress.gov/v3/member/${upperBioguideId}?api_key=${API_KEY}`;

  try {
    logger.debug('Simple API: Calling Congress.gov API');
    const response = await fetch(url);

    logger.debug('Simple API: Response received', { status: response.status });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Simple API: Congress.gov error', { status: response.status, error: errorText });
      return NextResponse.json(
        {
          error: 'Representative not found in Congress.gov',
          bioguideId: upperBioguideId,
          status: response.status,
        },
        { status: 404 }
      );
    }

    const data = await response.json();

    logger.info('Simple API: Success, returning data');

    // Return the raw Congress.gov data
    return NextResponse.json(data);
  } catch (error) {
    logger.error('Simple API: Fetch failed', error as Error);
    return NextResponse.json(
      {
        error: 'Failed to fetch representative data',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

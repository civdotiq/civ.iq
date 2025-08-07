/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();

  // eslint-disable-next-line no-console
  console.log('[API SIMPLE] Fetching representative:', upperBioguideId);

  const API_KEY = process.env.CONGRESS_API_KEY;

  if (!API_KEY) {
    // eslint-disable-next-line no-console
    console.error('[API SIMPLE] No CONGRESS_API_KEY found');
    return NextResponse.json({ error: 'API configuration error' }, { status: 500 });
  }

  // Congress.gov API endpoint
  const url = `https://api.congress.gov/v3/member/${upperBioguideId}?api_key=${API_KEY}`;

  try {
    // eslint-disable-next-line no-console
    console.log('[API SIMPLE] Calling Congress.gov API');
    const response = await fetch(url);

    // eslint-disable-next-line no-console
    console.log('[API SIMPLE] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      // eslint-disable-next-line no-console
      console.error('[API SIMPLE] Congress.gov error:', errorText);
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

    // eslint-disable-next-line no-console
    console.log('[API SIMPLE] Success, returning data');

    // Return the raw Congress.gov data
    return NextResponse.json(data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API SIMPLE] Fetch failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch representative data',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

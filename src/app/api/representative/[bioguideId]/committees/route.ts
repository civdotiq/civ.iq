/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  try {
    const { bioguideId } = await params;

    if (!bioguideId) {
      return NextResponse.json({ error: 'BioguideId required' }, { status: 400 });
    }

    if (!process.env.CONGRESS_API_KEY) {
      return new NextResponse('Congress.gov API key required', { status: 500 });
    }

    const response = await fetch(
      `https://api.congress.gov/v3/member/${bioguideId}?api_key=${process.env.CONGRESS_API_KEY}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
        },
      }
    );

    if (!response.ok) {
      logger.error('Congress.gov member API failed', new Error(`HTTP ${response.status}`), {
        bioguideId,
        status: response.status,
      });
      return new NextResponse('Failed to fetch from Congress.gov', { status: 500 });
    }

    const data = await response.json();
    const committees = data.member?.committees || [];

    logger.info('Successfully fetched member committees from Congress.gov', {
      bioguideId,
      committeeCount: committees.length,
    });

    return NextResponse.json({ committees });
  } catch (error) {
    logger.error('Representative committees API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('Congress.gov failed', { status: 500 });
  }
}

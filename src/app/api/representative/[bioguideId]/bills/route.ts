/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

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
      `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=100`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
        },
      }
    );

    if (!response.ok) {
      logger.error(
        'Congress.gov sponsored legislation API failed',
        new Error(`HTTP ${response.status}`),
        {
          bioguideId,
          status: response.status,
        }
      );
      return new NextResponse('Failed to fetch from Congress.gov', { status: 500 });
    }

    const data = await response.json();

    logger.info('Successfully fetched sponsored legislation from Congress.gov', {
      bioguideId,
      billCount: data.sponsoredLegislation?.length || 0,
    });

    return NextResponse.json(data);
  } catch (error) {
    logger.error('Representative bills API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('Congress.gov failed', { status: 500 });
  }
}

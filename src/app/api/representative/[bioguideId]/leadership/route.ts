/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const runtime = 'edge';

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
      `https://api.congress.gov/v3/member?currentMember=true&limit=250&api_key=${process.env.CONGRESS_API_KEY}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
        },
      }
    );

    if (!response.ok) {
      logger.error('Congress.gov members API failed', new Error(`HTTP ${response.status}`), {
        bioguideId,
        status: response.status,
      });
      return new NextResponse('Failed to fetch from Congress.gov', { status: 500 });
    }

    const data = await response.json();
    const members = data.members || [];
    const member = members.find((m: { bioguideId: string }) => m.bioguideId === bioguideId);
    const leadership = member?.leadership || [];

    logger.info('Successfully fetched member leadership from Congress.gov', {
      bioguideId,
      leadershipCount: leadership.length,
    });

    return NextResponse.json({ leadership });
  } catch (error) {
    logger.error('Representative leadership API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('Congress.gov failed', { status: 500 });
  }
}

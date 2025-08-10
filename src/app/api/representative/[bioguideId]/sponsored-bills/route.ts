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

    // Use current Congress (119th - 2025-2027)
    const congress = process.env.CURRENT_CONGRESS || '119';

    const response = await fetch(
      `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=100&congress=${congress}`,
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
          congress,
        }
      );
      return new NextResponse('Failed to fetch sponsored bills from Congress.gov', {
        status: 500,
      });
    }

    const data = await response.json();

    // Filter for 119th Congress bills only
    const currentCongressBills = data.sponsoredLegislation?.filter(
      (bill: { congress?: number | string }) => bill.congress?.toString() === congress
    );

    logger.info('Successfully fetched sponsored bills from Congress.gov', {
      bioguideId,
      congress,
      billCount: currentCongressBills?.length || 0,
      totalFetched: data.sponsoredLegislation?.length || 0,
    });

    return NextResponse.json({
      ...data,
      sponsoredLegislation: currentCongressBills,
      metadata: {
        congress: parseInt(congress),
        totalBills: currentCongressBills?.length || 0,
        source: 'Congress.gov API',
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Representative sponsored bills API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('Failed to fetch sponsored bills', { status: 500 });
  }
}

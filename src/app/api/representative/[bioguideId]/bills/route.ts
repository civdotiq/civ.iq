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

    // Use last 3 congresses (117th - 2021-2023, 118th - 2023-2025, 119th - 2025-2027)
    const currentCongress = parseInt(process.env.CURRENT_CONGRESS || '119');
    const congressesToFetch = [currentCongress - 2, currentCongress - 1, currentCongress]; // 117, 118, 119

    // Fetch bills from multiple congresses
    const fetchPromises = congressesToFetch.map(congress =>
      fetch(
        `https://api.congress.gov/v3/member/${bioguideId}/sponsored-legislation?api_key=${process.env.CONGRESS_API_KEY}&limit=100&congress=${congress}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
          },
        }
      )
    );

    const responses = await Promise.all(fetchPromises);

    // Check if any requests failed
    const failedResponses = responses.filter(response => !response.ok);
    if (failedResponses.length > 0) {
      const firstFailed = failedResponses[0];
      logger.error(
        'Congress.gov sponsored legislation API failed',
        new Error(`HTTP ${firstFailed?.status || 'unknown'}`),
        {
          bioguideId,
          status: firstFailed?.status || 'unknown',
          failedCount: failedResponses.length,
        }
      );
      return new NextResponse('Failed to fetch from Congress.gov', { status: 500 });
    }

    // Process all responses and combine bills
    const allBillsData = await Promise.all(responses.map(response => response.json()));
    const allBills = allBillsData.flatMap(data => data.sponsoredLegislation || []);

    // Filter for the target congresses (117th, 118th, 119th)
    const targetCongressBills = allBills.filter((bill: { congress?: number | string }) =>
      congressesToFetch.includes(parseInt(bill.congress?.toString() || '0'))
    );

    logger.info('Successfully fetched sponsored legislation from Congress.gov', {
      bioguideId,
      congresses: congressesToFetch,
      billCount: targetCongressBills?.length || 0,
      totalFetched: allBills?.length || 0,
    });

    return NextResponse.json({
      sponsoredLegislation: targetCongressBills,
      metadata: {
        congresses: congressesToFetch,
        totalBills: targetCongressBills?.length || 0,
        source: 'Congress.gov API',
        generatedAt: new Date().toISOString(),
        congressLabels: {
          117: '117th Congress (2021-2023)',
          118: '118th Congress (2023-2025)',
          119: '119th Congress (2025-2027)',
        },
      },
    });
  } catch (error) {
    logger.error('Representative bills API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('Congress.gov failed', { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    if (!process.env.CONGRESS_API_KEY) {
      return new NextResponse('Congress.gov API key required', { status: 500 });
    }

    // Use current Congress (119th - 2025-2027)
    const congress = process.env.CURRENT_CONGRESS || '119';
    const { searchParams } = req.nextUrl;
    const limit = searchParams.get('limit') || '50';
    const sort = searchParams.get('sort') || 'updateDate+desc';

    const response = await fetch(
      `https://api.congress.gov/v3/bill/${congress}?api_key=${process.env.CONGRESS_API_KEY}&limit=${limit}&sort=${sort}`,
      {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Democratic Platform)',
        },
      }
    );

    if (!response.ok) {
      logger.error('Congress.gov latest bills API failed', new Error(`HTTP ${response.status}`), {
        status: response.status,
        congress,
      });
      return new NextResponse('Failed to fetch latest bills from Congress.gov', {
        status: 500,
      });
    }

    const data = await response.json();

    logger.info('Successfully fetched latest bills from Congress.gov', {
      congress,
      billCount: data.bills?.length || 0,
      limit,
    });

    return NextResponse.json({
      ...data,
      metadata: {
        congress: parseInt(congress),
        totalBills: data.bills?.length || 0,
        source: 'Congress.gov API',
        generatedAt: new Date().toISOString(),
        queryParams: {
          limit: parseInt(limit),
          sort,
        },
      },
    });
  } catch (error) {
    logger.error('Latest bills API error', error as Error);
    return new NextResponse('Failed to fetch latest bills', { status: 500 });
  }
}

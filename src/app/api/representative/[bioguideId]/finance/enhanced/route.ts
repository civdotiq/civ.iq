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

    if (!process.env.FEC_API_KEY) {
      return new NextResponse('FEC API key required', { status: 500 });
    }

    // This would require complex FEC candidate ID mapping - for now return unavailable
    logger.warn('Enhanced finance data not available - requires FEC candidate mapping', {
      bioguideId,
      reason: 'Complex bioguideId to FEC ID mapping required',
    });

    return new NextResponse('Enhanced finance data unavailable from FEC', { status: 500 });
  } catch (error) {
    logger.error('Enhanced finance API error', error as Error, {
      bioguideId: (await params).bioguideId,
    });

    return new NextResponse('FEC failed', { status: 500 });
  }
}

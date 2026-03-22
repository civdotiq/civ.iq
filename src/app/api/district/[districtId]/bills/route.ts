/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District → Relevant Bills API — Gap 8 Join Endpoint
 *
 * Thin wrapper around the district-bills service.
 * Core logic lives in @/lib/services/district-bills.service.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  parseDistrictId,
  getDistrictBills,
  type DistrictBillsResult,
} from '@/lib/services/district-bills.service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse<DistrictBillsResult | { error: string }>> {
  const { districtId } = await params;

  const parsed = parseDistrictId(districtId);
  if (!parsed) {
    return NextResponse.json(
      { error: 'Invalid district ID format. Use format: ST-DD (e.g., MI-05, CA-12, AK-AL)' },
      { status: 400 }
    );
  }

  if (!process.env.CONGRESS_API_KEY) {
    return NextResponse.json({ error: 'Congress.gov API key not configured' }, { status: 503 });
  }

  try {
    const { state, district } = parsed;
    logger.info('District bills join request', { districtId, state, district });

    const { searchParams } = request.nextUrl;
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30);

    const result = await getDistrictBills(state, district, limit);

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch district bills' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('District bills join error', error as Error, { districtId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

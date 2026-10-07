/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getCachedDistrictDetails } from '@/lib/districts/district-details';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;

    // Special case: redirect /api/districts/all to correct endpoint
    if (districtId === 'all') {
      logger.info('Redirecting districts/all request to correct endpoint');
      return NextResponse.redirect(new URL('/api/districts/all', request.url));
    }

    logger.info('District details API request', { districtId });

    const district = await getCachedDistrictDetails(districtId);

    if (!district) {
      return NextResponse.json({ error: 'District not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        district,
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'congress-legislators + census-api + census-tiger-2023',
          note: 'Political data unavailable. Demographic data from Census API when available, otherwise marked as unavailable.',
          districtBoundaries: {
            congress: '119th Congress (2023-2025)',
            redistrictingYear: '2023',
            source: 'Census TIGER/Line 2023',
            note: 'Geographic data reflects post-2023 redistricting boundaries',
          },
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    const resolvedParams = await params;
    logger.error('District details API error', error as Error, {
      districtId: resolvedParams.districtId,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch district details',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

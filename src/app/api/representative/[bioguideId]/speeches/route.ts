/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFloorSpeeches } from '@/lib/data-sources/congressional-record.service';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';
import type { SpeechesResponse } from '@/types/govinfo';

export const dynamic = 'force-dynamic';

/**
 * GET /api/representative/[bioguideId]/speeches
 *
 * Fetch floor speeches from the Congressional Record for a specific member.
 *
 * Query params:
 *   pageSize - number of results (default 20, max 50)
 *   offset   - pagination offset mark (default '*')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<SpeechesResponse>> {
  try {
    const { bioguideId } = await params;

    if (!bioguideId || bioguideId.length < 3) {
      return NextResponse.json(
        {
          success: false,
          speeches: [],
          pagination: { total: 0, pageSize: 20, hasMore: false },
          metadata: {
            bioguideId: bioguideId ?? '',
            memberName: '',
            dataSource: 'govinfo.gov',
            dataAsOf: new Date().toISOString(),
          },
          error: 'Invalid bioguide ID',
        },
        { status: 400 }
      );
    }

    const { searchParams } = request.nextUrl;
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')));
    const offsetMark = searchParams.get('offset') ?? '*';

    // Look up member name from bioguide ID
    const allReps = await getAllEnhancedRepresentatives();
    const member = allReps.find((r: EnhancedRepresentative) => r.bioguideId === bioguideId);

    if (!member) {
      return NextResponse.json(
        {
          success: false,
          speeches: [],
          pagination: { total: 0, pageSize, hasMore: false },
          metadata: {
            bioguideId,
            memberName: '',
            dataSource: 'govinfo.gov',
            dataAsOf: new Date().toISOString(),
          },
          error: 'Member not found',
        },
        { status: 404 }
      );
    }

    logger.info('Fetching floor speeches', { bioguideId, memberName: member.name, pageSize });

    const { speeches, total, hasMore, dataAsOf } = await getFloorSpeeches(bioguideId, member.name, {
      pageSize,
      offsetMark,
    });

    return NextResponse.json(
      {
        success: true,
        speeches,
        pagination: { total, pageSize, hasMore },
        metadata: {
          bioguideId,
          memberName: member.name,
          dataSource: 'govinfo.gov',
          dataAsOf,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Speeches API error', error as Error);

    const resolvedParams = await params;

    return NextResponse.json(
      {
        success: false,
        speeches: [],
        pagination: { total: 0, pageSize: 20, hasMore: false },
        metadata: {
          bioguideId: resolvedParams.bioguideId ?? '',
          memberName: '',
          dataSource: 'govinfo.gov',
          dataAsOf: new Date().toISOString(),
        },
        error: message,
      },
      { status: 500 }
    );
  }
}

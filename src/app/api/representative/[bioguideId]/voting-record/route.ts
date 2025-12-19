/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * EMERGENCY HOTFIX: Simplified voting-record API route to restore production functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '20');
  const congress = parseInt(searchParams.get('congress') || '119');

  logger.info('[Voting API] Emergency endpoint called', { bioguideId, limit, congress });

  try {
    // TEMPORARY: Return empty voting records structure to prevent frontend crashes
    const response = {
      member: {
        bioguideId,
        name: 'Loading...',
        chamber: 'House',
        party: '',
        congress,
      },
      votingRecords: [],
      statistics: {
        totalVotes: 0,
        attendanceRate: 0,
        positions: { yea: 0, nay: 0, present: 0, notVoting: 0 },
      },
      metadata: {
        totalRecords: 0,
        congress,
        session: 1,
        dataSource: 'emergency-hotfix',
        lastUpdated: new Date().toISOString(),
        cacheStatus: 'EMERGENCY HOTFIX: Voting records temporarily unavailable',
      },
    };

    logger.warn('[Voting API] Returning emergency empty response', { bioguideId });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Voting API] Emergency endpoint error', error as Error, { bioguideId });

    return NextResponse.json(
      {
        error: 'Voting records temporarily unavailable',
        member: {
          bioguideId,
        },
        votingRecords: [],
        statistics: {
          totalVotes: 0,
          attendanceRate: 0,
          positions: { yea: 0, nay: 0, present: 0, notVoting: 0 },
        },
        metadata: {
          totalRecords: 0,
          dataSource: 'error',
          lastUpdated: new Date().toISOString(),
          cacheStatus: 'Error occurred while fetching voting records',
        },
      },
      { status: 500 }
    );
  }
}

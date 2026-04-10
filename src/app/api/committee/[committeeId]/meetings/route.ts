/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  fetchCommitteeMeetings,
  type CommitteeMeetingDetailed,
} from '@/lib/services/committee-activity.service';

export const dynamic = 'force-dynamic';

// Re-export the detailed meeting shape under the route's public name
// so existing consumers of this API continue to type-check.
export type CommitteeMeeting = CommitteeMeetingDetailed;

interface CommitteeMeetingsResponse {
  success: boolean;
  committeeId: string;
  meetings: CommitteeMeeting[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  metadata: {
    lastUpdated: string;
    dataSource: string;
    congress: number;
  };
  error?: string;
}

const CURRENT_CONGRESS = 119;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<CommitteeMeetingsResponse>> {
  try {
    const { committeeId } = await params;
    const { searchParams } = request.nextUrl;

    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');
    const chamberParam = searchParams.get('chamber')?.toLowerCase();

    logger.info('Committee meetings API request', {
      committeeId,
      limit,
      offset,
      chamber: chamberParam,
    });

    // Determine chamber from committee ID if not specified
    let chamber: 'House' | 'Senate' = 'House';
    if (chamberParam === 'senate' || chamberParam === 's') {
      chamber = 'Senate';
    } else if (chamberParam === 'house' || chamberParam === 'h') {
      chamber = 'House';
    } else if (
      committeeId.toUpperCase().startsWith('SS') ||
      committeeId.toUpperCase().startsWith('SJ')
    ) {
      chamber = 'Senate';
    }

    const { meetings, total } = await fetchCommitteeMeetings(committeeId, chamber, limit, offset);

    return NextResponse.json(
      {
        success: true,
        committeeId,
        meetings,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + meetings.length < total,
        },
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('Committee meetings API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        committeeId: '',
        meetings: [],
        pagination: { total: 0, limit: 20, offset: 0, hasMore: false },
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSource: 'congress.gov',
          congress: CURRENT_CONGRESS,
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

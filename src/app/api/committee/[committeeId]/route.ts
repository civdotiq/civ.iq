/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import type { Committee, CommitteeAPIResponse } from '@/types/committee';
import { getCommitteeDataService } from '@/lib/services/committee.service';

// ISR: Revalidate every 1 day
export const revalidate = 86400;
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<CommitteeAPIResponse>> {
  try {
    const { committeeId: rawCommitteeId } = await params;

    if (!rawCommitteeId) {
      return NextResponse.json(
        {
          committee: {} as Committee,
          metadata: {
            dataSource: 'unavailable',
            lastUpdated: new Date().toISOString(),
            memberCount: 0,
            subcommitteeCount: 0,
            cacheable: false,
          },
          errors: [{ code: 'MISSING_COMMITTEE_ID', message: 'Committee ID is required' }],
        },
        { status: 400 }
      );
    }

    // Check for cache bypass (use ?refresh=true to force fresh data)
    const searchParams = request.nextUrl.searchParams;
    const bypassCache = searchParams.get('refresh') === 'true';

    logger.info('Committee API request', {
      rawCommitteeId,
      bypassCache,
    });

    // Use the shared service for data fetching
    const committee = await getCommitteeDataService(rawCommitteeId, bypassCache);

    if (!committee) {
      return NextResponse.json(
        {
          committee: {} as Committee,
          metadata: {
            dataSource: 'unavailable',
            lastUpdated: new Date().toISOString(),
            memberCount: 0,
            subcommitteeCount: 0,
            cacheable: false,
          },
          errors: [{ code: 'COMMITTEE_NOT_FOUND', message: 'Committee not found' }],
        },
        { status: 404 }
      );
    }

    const response: CommitteeAPIResponse = {
      committee,
      metadata: {
        dataSource: committee.members.length > 0 ? 'congress-legislators' : 'unavailable',
        lastUpdated: committee.lastUpdated,
        memberCount: committee.members.length,
        subcommitteeCount: committee.subcommittees.length,
        cacheable: true,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // 1 hour cache
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown server error';

    logger.error('Committee API error', error as Error, {
      committeeId: (await params).committeeId,
    });

    return NextResponse.json(
      {
        committee: {} as Committee,
        metadata: {
          dataSource: 'unavailable',
          lastUpdated: new Date().toISOString(),
          memberCount: 0,
          subcommitteeCount: 0,
          cacheable: false,
        },
        errors: [
          {
            code: 'INTERNAL_SERVER_ERROR',
            message: errorMessage,
          },
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fecApiService } from '@/lib/fec/fec-api-service';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 6 hours
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const candidateId = searchParams.get('candidateId');
  const currentCycle = (() => {
    const y = new Date().getFullYear();
    return y % 2 === 0 ? y : y + 1;
  })();
  const cycle = parseInt(searchParams.get('cycle') || String(currentCycle), 10);

  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId query parameter is required' }, { status: 400 });
  }

  if (!Number.isFinite(cycle) || cycle < 1980 || cycle > 2030) {
    return NextResponse.json(
      { error: 'cycle must be a year between 1980 and 2030' },
      { status: 400 }
    );
  }

  try {
    logger.info('FEC contributions by size request', { candidateId, cycle });

    const results = await fecApiService.getContributionsBySize(candidateId, cycle);

    if (results.length === 0) {
      return NextResponse.json(
        {
          candidateId,
          cycle,
          buckets: [],
          summary: null,
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: 'FEC API - https://api.open.fec.gov/v1/schedules/schedule_a/by_size/',
            note: 'No contribution size data available for this candidate/cycle',
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
          },
        }
      );
    }

    // Calculate summary statistics
    const totalAmount = results.reduce((sum, b) => sum + (b.total || 0), 0);
    const totalCount = results.reduce((sum, b) => sum + (b.count || 0), 0);
    // FEC schedule_a/by_size bucket floors are 0, 200, 500, 1000, 2000.
    // The "<=$200" small-donor bucket has size === 0 (size === 200 is $200-$499).
    const smallDonorBucket = results.find(b => b.size === 0);
    const smallDonorTotal = smallDonorBucket?.total || 0;
    const smallDonorPercent = totalAmount > 0 ? (smallDonorTotal / totalAmount) * 100 : 0;
    const averageContribution = totalCount > 0 ? totalAmount / totalCount : 0;

    return NextResponse.json(
      {
        candidateId,
        cycle,
        buckets: results,
        summary: {
          totalAmount,
          totalCount,
          smallDonorPercent: Math.round(smallDonorPercent * 10) / 10,
          averageContribution: Math.round(averageContribution),
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'FEC API - https://api.open.fec.gov/v1/schedules/schedule_a/by_size/',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    logger.error('FEC contributions by size API error', error as Error, {
      candidateId,
      cycle,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch FEC contribution size data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

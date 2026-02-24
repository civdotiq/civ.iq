/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fecApiService } from '@/lib/fec/fec-api-service';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 6 hours
export const revalidate = 21600;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const candidateId = searchParams.get('candidateId');
  const cycle = parseInt(searchParams.get('cycle') || '2024');

  if (!candidateId) {
    return NextResponse.json({ error: 'candidateId query parameter is required' }, { status: 400 });
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
    const smallDonorBucket = results.find(b => b.size === 200);
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

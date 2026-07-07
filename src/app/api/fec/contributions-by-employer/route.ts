/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { fecApiService } from '@/lib/fec/fec-api-service';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const candidateId = searchParams.get('candidateId');
  const currentCycle = (() => {
    const y = new Date().getFullYear();
    return y % 2 === 0 ? y : y + 1;
  })();
  const cycle = parseInt(searchParams.get('cycle') || String(currentCycle), 10);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10) || 25, 1), 100);

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
    logger.info('FEC contributions by employer request', { candidateId, cycle, limit });

    const results = await fecApiService.getContributionsByEmployer(candidateId, cycle, limit);

    if (results.length === 0) {
      return NextResponse.json(
        {
          candidateId,
          cycle,
          employers: [],
          summary: null,
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: 'FEC API - https://api.open.fec.gov/v1/schedules/schedule_a/by_employer/',
            note: 'No employer contribution data available for this candidate/cycle',
          },
        },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
          },
        }
      );
    }

    const totalAmount = results.reduce((sum, e) => sum + (e.total || 0), 0);
    const totalCount = results.reduce((sum, e) => sum + (e.count || 0), 0);

    return NextResponse.json(
      {
        candidateId,
        cycle,
        employers: results,
        summary: {
          employersReturned: results.length,
          totalAmount,
          totalCount,
        },
        metadata: {
          timestamp: new Date().toISOString(),
          dataSource: 'FEC API - https://api.open.fec.gov/v1/schedules/schedule_a/by_employer/',
          note: 'Employer strings are self-reported on FEC Schedule A filings and are not normalized. Totals cover only itemized contributions aggregated by the FEC.',
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    logger.error('FEC contributions by employer API error', error as Error, {
      candidateId,
      cycle,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch FEC contribution employer data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  fetchWithSourceStatus,
  computeDataQuality,
  type SourceStatus,
} from '@/types/backbone-response';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  const { bioguideId } = await params;

  if (!bioguideId) {
    return NextResponse.json({ error: 'BioguideId required' }, { status: 400 });
  }

  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) {
    const sourceStatus: SourceStatus = {
      source: 'congress.gov',
      status: 'not-configured',
      errorMessage: 'CONGRESS_API_KEY not set',
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(
      {
        committees: [],
        dataQuality: 'unavailable' as const,
        sourceStatus: [sourceStatus],
      },
      { status: 503 }
    );
  }

  const { data: committees, sourceStatus } = await fetchWithSourceStatus(
    'congress.gov',
    async () => {
      const response = await fetch(`https://api.congress.gov/v3/member/${bioguideId}?format=json`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Congress.gov returned HTTP ${response.status}`);
      }

      const data = await response.json();
      return (data.member?.committees ?? []) as Array<Record<string, unknown>>;
    },
    [] as Array<Record<string, unknown>>
  );

  const dataQuality = computeDataQuality([sourceStatus], committees.length === 0);

  if (sourceStatus.status !== 'ok') {
    logger.error(
      'Congress.gov member API failed',
      new Error(sourceStatus.errorMessage ?? 'unknown'),
      {
        bioguideId,
      }
    );
  } else {
    logger.info('Successfully fetched member committees from Congress.gov', {
      bioguideId,
      committeeCount: committees.length,
    });
  }

  const statusCode = sourceStatus.status === 'ok' ? 200 : 503;

  return NextResponse.json(
    {
      committees,
      dataQuality,
      sourceStatus: [sourceStatus],
    },
    {
      status: statusCode,
      headers: {
        'Cache-Control':
          sourceStatus.status === 'ok'
            ? 'public, s-maxage=86400, stale-while-revalidate=172800'
            : 'no-cache',
      },
    }
  );
}

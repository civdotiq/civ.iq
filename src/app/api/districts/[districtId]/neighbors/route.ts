/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { DISTRICT_NEIGHBORS } from '@/data/district-neighbors';
import { censusCongressionalDistrictCode } from '@/lib/data/us-states';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// The generated data keys single-seat states as "-01" (at-large) or "-98"
// (delegate seats, the Census code). The app and geocoder call both "-AL".
const seatsPerState = new Map<string, number>();
for (const id of Object.keys(DISTRICT_NEIGHBORS)) {
  const state = id.slice(0, 2);
  seatsPerState.set(state, (seatsPerState.get(state) ?? 0) + 1);
}
const isSingleSeat = (state: string) => seatsPerState.get(state) === 1;

/** "WY-AL"/"WY-00" → "WY-01", "DC-AL" → "DC-98", "MI-5" → "MI-05". */
function toDataKey(districtId: string): string {
  const upper = districtId.toUpperCase();
  const match = upper.match(/^([A-Z]{2})-(\d{1,2}|AL)$/);
  if (!match?.[1] || !match[2]) return upper;
  const [, state, district] = match;
  if (isSingleSeat(state)) {
    const census = censusCongressionalDistrictCode(state, district);
    return `${state}-${census === '98' ? '98' : '01'}`;
  }
  return `${state}-${district.padStart(2, '0')}`;
}

/** Data key → the ID district pages and links use ("WY-01" → "WY-AL"). */
function toAppId(key: string): string {
  const state = key.slice(0, 2);
  return isSingleSeat(state) ? `${state}-AL` : key;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;
    logger.info('District neighbors API request', { districtId });

    const dataKey = toDataKey(districtId);
    const normalizedId = toAppId(dataKey);

    const neighbors = (DISTRICT_NEIGHBORS[dataKey] || []).map(toAppId);

    logger.info('Found district neighbors', {
      districtId: normalizedId,
      neighborCount: neighbors.length,
    });

    return NextResponse.json(
      {
        district: normalizedId,
        neighbors: neighbors.map(neighborId => ({
          id: neighborId,
          name: `${neighborId} Congressional District`,
          // Could add more details here like representative name
        })),
        metadata: {
          timestamp: new Date().toISOString(),
          note: 'Centroid proximity from Census Bureau gazetteer data',
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
    logger.error('District neighbors API error', error as Error, {
      districtId: resolvedParams.districtId,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch district neighbors',
        message: error instanceof Error ? error.message : 'Unknown error',
        neighbors: [],
      },
      { status: 500 }
    );
  }
}

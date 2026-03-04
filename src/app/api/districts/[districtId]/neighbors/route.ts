/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { DISTRICT_NEIGHBORS } from '@/data/district-neighbors';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  try {
    const { districtId } = await params;
    logger.info('District neighbors API request', { districtId });

    // Normalize district ID to state-number format
    const normalizedId = districtId.toUpperCase();

    const neighbors = DISTRICT_NEIGHBORS[normalizedId] || [];

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

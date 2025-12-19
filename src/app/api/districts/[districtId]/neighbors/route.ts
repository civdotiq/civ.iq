/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const runtime = 'edge';

// ISR: Revalidate every 1 day
export const revalidate = 86400;

// Simple neighbor mapping based on geographic adjacency
// This is a simplified version - in production you'd use actual boundary data
const DISTRICT_NEIGHBORS: Record<string, string[]> = {
  // Michigan districts (post-2023 redistricting)
  'MI-01': ['MI-02'],
  'MI-02': ['MI-01', 'MI-03'],
  'MI-03': ['MI-02', 'MI-04', 'MI-06'],
  'MI-04': ['MI-03', 'MI-05', 'MI-07', 'MI-08'],
  'MI-05': ['MI-04', 'MI-09'],
  'MI-06': ['MI-03', 'MI-07'],
  'MI-07': ['MI-04', 'MI-06', 'MI-08'],
  'MI-08': ['MI-04', 'MI-07', 'MI-09', 'MI-11'],
  'MI-09': ['MI-05', 'MI-08', 'MI-10'],
  'MI-10': ['MI-09', 'MI-11'],
  'MI-11': ['MI-08', 'MI-10', 'MI-12'],
  'MI-12': ['MI-11', 'MI-13'],
  'MI-13': ['MI-12'],

  // California districts (sample)
  'CA-01': ['CA-02', 'CA-03'],
  'CA-02': ['CA-01', 'CA-03', 'CA-04'],
  'CA-03': ['CA-01', 'CA-02', 'CA-04', 'CA-05'],
  'CA-04': ['CA-02', 'CA-03', 'CA-05'],
  'CA-05': ['CA-03', 'CA-04', 'CA-06'],

  // Texas districts (sample)
  'TX-01': ['TX-02', 'TX-04'],
  'TX-02': ['TX-01', 'TX-03', 'TX-04'],
  'TX-03': ['TX-02', 'TX-04', 'TX-05'],
  'TX-04': ['TX-01', 'TX-02', 'TX-03'],
  'TX-05': ['TX-03', 'TX-06'],

  // Add more as needed...
};

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

    return NextResponse.json({
      district: normalizedId,
      neighbors: neighbors.map(neighborId => ({
        id: neighborId,
        name: `${neighborId} Congressional District`,
        // Could add more details here like representative name
      })),
      metadata: {
        timestamp: new Date().toISOString(),
        note: 'Simplified geographic adjacency mapping',
      },
    });
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

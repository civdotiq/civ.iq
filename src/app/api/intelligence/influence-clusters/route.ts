/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Influence Clusters
 *
 * Serves precomputed influence cluster data. Two modes:
 * - Full data (for scatter plot visualization)
 * - Single legislator lookup (for representative profiles)
 *
 * Endpoint: GET /api/intelligence/influence-clusters
 *           GET /api/intelligence/influence-clusters?bioguideId=X
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  getInfluenceClusters,
  getLegislatorCluster,
  getCrossPartyClusters,
} from '@/lib/intelligence/clusters';

export const dynamic = 'force-dynamic'; // 24 hours — data changes weekly at most

export async function GET(request: NextRequest) {
  const bioguideId = request.nextUrl.searchParams.get('bioguideId');

  try {
    if (bioguideId) {
      // Single legislator lookup
      const result = getLegislatorCluster(bioguideId.toUpperCase());
      if (!result) {
        return NextResponse.json(
          { error: 'Legislator not found in cluster data' },
          { status: 404 }
        );
      }

      return NextResponse.json(result, {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      });
    }

    // Full cluster data
    const data = getInfluenceClusters();
    if (!data) {
      return NextResponse.json(
        { error: 'Cluster data not available — run compute-influence-clusters.py first' },
        { status: 404 }
      );
    }

    // Include cross-party cluster highlights
    const crossPartyClusters = getCrossPartyClusters();

    return NextResponse.json(
      {
        ...data,
        crossPartyHighlights: crossPartyClusters.map(c => ({
          clusterId: c.clusterId,
          memberCount: c.metadata.memberCount,
          topSectors: c.metadata.topSectors,
          partyComposition: c.metadata.partyComposition,
        })),
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Influence clusters error', error as Error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

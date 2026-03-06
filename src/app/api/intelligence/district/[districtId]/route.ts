/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — District Summary
 *
 * Returns a lightweight summary of intelligence availability for the
 * district's representative(s). Resolves districtId to bioguideId(s)
 * and runs the finance-jurisdiction analyzer to get overlap scores.
 *
 * Endpoint: GET /api/intelligence/district/[districtId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';
import type { DistrictIntelligenceSummary } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse<DistrictIntelligenceSummary | { error: string }>> {
  const { districtId } = await params;

  if (!districtId || typeof districtId !== 'string') {
    return NextResponse.json({ error: 'District ID is required' }, { status: 400 });
  }

  // Parse districtId: "CA-13" or "TX-Senate"
  const parts = districtId.split('-');
  if (parts.length < 2) {
    return NextResponse.json(
      { error: `Invalid district ID format: ${districtId}` },
      { status: 400 }
    );
  }

  const state = (parts[0] ?? '').toUpperCase();
  const districtPart = parts.slice(1).join('-');
  const isSenate = districtPart.toLowerCase() === 'senate';

  try {
    logger.info('[Intelligence] District intelligence request', { districtId });

    const allReps = await getAllEnhancedRepresentatives();

    // Find representatives for this district
    const matchedReps = allReps.filter(rep => {
      if (rep.state !== state) return false;
      if (isSenate) return rep.chamber === 'Senate';
      return rep.chamber === 'House' && rep.district === districtPart;
    });

    if (matchedReps.length === 0) {
      return NextResponse.json(
        { error: `No representatives found for district ${districtId}` },
        { status: 404 }
      );
    }

    // For each representative, get finance-jurisdiction overlap (cached)
    const representatives = await Promise.all(
      matchedReps.map(async rep => {
        const fjInsight = await analyzeFinanceJurisdiction(rep.bioguideId).catch(() => null);

        // Count available insights: fj counts as 1, stock trades as another
        let insightsAvailable = 0;
        if (fjInsight) insightsAvailable++;
        // Other insights are always potentially available
        insightsAvailable += 2; // vote-finance + temporal are always attempted

        return {
          bioguideId: rep.bioguideId,
          name: rep.name,
          party: rep.party,
          chamber: rep.chamber as 'House' | 'Senate',
          financeJurisdictionOverlap: fjInsight?.overlapScore ?? null,
          hasStockTrades: rep.chamber === 'House', // Only House members have STOCK Act data
          insightsAvailable,
        };
      })
    );

    const response: DistrictIntelligenceSummary = {
      districtId,
      representatives,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] District intelligence error', error as Error, { districtId });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

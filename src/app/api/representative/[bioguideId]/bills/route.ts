/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  getOptimizedBillsByMember,
  getBillsSummary,
} from '@/services/congress/optimized-congress.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  try {
    const { bioguideId } = await params;
    const { searchParams } = new URL(req.url);

    if (!bioguideId) {
      return NextResponse.json({ error: 'BioguideId required' }, { status: 400 });
    }

    // Extract query parameters for pagination and filtering
    const limit = parseInt(searchParams.get('limit') || '25');
    const page = parseInt(searchParams.get('page') || '1');
    const congress = parseInt(searchParams.get('congress') || '119');
    const summaryOnly = searchParams.get('summary') === 'true';
    const includeAmendments = searchParams.get('includeAmendments') === 'true';

    // Use summary endpoint for quick stats
    if (summaryOnly) {
      const summary = await getBillsSummary(bioguideId);
      return NextResponse.json(summary);
    }

    // Use optimized pagination for full bill data
    const result = await getOptimizedBillsByMember({
      bioguideId,
      limit,
      page,
      congress,
      includeAmendments,
    });

    logger.info('Optimized bills endpoint served', {
      bioguideId,
      congress,
      limit,
      page,
      billCount: result.bills.length,
      executionTime: result.metadata.executionTime,
      cached: result.metadata.cached,
    });

    // Transform to legacy format for backward compatibility
    const legacyResponse = {
      // Legacy format (keep for backward compatibility)
      sponsoredLegislation: result.bills,

      // Enhanced format with counts and structure
      sponsored: {
        count: result.bills.length,
        bills: result.bills,
      },
      cosponsored: {
        count: 0,
        bills: [],
      },

      // Summary
      totalSponsored: result.bills.length,
      totalCosponsored: 0,
      totalBills: result.bills.length,

      // Include pagination info
      pagination: result.pagination,

      metadata: {
        ...result.metadata,
        source: 'Congress.gov API (Optimized)',
        congressLabel: `${congress}th Congress`,
        dataStructure: 'enhanced',
        note: 'Cosponsored bills require separate API implementation',
      },
    };

    return NextResponse.json(legacyResponse);
  } catch (error) {
    logger.error('Optimized bills API error', error as Error, {
      bioguideId: 'unavailable',
      component: 'bills-api-route-optimized',
    });

    return NextResponse.json(
      { error: 'Internal server error while fetching bills' },
      { status: 500 }
    );
  }
}

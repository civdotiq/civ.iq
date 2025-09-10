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
import { cachedHeavyEndpoint } from '@/services/cache';

// Helper function to create legacy response format
function createLegacyResponse(result: any, congress: number) {
  return {
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
      source: 'Congress.gov API (Optimized & Cached)',
      congressLabel: `${congress}th Congress`,
      dataStructure: 'enhanced',
      note: 'Cosponsored bills require separate API implementation',
    },
  };
}

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
    const progressive = searchParams.get('progressive') === 'true'; // New progressive loading flag

    // Use summary endpoint for quick stats
    if (summaryOnly) {
      const cacheKey = `bills-summary:${bioguideId}:${congress}`;
      const summary = await cachedHeavyEndpoint(cacheKey, () => getBillsSummary(bioguideId), {
        source: 'bills-summary-cached',
      });
      return NextResponse.json(summary);
    }

    // Progressive loading: Return cached data immediately if available, then fetch fresh
    if (progressive) {
      const cacheKey = `bills-progressive:${bioguideId}:${congress}:${limit}:${page}`;

      try {
        // First, try to return cached data immediately
        const cachedResult = await cachedHeavyEndpoint(
          cacheKey,
          () => getOptimizedBillsByMember({ bioguideId, limit, page, congress, includeAmendments }),
          { source: 'bills-progressive-cached' }
        );

        // Return cached data with progressive flag
        const progressiveResponse = {
          ...createLegacyResponse(cachedResult, congress),
          metadata: {
            ...createLegacyResponse(cachedResult, congress).metadata,
            progressive: true,
            cached: true,
            loadingComplete: true, // Since we have cached data
          },
        };

        return NextResponse.json(progressiveResponse);
      } catch (error) {
        logger.warn('Progressive bills loading cache miss, falling back to direct fetch', {
          bioguideId,
          error: error instanceof Error ? error.message : 'Unknown',
        });

        // Cache miss, fetch fresh data
        const result = await getOptimizedBillsByMember({
          bioguideId,
          limit,
          page,
          congress,
          includeAmendments,
        });

        const response = createLegacyResponse(result, congress);
        response.metadata.progressive = true;
        response.metadata.cached = false;
        response.metadata.loadingComplete = true;

        return NextResponse.json(response);
      }
    }

    // Standard non-progressive loading with caching
    const cacheKey = `bills:${bioguideId}:${congress}:${limit}:${page}:${includeAmendments}`;
    const result = await cachedHeavyEndpoint(
      cacheKey,
      () => getOptimizedBillsByMember({ bioguideId, limit, page, congress, includeAmendments }),
      { source: 'bills-standard-cached' }
    );

    logger.info('Optimized bills endpoint served', {
      bioguideId,
      congress,
      limit,
      page,
      billCount: result.bills.length,
      executionTime: result.metadata.executionTime,
      cached: result.metadata.cached,
    });

    // Transform to legacy format for backward compatibility using cached data
    const legacyResponse = createLegacyResponse(result, congress);

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

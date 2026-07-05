/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getCurrentCongressNumber } from '@/lib/data/congressional-constants';
import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  getComprehensiveBillsByMember,
  getBillsSummary,
} from '@/services/congress/optimized-congress.service';
import { createLegacyResponse } from '@/services/congress/bill-response-utils';
import { cachedHeavyEndpoint } from '@/services/cache';

export const dynamic = 'force-dynamic';

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

    // Extract query parameters for pagination and filtering.
    // NaN would poison the bills cache keys and reach Congress.gov — clamp/validate.
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '25', 10) || 25, 1), 250);
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10) || 1, 1);
    const congress = parseInt(searchParams.get('congress') || '', 10) || getCurrentCongressNumber();
    if (congress < 93 || congress > 150) {
      return NextResponse.json({ error: 'congress must be between 93 and 150' }, { status: 400 });
    }
    const summaryOnly = searchParams.get('summary') === 'true';
    const includeAmendments = searchParams.get('includeAmendments') === 'true';
    const progressive = searchParams.get('progressive') === 'true'; // New progressive loading flag

    // Use summary endpoint for quick stats
    if (summaryOnly) {
      const cacheKey = `bills-summary:${bioguideId}:${congress}`;
      const summary = await cachedHeavyEndpoint(cacheKey, () => getBillsSummary(bioguideId), {
        source: 'bills-summary-cached',
      });
      return NextResponse.json(summary, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    // Progressive loading: Return cached data immediately if available, then fetch fresh
    if (progressive) {
      const cacheKey = `bills-progressive:${bioguideId}:${congress}:${limit}:${page}`;

      try {
        // First, try to return cached data immediately
        const cachedResult = await cachedHeavyEndpoint(
          cacheKey,
          () =>
            getComprehensiveBillsByMember({ bioguideId, limit, page, congress, includeAmendments }),
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

        return NextResponse.json(progressiveResponse, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        });
      } catch (error) {
        logger.warn('Progressive bills loading cache miss, falling back to direct fetch', {
          bioguideId,
          error: error instanceof Error ? error.message : 'Unknown',
        });

        // Cache miss, fetch fresh data
        const result = await getComprehensiveBillsByMember({
          bioguideId,
          limit,
          page,
          congress,
          includeAmendments,
        });

        const response = createLegacyResponse(result, congress);
        response.progressive = true;
        response.cached = false;
        response.loadingComplete = true;

        return NextResponse.json(response, {
          headers: {
            'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
          },
        });
      }
    }

    // Standard non-progressive loading with caching
    const cacheKey = `bills:${bioguideId}:${congress}:${limit}:${page}:${includeAmendments}`;
    const result = await cachedHeavyEndpoint(
      cacheKey,
      () => getComprehensiveBillsByMember({ bioguideId, limit, page, congress, includeAmendments }),
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

    return NextResponse.json(legacyResponse, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
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

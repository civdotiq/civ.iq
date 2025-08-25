/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';

// Performance-optimized batch endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();
  const { searchParams } = new URL(request.url);

  // Query parameters for selective loading
  const include = searchParams.get('include')?.split(',') || ['all'];
  const limit = parseInt(searchParams.get('limit') || '20');
  const lightweight = searchParams.get('lightweight') === 'true';

  logger.info('Batch API request', {
    bioguideId: upperBioguideId,
    include,
    limit,
    lightweight,
  });

  // Optimized response structure with performance metadata
  const createResponse = (data: Record<string, unknown>, errors: Record<string, string> = {}) => ({
    ...data,
    metadata: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      dataSources: Object.keys(data).filter(key => data[key] && key !== 'metadata'),
      errors,
      cacheStatus: 'miss' as const,
      apiVersion: '2.0',
      optimized: true,
    },
  });

  try {
    // Start with enhanced representative data (fastest, local data)
    const enhancedData = await getEnhancedRepresentative(upperBioguideId);

    if (!enhancedData) {
      return NextResponse.json(
        createResponse({
          profile: null,
          bills: [],
          votes: [],
          finance: null,
          success: false,
          error: 'Representative not found',
        })
      );
    }

    // Initialize response with profile data
    const response: Record<string, unknown> = {
      profile: enhancedData,
      bills: [],
      votes: [],
      finance: null,
      success: true,
    };

    const errors: Record<string, string> = {};
    const API_KEY = process.env.CONGRESS_API_KEY;

    // Concurrent API calls based on requested data
    const apiCalls: Promise<unknown>[] = [];
    const callMap: string[] = [];

    if (API_KEY && (include.includes('all') || include.includes('bills'))) {
      const billsPromise = fetch(
        `https://api.congress.gov/v3/member/${upperBioguideId}/sponsored-legislation?api_key=${API_KEY}&limit=${limit}`,
        {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
        }
      )
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          return lightweight
            ? data.sponsoredLegislation?.slice(0, 5).map((bill: Record<string, unknown>) => ({
                id: bill.number,
                title: bill.title,
                introducedDate: bill.introducedDate,
                status: (bill.latestAction as Record<string, unknown>)?.text || 'Unknown',
              }))
            : data.sponsoredLegislation || [];
        })
        .catch(error => {
          errors.bills = error.message;
          return [];
        });

      apiCalls.push(billsPromise);
      callMap.push('bills');
    }

    if (include.includes('all') || include.includes('votes')) {
      // Use our custom votes endpoint that fetches from correct sources (House/Senate XML)
      const votesPromise = fetch(
        `${request.nextUrl.origin}/api/representative/${upperBioguideId}/votes?limit=${Math.min(limit, 50)}`,
        {
          signal: AbortSignal.timeout(8000), // Increased timeout for XML parsing
          headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
        }
      )
        .then(async res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = await res.json();
          // Handle different response formats from votes endpoint
          let votes = [];
          if (Array.isArray(data)) {
            votes = data;
          } else if (data && typeof data === 'object' && 'votes' in data) {
            votes = data.votes || [];
          }
          return lightweight
            ? votes.slice(0, 10).map((vote: Record<string, unknown>) => ({
                voteId: vote.voteId,
                date: vote.date,
                billNumber: (vote.bill as Record<string, unknown>)?.number,
                billTitle: (vote.bill as Record<string, unknown>)?.title,
                position: vote.position,
                result: vote.result,
                chamber: vote.chamber,
              }))
            : votes;
        })
        .catch(error => {
          errors.votes = error.message;
          logger.warn('Votes endpoint failed in batch API', {
            bioguideId: upperBioguideId,
            error: error.message,
          });
          return [];
        });

      apiCalls.push(votesPromise);
      callMap.push('votes');
    }

    // Execute all API calls concurrently
    if (apiCalls.length > 0) {
      const results = await Promise.allSettled(apiCalls);

      results.forEach((result, index) => {
        const field = callMap[index];
        if (field) {
          if (result.status === 'fulfilled') {
            response[field] = result.value;
          } else {
            errors[field] = result.reason?.message || 'Failed to fetch';
            response[field] = [];
          }
        }
      });
    }

    // Add finance data by calling the finance endpoint
    if (include.includes('all') || include.includes('finance')) {
      try {
        const financeResponse = await fetch(
          `${request.nextUrl.origin}/api/representative/${upperBioguideId}/finance`,
          {
            signal: AbortSignal.timeout(8000),
            headers: { 'User-Agent': 'CivIQ-Hub/2.0' },
          }
        );

        if (financeResponse.ok) {
          const financeData = await financeResponse.json();
          response.finance = financeData;
        } else {
          logger.warn('Finance endpoint returned non-OK status', {
            bioguideId: upperBioguideId,
            status: financeResponse.status,
          });
          response.finance = {
            available: false,
            reason: `Finance API returned ${financeResponse.status}`,
            fecId: enhancedData.ids?.fec?.[0] || null,
          };
        }
      } catch (financeError) {
        logger.warn('Finance endpoint failed', {
          bioguideId: upperBioguideId,
          error: (financeError as Error).message,
        });
        response.finance = {
          available: false,
          reason: 'Finance API unavailable',
          fecId: enhancedData.ids?.fec?.[0] || null,
        };
      }
    }

    logger.info('Batch API success', {
      bioguideId: upperBioguideId,
      responseTime: Date.now() - startTime,
      billsCount: Array.isArray(response.bills) ? response.bills.length : 0,
      votesCount: Array.isArray(response.votes) ? response.votes.length : 0,
      hasErrors: Object.keys(errors).length > 0,
    });

    return NextResponse.json(createResponse(response, errors));
  } catch (error) {
    logger.error('Batch API error', error as Error, { bioguideId: upperBioguideId });

    return NextResponse.json(
      createResponse(
        {
          profile: null,
          bills: [],
          votes: [],
          finance: null,
          success: false,
          error: 'Internal server error',
        },
        { general: (error as Error).message }
      ),
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import {
  executeBatchRequest,
  getRepresentativeSummary,
} from '@/services/batch/representative-batch.service';
import { container, initializeServices } from '@/core/services/container';

// POST handler for optimized batch requests
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse> {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();

  try {
    // Ensure services are initialized
    if (!container.isRegistered('batchService')) {
      initializeServices();
    }

    const body = await request.json();
    const { endpoints, options } = body;

    if (!endpoints || !Array.isArray(endpoints)) {
      return NextResponse.json(
        { success: false, error: 'endpoints array required' },
        { status: 400 }
      );
    }

    // Try to use containerized batch service, fall back to direct service
    let result;
    try {
      // Force use of legacy service for votes and bills endpoints - legacy service has optimized implementation
      if (endpoints.includes('votes') || endpoints.includes('bills')) {
        throw new Error('Using legacy service for votes/bills - has optimized service integration');
      }

      const batchService = await container.resolve<{
        processBatch: (request: {
          bioguideId: string;
          endpoints: string[];
          options?: unknown;
        }) => Promise<Record<string, unknown>>;
      }>('batchService');

      const batchResult = await batchService.processBatch({
        bioguideId: upperBioguideId,
        endpoints,
        options,
      });

      result = {
        success: true,
        data: batchResult,
        metadata: {
          bioguideId: upperBioguideId,
          requestedEndpoints: endpoints,
          successfulEndpoints: endpoints,
          failedEndpoints: [],
          executionTime: 0,
          cached: false,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (containerError) {
      logger.warn('Container batch service not available, using legacy service', {
        bioguideId: upperBioguideId,
        error: containerError instanceof Error ? containerError.message : 'Unknown error',
      });

      // Fallback to existing batch service
      result = await executeBatchRequest({
        bioguideId: upperBioguideId,
        endpoints,
        options,
      });
    }

    logger.info('Optimized batch API success', {
      bioguideId: upperBioguideId,
      endpoints,
      responseTime: result.metadata.executionTime,
      successfulEndpoints: result.metadata.successfulEndpoints,
      failedEndpoints: result.metadata.failedEndpoints,
      cached: result.metadata.cached,
    });

    // Add proper caching headers
    const headers = new Headers({
      'Cache-Control': 'public, max-age=300, s-maxage=300', // 5 minutes cache
      'CDN-Cache-Control': 'public, max-age=300',
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(result, { headers });
  } catch (error) {
    logger.error('Optimized batch API error', error as Error, {
      bioguideId: upperBioguideId,
      component: 'batch-api-route-optimized',
    });
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// GET handler for summary data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const upperBioguideId = bioguideId?.toUpperCase();
  const { searchParams } = request.nextUrl;
  const summaryOnly = searchParams.get('summary') === 'true';

  logger.info('Batch API GET request - WITH VOTES', {
    bioguideId: upperBioguideId,
    summaryOnly,
  });

  try {
    if (summaryOnly) {
      // Use optimized summary service for quick stats
      const summary = await getRepresentativeSummary(upperBioguideId);

      return NextResponse.json({
        success: true,
        data: summary,
        metadata: {
          bioguideId: upperBioguideId,
          type: 'summary',
          timestamp: new Date().toISOString(),
          cached: true,
        },
      });
    }

    // Default batch request with core endpoints including votes
    const result = await executeBatchRequest({
      bioguideId: upperBioguideId,
      endpoints: ['bills', 'votes', 'finance'],
      options: {
        bills: { summaryOnly: true },
        votes: { limit: 5 },
        finance: { summaryOnly: true },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    logger.error('Batch GET API error', error as Error, {
      bioguideId: upperBioguideId,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        data: {},
        metadata: {
          bioguideId: upperBioguideId,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

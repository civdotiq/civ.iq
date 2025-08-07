/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { apiConfig } from '@/config';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  // Using simple logger}`);

  logger.info('Search API v1 request started');

  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q');
    const state = url.searchParams.get('state');
    const party = url.searchParams.get('party');
    const chamber = url.searchParams.get('chamber');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    logger.info('Request parameters received', {
      query,
      state,
      party,
      chamber,
      limit,
      apiVersion: apiConfig.version,
    });

    // Input validation
    if (!query) {
      logger.warn('Missing query parameter');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'q (query) parameter is required',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            apiVersion: apiConfig.version,
          },
        },
        { status: 400 }
      );
    }

    // For now, return a placeholder response
    const processingTime = Date.now() - startTime;
    logger.info('Search API v1 request completed', {
      query,
      processingTime,
      apiVersion: apiConfig.version,
    });

    return NextResponse.json(
      {
        success: true,
        representatives: [],
        metadata: {
          timestamp: new Date().toISOString(),
          query,
          filters: { state, party, chamber },
          limit,
          totalResults: 0,
          apiVersion: apiConfig.version,
          processingTime,
        },
      },
      {
        headers: {
          'API-Version': apiConfig.version,
          'Cache-Control': 'public, max-age=300',
        },
      }
    );
  } catch (error) {
    // Using simple logger}`);
    logger.error('Unexpected error in Search API v1', error as Error, {
      apiVersion: apiConfig.version,
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        metadata: {
          timestamp: new Date().toISOString(),
          apiVersion: apiConfig.version,
        },
      },
      {
        status: 500,
        headers: {
          'API-Version': apiConfig.version,
        },
      }
    );
  }
}

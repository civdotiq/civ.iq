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

  logger.info('Bills API v1 request started');

  try {
    const url = new URL(request.url);
    const bioguideId = url.searchParams.get('bioguideId');
    const congress = parseInt(url.searchParams.get('congress') || '119', 10);
    const limit = parseInt(url.searchParams.get('limit') || '20', 10);

    logger.info('Request parameters received', {
      bioguideId,
      congress,
      limit,
      apiVersion: apiConfig.version,
    });

    // For now, return a placeholder response
    const processingTime = Date.now() - startTime;
    logger.info('Bills API v1 request completed', {
      bioguideId,
      processingTime,
      apiVersion: apiConfig.version,
    });

    return NextResponse.json(
      {
        success: true,
        bills: [],
        metadata: {
          timestamp: new Date().toISOString(),
          bioguideId: bioguideId || null,
          congress,
          limit,
          totalResults: 0,
          apiVersion: apiConfig.version,
          processingTime,
        },
      },
      {
        headers: {
          'API-Version': apiConfig.version,
          'Cache-Control': 'public, max-age=600',
        },
      }
    );
  } catch (error) {
    // Using simple logger}`);
    logger.error('Unexpected error in Bills API v1', error as Error, {
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

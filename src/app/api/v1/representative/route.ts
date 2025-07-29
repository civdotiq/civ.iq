/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createRequestLogger } from '@/lib/logging/logger';
import { apiConfig } from '@/config';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const logger = createRequestLogger(request, `representative-v1-${Date.now()}`);

  logger.info('Representative API v1 request started');

  try {
    const url = new URL(request.url);
    const bioguideId = url.searchParams.get('bioguideId');

    logger.info('Request parameters received', {
      bioguideId,
      apiVersion: apiConfig.version,
    });

    // Input validation
    if (!bioguideId) {
      logger.warn('Missing bioguideId parameter');
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_PARAMETERS',
            message: 'bioguideId parameter is required',
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
    logger.info('Representative API v1 request completed', {
      bioguideId,
      processingTime,
      apiVersion: apiConfig.version,
    });

    return NextResponse.json(
      {
        success: true,
        representative: null,
        metadata: {
          timestamp: new Date().toISOString(),
          bioguideId,
          apiVersion: apiConfig.version,
          processingTime,
        },
      },
      {
        headers: {
          'API-Version': apiConfig.version,
          'Cache-Control': 'public, max-age=1800',
        },
      }
    );
  } catch (error) {
    const logger = createRequestLogger(request, `representative-v1-error-${Date.now()}`);
    logger.error('Unexpected error in Representative API v1', error as Error, {
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

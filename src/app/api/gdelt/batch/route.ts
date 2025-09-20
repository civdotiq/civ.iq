/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Batch Processing API Route
 *
 * Handles bulk processing of GDELT news data for multiple Congress members.
 * Supports efficient batch operations with proper error handling and partial failures.
 *
 * POST /api/gdelt/batch
 * Body: { bioguideIds: string[], options?: BatchProcessingOptions }
 * Returns: Map<bioguideId, articles[]> with error handling
 */

import { NextRequest, NextResponse } from 'next/server';
import { GDELTCongressQueue, BatchProcessingOptions } from '@/lib/gdelt/GDELTCongressQueue';
import { BaseRepresentative } from '@/types/representative';
import { GDELTArticle } from '@/types/gdelt';

interface BatchRequest {
  bioguideIds: string[];
  options?: BatchProcessingOptions;
}

interface BatchResponseSuccess {
  success: true;
  data: Record<string, GDELTArticle[]>;
  errors: Record<string, string>;
  metadata: {
    totalRequested: number;
    successful: number;
    failed: number;
    processingTimeMs: number;
  };
}

interface BatchResponseError {
  success: false;
  error: string;
  details?: string;
}

type BatchResponse = BatchResponseSuccess | BatchResponseError;

/**
 * POST handler for batch GDELT processing
 */
export async function POST(request: NextRequest): Promise<NextResponse<BatchResponse>> {
  try {
    const body = (await request.json()) as BatchRequest;

    // Validate request body
    if (!body.bioguideIds || !Array.isArray(body.bioguideIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: bioguideIds array is required',
        },
        { status: 400 }
      );
    }

    if (body.bioguideIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request: bioguideIds array cannot be empty',
        },
        { status: 400 }
      );
    }

    // Limit batch size for performance and rate limiting
    const maxBatchSize = 100;
    if (body.bioguideIds.length > maxBatchSize) {
      return NextResponse.json(
        {
          success: false,
          error: `Batch size too large: maximum ${maxBatchSize} members allowed`,
        },
        { status: 400 }
      );
    }

    // Get representative data for the bioguide IDs
    const representatives = await fetchRepresentatives(body.bioguideIds);

    if (representatives.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No valid representatives found for provided bioguide IDs',
        },
        { status: 404 }
      );
    }

    // Initialize GDELT queue with custom options
    const queue = new GDELTCongressQueue(body.options);

    // Process all members
    const result = await queue.processAllMembers(representatives);

    // Convert Maps to Records for JSON serialization
    const data: Record<string, GDELTArticle[]> = {};
    result.successful.forEach((articles, bioguideId) => {
      data[bioguideId] = articles;
    });

    const errors: Record<string, string> = {};
    result.failed.forEach((error, bioguideId) => {
      errors[bioguideId] = error.message;
    });

    const response: BatchResponseSuccess = {
      success: true,
      data,
      errors,
      metadata: {
        totalRequested: body.bioguideIds.length,
        successful: result.successful.size,
        failed: result.failed.size,
        processingTimeMs: result.processingTimeMs,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600', // 30 minute cache
      },
    });
  } catch (error) {
    const errorResponse: BatchResponseError = {
      success: false,
      error: 'Internal server error during batch processing',
      details: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * GET handler for batch processing status and capabilities
 */
export async function GET(): Promise<NextResponse> {
  const info = {
    endpoint: '/api/gdelt/batch',
    method: 'POST',
    description: 'Batch process GDELT news data for multiple Congress members',
    maxBatchSize: 100,
    defaultOptions: {
      batchSize: 50,
      batchInterval: 2000,
      maxConcurrent: 5,
      retryAttempts: 3,
      exponentialBackoffBase: 2,
    },
    requestFormat: {
      bioguideIds: ['P000197', 'O000172', 'M000355'],
      options: {
        batchSize: 'number (optional)',
        batchInterval: 'number (optional, ms)',
        retryAttempts: 'number (optional)',
      },
    },
    responseFormat: {
      success: 'boolean',
      data: 'Record<bioguideId, GDELTArticle[]>',
      errors: 'Record<bioguideId, errorMessage>',
      metadata: {
        totalRequested: 'number',
        successful: 'number',
        failed: 'number',
        processingTimeMs: 'number',
      },
    },
  };

  return NextResponse.json(info);
}

/**
 * Fetch representative data from the internal API
 * This simulates fetching from our representatives API
 */
async function fetchRepresentatives(bioguideIds: string[]): Promise<BaseRepresentative[]> {
  const representatives: BaseRepresentative[] = [];

  // For now, create mock representatives based on bioguide IDs
  // In production, this would fetch from the representatives API
  const mockRepresentatives: Record<string, BaseRepresentative> = {
    P000197: {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      firstName: 'Nancy',
      lastName: 'Pelosi',
      party: 'D',
      state: 'CA',
      district: '12',
      chamber: 'House',
      title: 'Representative',
      terms: [],
    },
    O000172: {
      bioguideId: 'O000172',
      name: 'Alexandria Ocasio-Cortez',
      firstName: 'Alexandria',
      lastName: 'Ocasio-Cortez',
      party: 'D',
      state: 'NY',
      district: '14',
      chamber: 'House',
      title: 'Representative',
      terms: [],
    },
    M000355: {
      bioguideId: 'M000355',
      name: 'Mitch McConnell',
      firstName: 'Mitch',
      lastName: 'McConnell',
      party: 'R',
      state: 'KY',
      chamber: 'Senate',
      title: 'Senator',
      terms: [],
    },
    K000367: {
      bioguideId: 'K000367',
      name: 'Amy Klobuchar',
      firstName: 'Amy',
      lastName: 'Klobuchar',
      party: 'D',
      state: 'MN',
      chamber: 'Senate',
      title: 'Senator',
      terms: [],
    },
  };

  for (const bioguideId of bioguideIds) {
    const representative = mockRepresentatives[bioguideId];
    if (representative) {
      representatives.push(representative);
    }
  }

  return representatives;
}

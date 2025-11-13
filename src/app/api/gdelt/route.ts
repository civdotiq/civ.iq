/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT DOC 2.0 API Route Handler
 *
 * Provides a proxy to the GDELT Project DOC 2.0 API with caching,
 * error handling, and response optimization for civic-intel-hub.
 */

import { NextRequest, NextResponse } from 'next/server';
import { GDELTResponse, GDELTErrorType } from '@/types/gdelt';
import { GDELTService } from '@/lib/services/gdelt';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

/**
 * GET handler for GDELT API proxy
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json({ error: 'Missing required parameter: query' }, { status: 400 });
  }

  try {
    // Initialize GDELT service
    const gdeltService = new GDELTService();

    // Prepare fetch options from request parameters
    const options = {
      timespan: searchParams.get('timespan') || '7days',
      maxrecords: parseInt(searchParams.get('maxrecords') || '50', 10),
      theme: searchParams.get('theme') || 'GENERAL_GOVERNMENT',
      mode: (searchParams.get('mode') as 'artlist' | 'timelinevol' | 'timelinevolraw') || 'artlist',
    };

    // Fetch articles using the service
    const result = await gdeltService.fetchArticles(query, options);

    // Handle errors
    if (result.error) {
      const error = result.error;

      if (error.type === GDELTErrorType.RATE_LIMIT) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      if (error.type === GDELTErrorType.TIMEOUT) {
        return NextResponse.json(
          { error: 'Request timeout. GDELT API took too long to respond.' },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          error: 'Failed to fetch GDELT data',
          details: error.message,
        },
        { status: 500 }
      );
    }

    // Create formatted response
    const gdeltResponse: GDELTResponse = gdeltService.createGDELTResponse(result.data, {
      timespan: options.timespan,
      theme: options.theme,
    });

    return NextResponse.json(gdeltResponse, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600', // 30 minute cache
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch GDELT data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * OPTIONS handler for CORS
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

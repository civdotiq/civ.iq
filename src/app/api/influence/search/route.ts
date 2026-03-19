/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Influence Search API - Search FEC committees/PACs by name
 *
 * @example GET /api/influence/search?q=AIPAC&page=1&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { ApiErrors } from '@/lib/api/error-responses';
import logger from '@/lib/logging/simple-logger';
import type { CommitteeSearchResponse } from '@/types/influence';

export const dynamic = 'force-dynamic'; // 5-minute ISR

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)));

  if (!query || query.length < 2) {
    return ApiErrors.validation('Search query must be at least 2 characters');
  }

  try {
    logger.info(`[Influence Search] Searching committees for "${query}" page=${page}`);

    const fecResponse = await fecApiService.searchCommittees(query, page, limit);

    const response: CommitteeSearchResponse = {
      results: fecResponse.results,
      query,
      pagination: {
        page: fecResponse.pagination.page,
        perPage: fecResponse.pagination.per_page,
        totalPages: fecResponse.pagination.pages,
        totalResults: fecResponse.pagination.count,
      },
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    logger.error('[Influence Search] Failed:', error);
    return ApiErrors.serverError(error instanceof Error ? error : undefined);
  }
}

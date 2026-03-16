/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph Natural Language Query API
 *
 * POST /api/graph/query
 * Body: { query: "Which senators received defense money?" }
 *
 * Compiles NL → structured query → executes against graph.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { compileQuery } from '@/lib/graph/query-compiler';
import { executeQuery, type QueryResult } from '@/lib/graph/query-executor';
import { ApiErrors } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface QueryRequest {
  query: string;
}

interface QueryResponse {
  result: QueryResult;
  compiledQuery: unknown;
}

interface QueryErrorResponse {
  error: string;
  suggestions: string[];
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: QueryRequest;
  try {
    body = (await request.json()) as QueryRequest;
  } catch {
    return ApiErrors.validation('Request body must be valid JSON with a "query" field');
  }

  if (!body.query || typeof body.query !== 'string' || body.query.trim().length === 0) {
    return ApiErrors.validation('Query string is required');
  }

  if (body.query.length > 500) {
    return ApiErrors.validation('Query must be under 500 characters');
  }

  try {
    logger.info('[Graph API] Query request', { query: body.query });

    // Step 1: Compile NL → structured query
    const compiled = await compileQuery(body.query);
    if (!compiled.success) {
      const errorResponse: QueryErrorResponse = {
        error: compiled.error,
        suggestions: compiled.suggestions,
      };
      return NextResponse.json(errorResponse, { status: 422 });
    }

    // Step 2: Execute structured query
    const result = await executeQuery(compiled.query);

    const response: QueryResponse = {
      result,
      compiledQuery: compiled.query,
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900',
      },
    });
  } catch (error) {
    logger.error('[Graph API] Query error', error as Error, { query: body.query });
    return ApiErrors.serverError(error as Error);
  }
}

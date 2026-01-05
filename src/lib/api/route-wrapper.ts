/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Route Wrapper Utility for Next.js API Routes
 *
 * This utility provides a higher-order function pattern to reduce boilerplate
 * in API route handlers. It handles common concerns like:
 * - Caching with configurable TTL
 * - Standardized error handling
 * - Request logging
 * - Response metadata
 *
 * NOTE: This is an ADDITIVE utility. Existing routes are NOT modified.
 * New routes can optionally adopt this pattern for cleaner code.
 *
 * @example
 * // Before (300+ lines with boilerplate):
 * export async function GET(request: NextRequest) {
 *   try {
 *     const { param } = await params;
 *     const cacheKey = `entity:${param}`;
 *     const cached = await cache.get(cacheKey);
 *     if (cached) return NextResponse.json(cached);
 *     // ... fetch logic ...
 *     await cache.set(cacheKey, data);
 *     return NextResponse.json(data);
 *   } catch (error) {
 *     return NextResponse.json({ error: '...' }, { status: 500 });
 *   }
 * }
 *
 * // After (~50 lines):
 * export const GET = createApiHandler({
 *   cacheKey: (params) => `entity:${params.id}`,
 *   ttl: ONE_HOUR,
 *   handler: async (params) => fetchEntityData(params.id),
 * });
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

/**
 * Standard API response metadata
 */
export interface ApiResponseMetadata {
  timestamp: string;
  dataSource: string;
  cacheHit?: boolean;
  processingTime?: number;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: string;
  };
  metadata: ApiResponseMetadata;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  metadata: ApiResponseMetadata;
}

/**
 * Configuration for createApiHandler
 */
export interface ApiHandlerConfig<TParams, TResult> {
  /**
   * Function to generate cache key from request parameters
   * Return null to skip caching
   */
  cacheKey: (params: TParams, request: NextRequest) => string | null;

  /**
   * Cache TTL in milliseconds
   * Common values: ONE_HOUR (3600000), ONE_DAY (86400000), ONE_WEEK (604800000)
   */
  ttl: number;

  /**
   * Data source identifier for metadata
   */
  dataSource: string;

  /**
   * The actual handler function that fetches/processes data
   */
  handler: (params: TParams, request: NextRequest) => Promise<TResult>;

  /**
   * Optional parameter validation
   * Return error message string to reject, or null to accept
   */
  validate?: (params: TParams) => string | null;

  /**
   * Optional transform for the final response
   */
  transform?: (result: TResult) => unknown;
}

/**
 * Common cache TTL values in milliseconds
 */
export const CACHE_TTL = {
  /** 5 minutes - for rapidly changing data */
  FIVE_MINUTES: 5 * 60 * 1000,
  /** 1 hour - for moderately changing data */
  ONE_HOUR: 60 * 60 * 1000,
  /** 6 hours - for daily data */
  SIX_HOURS: 6 * 60 * 60 * 1000,
  /** 1 day - for stable data */
  ONE_DAY: 24 * 60 * 60 * 1000,
  /** 3 days - for election-aware caching */
  THREE_DAYS: 3 * 24 * 60 * 60 * 1000,
  /** 1 week - for static reference data */
  ONE_WEEK: 7 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Creates a standardized API route handler with built-in caching,
 * error handling, and logging.
 *
 * @param config - Handler configuration
 * @returns Next.js API route handler function
 *
 * @example
 * // Simple usage with params from URL
 * export const GET = createApiHandler({
 *   cacheKey: (params) => `representative:${params.bioguideId}`,
 *   ttl: CACHE_TTL.ONE_HOUR,
 *   dataSource: 'congress.gov',
 *   handler: async (params) => {
 *     return await fetchRepresentative(params.bioguideId);
 *   },
 * });
 *
 * @example
 * // With validation
 * export const GET = createApiHandler({
 *   cacheKey: (params) => `district:${params.districtId}`,
 *   ttl: CACHE_TTL.SIX_HOURS,
 *   dataSource: 'usaspending.gov',
 *   validate: (params) => {
 *     if (!/^[A-Z]{2}-\d{2}$/.test(params.districtId)) {
 *       return 'Invalid district ID format. Use format: ST-DD (e.g., MI-05)';
 *     }
 *     return null;
 *   },
 *   handler: async (params) => {
 *     return await fetchDistrictSpending(params.districtId);
 *   },
 * });
 */
export function createApiHandler<TParams extends Record<string, string>, TResult>(
  config: ApiHandlerConfig<TParams, TResult>
) {
  return async (
    request: NextRequest,
    context: { params: Promise<TParams> }
  ): Promise<NextResponse> => {
    const startTime = Date.now();

    try {
      const params = await context.params;

      // Validation
      if (config.validate) {
        const validationError = config.validate(params);
        if (validationError) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'VALIDATION_ERROR',
                message: validationError,
              },
              metadata: {
                timestamp: new Date().toISOString(),
                dataSource: config.dataSource,
              },
            } satisfies ApiErrorResponse,
            { status: 400 }
          );
        }
      }

      // Generate cache key
      const cacheKey = config.cacheKey(params, request);

      // Execute handler (with or without caching)
      let result: TResult;
      const cacheHit = false;

      if (cacheKey) {
        result = await cachedFetch(
          cacheKey,
          async () => {
            logger.info(`Fetching data for ${cacheKey}`, {
              params,
              dataSource: config.dataSource,
            });
            return config.handler(params, request);
          },
          config.ttl
        );
        // Note: cachedFetch doesn't tell us if it was a cache hit
        // For accurate cache hit tracking, we'd need to modify cachedFetch
      } else {
        result = await config.handler(params, request);
      }

      // Transform if needed
      const responseData = config.transform ? config.transform(result) : result;

      // Build response
      const processingTime = Date.now() - startTime;

      return NextResponse.json(
        {
          success: true,
          data: responseData,
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: config.dataSource,
            cacheHit,
            processingTime,
          },
        } satisfies ApiSuccessResponse<unknown>,
        {
          headers: {
            'Cache-Control': `public, s-maxage=${Math.floor(config.ttl / 1000)}, stale-while-revalidate=${Math.floor((config.ttl * 2) / 1000)}`,
          },
        }
      );
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error(`API error in ${config.dataSource}`, error as Error, {
        processingTime,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An error occurred while processing your request',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          },
          metadata: {
            timestamp: new Date().toISOString(),
            dataSource: config.dataSource,
            processingTime,
          },
        } satisfies ApiErrorResponse,
        { status: 500 }
      );
    }
  };
}

/**
 * Creates a handler for routes that don't need caching
 *
 * @example
 * export const GET = createUncachedApiHandler({
 *   dataSource: 'internal',
 *   handler: async (params) => {
 *     return { status: 'healthy', timestamp: Date.now() };
 *   },
 * });
 */
export function createUncachedApiHandler<TParams extends Record<string, string>, TResult>(
  config: Omit<ApiHandlerConfig<TParams, TResult>, 'cacheKey' | 'ttl'>
) {
  return createApiHandler({
    ...config,
    cacheKey: () => null,
    ttl: 0,
  });
}

/**
 * Helper to extract query parameters from NextRequest
 *
 * @example
 * const { page, limit, filter } = getQueryParams(request, {
 *   page: { type: 'number', default: 1 },
 *   limit: { type: 'number', default: 20 },
 *   filter: { type: 'string', default: 'all' },
 * });
 */
export function getQueryParams<
  T extends Record<string, { type: 'string' | 'number'; default: unknown }>,
>(
  request: NextRequest,
  schema: T
): { [K in keyof T]: T[K]['type'] extends 'number' ? number : string } {
  const searchParams = request.nextUrl.searchParams;
  const result: Record<string, unknown> = {};

  for (const [key, config] of Object.entries(schema)) {
    const value = searchParams.get(key);
    if (value === null) {
      result[key] = config.default;
    } else if (config.type === 'number') {
      const parsed = parseInt(value, 10);
      result[key] = isNaN(parsed) ? config.default : parsed;
    } else {
      result[key] = value;
    }
  }

  return result as { [K in keyof T]: T[K]['type'] extends 'number' ? number : string };
}

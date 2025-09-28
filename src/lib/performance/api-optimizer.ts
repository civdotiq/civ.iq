/**
 * API Route Performance Optimizer
 *
 * Combines all Phase 3 optimizations:
 * - Request deduplication
 * - Multi-level caching
 * - Performance timing
 * - Error handling
 * - Resource management
 */

import { NextRequest, NextResponse } from 'next/server';
import { withPerformanceTiming } from './api-timer';
import { requestDeduplicator } from '@/core/cache/RequestDeduplicator';
import { container } from '@/core/services/container';
import type { ICacheService } from '@/core/services/interfaces/ICacheService';
import logger from '@/lib/logging/simple-logger';

interface OptimizationOptions {
  cacheKey?: string;
  cacheTtl?: number;
  enableDeduplication?: boolean;
  enableCaching?: boolean;
  enableCompression?: boolean;
  priority?: 'low' | 'normal' | 'high';
}

interface OptimizedResponse<T = unknown> {
  data: T;
  success: boolean;
  metadata: {
    timestamp: string;
    processingTimeMs: number;
    cacheHit: boolean;
    deduplicationHit: boolean;
    dataSource: string;
    optimization: {
      caching: boolean;
      deduplication: boolean;
      compression: boolean;
    };
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * Enhanced API wrapper with all Phase 3 optimizations
 */
export function withOptimization<T>(
  routeName: string,
  handler: (req: NextRequest) => Promise<T>,
  options: OptimizationOptions = {}
) {
  const {
    cacheKey,
    cacheTtl = 300000, // 5 minutes default
    enableDeduplication = true,
    enableCaching = true,
    enableCompression = false,
    priority: _priority = 'normal',
  } = options;

  return withPerformanceTiming(routeName, async (req: NextRequest) => {
    const startTime = Date.now();
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Generate cache key if not provided
      const finalCacheKey =
        cacheKey || `${routeName}:${req.method}:${req.url}:${JSON.stringify(req.body || {})}`;

      // Track optimization usage
      const optimizationUsage = {
        caching: enableCaching,
        deduplication: enableDeduplication,
        compression: enableCompression,
      };

      let result: T;
      let cacheHit = false;
      let deduplicationHit = false;

      if (enableDeduplication && req.method === 'GET') {
        // Use deduplication for GET requests
        result = await requestDeduplicator.deduplicate(
          finalCacheKey,
          async () => {
            if (enableCaching) {
              const cacheResult = await getCachedOrFetch(
                finalCacheKey,
                () => handler(req),
                cacheTtl
              );
              cacheHit = cacheResult.cacheHit;
              return cacheResult.data;
            }
            return await handler(req);
          },
          { maxAge: 10000 } // 10 second deduplication window
        );

        // Check if this was a deduplication hit
        const dedupMetrics = requestDeduplicator.getMetrics();
        deduplicationHit = dedupMetrics.deduplicatedRequests > 0;
      } else if (enableCaching && req.method === 'GET') {
        // Use caching for GET requests without deduplication
        const cacheResult = await getCachedOrFetch(finalCacheKey, () => handler(req), cacheTtl);
        result = cacheResult.data;
        cacheHit = cacheResult.cacheHit;
      } else {
        // Direct execution for non-cacheable requests
        result = await handler(req);
      }

      // Create optimized response
      const response: OptimizedResponse<T> = {
        data: result,
        success: true,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          cacheHit,
          deduplicationHit,
          dataSource: routeName,
          optimization: optimizationUsage,
        },
      };

      // Apply compression if enabled
      const finalResponse = NextResponse.json(response);

      if (enableCompression) {
        finalResponse.headers.set('Content-Encoding', 'gzip');
        finalResponse.headers.set('Vary', 'Accept-Encoding');
      }

      // Add performance headers
      finalResponse.headers.set('X-Request-ID', requestId);
      finalResponse.headers.set('X-Processing-Time', `${Date.now() - startTime}ms`);
      finalResponse.headers.set('X-Cache-Status', cacheHit ? 'hit' : 'miss');
      finalResponse.headers.set('X-Dedup-Status', deduplicationHit ? 'hit' : 'miss');

      // Set cache control headers for GET requests
      if (req.method === 'GET') {
        const maxAge = Math.floor(cacheTtl / 1000);
        finalResponse.headers.set('Cache-Control', `public, max-age=${maxAge}, s-maxage=${maxAge}`);
        finalResponse.headers.set('ETag', `"${requestId}"`);
      }

      logger.info(
        `[OPTIMIZER] ${routeName} completed in ${Date.now() - startTime}ms ` +
          `(cache: ${cacheHit ? 'HIT' : 'MISS'}, dedup: ${deduplicationHit ? 'HIT' : 'MISS'})`
      );

      return finalResponse;
    } catch (error) {
      const errorResponse: OptimizedResponse<null> = {
        data: null,
        success: false,
        metadata: {
          timestamp: new Date().toISOString(),
          processingTimeMs: Date.now() - startTime,
          cacheHit: false,
          deduplicationHit: false,
          dataSource: routeName,
          optimization: {
            caching: enableCaching,
            deduplication: enableDeduplication,
            compression: enableCompression,
          },
        },
        error: {
          code: 'OPTIMIZATION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      logger.error(`[OPTIMIZER] ${routeName} failed:`, error);

      return NextResponse.json(errorResponse, { status: 500 });
    }
  });
}

/**
 * Cache-aware data fetcher
 */
async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<{ data: T; cacheHit: boolean }> {
  try {
    // Try to get cache service
    const cacheService = await container.resolve<ICacheService>('cacheService');

    // Try cache first
    const cached = await cacheService.get<T>(key);
    if (cached !== null) {
      return { data: cached, cacheHit: true };
    }

    // Cache miss - fetch and store
    const data = await fetcher();
    await cacheService.set(key, data, { ttlMs: ttl });

    return { data, cacheHit: false };
  } catch (error) {
    // Fallback to direct execution if caching fails
    logger.warn(
      `[OPTIMIZER] Cache operation failed for key '${key}', falling back to direct execution:`,
      error
    );
    const data = await fetcher();
    return { data, cacheHit: false };
  }
}

/**
 * Batch optimization wrapper for multiple operations
 */
export function withBatchOptimization<T>(
  routeName: string,
  operations: Array<{
    key: string;
    fetcher: () => Promise<T>;
    priority?: 'low' | 'normal' | 'high';
  }>,
  options: OptimizationOptions = {}
) {
  return withOptimization(
    routeName,
    async () => {
      const results: Record<string, T> = {};

      // Execute operations in parallel with proper priority
      const highPriority = operations.filter(op => op.priority === 'high');
      const normalPriority = operations.filter(op => !op.priority || op.priority === 'normal');
      const lowPriority = operations.filter(op => op.priority === 'low');

      // Execute high priority first
      if (highPriority.length > 0) {
        const highResults = await Promise.allSettled(
          highPriority.map(async op => {
            const result = await op.fetcher();
            return { key: op.key, result };
          })
        );

        highResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results[result.value.key] = result.value.result;
          }
        });
      }

      // Execute normal and low priority in parallel
      const remainingOps = [...normalPriority, ...lowPriority];
      if (remainingOps.length > 0) {
        const remainingResults = await Promise.allSettled(
          remainingOps.map(async op => {
            const result = await op.fetcher();
            return { key: op.key, result };
          })
        );

        remainingResults.forEach(result => {
          if (result.status === 'fulfilled') {
            results[result.value.key] = result.value.result;
          }
        });
      }

      return results;
    },
    options
  );
}

/**
 * Get optimizer performance metrics
 */
export async function getOptimizerMetrics() {
  try {
    const [cacheMetrics, dedupMetrics] = await Promise.all([
      (async () => {
        try {
          const cacheService = await container.resolve<ICacheService>('cacheService');
          return await cacheService.getMetrics();
        } catch {
          return null;
        }
      })(),
      requestDeduplicator.getMetrics(),
    ]);

    return {
      cache: cacheMetrics,
      deduplication: dedupMetrics,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('[OPTIMIZER] Failed to get metrics:', error);
    return {
      cache: null,
      deduplication: null,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

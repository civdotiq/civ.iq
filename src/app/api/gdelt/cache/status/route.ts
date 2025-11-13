/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Cache Status API Endpoint
 *
 * GET /api/gdelt/cache/status
 *
 * Returns detailed cache statistics including:
 * - Hit/miss rates for both article and member caches
 * - Memory usage and eviction counts
 * - Cache size and capacity information
 * - Performance metrics for monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { gdeltCache } from '@/lib/gdelt/cache';
import logger from '@/lib/logging/simple-logger';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

export async function GET(_request: NextRequest) {
  try {
    // Get cache statistics
    const stats = gdeltCache.getStats();

    // Calculate additional metrics
    const totalRequests = stats.combined.hitCount + stats.combined.missCount;
    const memoryUsageMB = Math.round((stats.combined.memoryUsage / 1024 / 1024) * 100) / 100;

    // Format response with comprehensive cache information
    const response = {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      cache: {
        articles: {
          size: stats.articles.size,
          maxSize: stats.articles.maxSize,
          hitCount: stats.articles.hitCount,
          missCount: stats.articles.missCount,
          hitRate: stats.articles.hitRate,
          evictionCount: stats.articles.evictionCount,
          memoryUsageMB: Math.round((stats.articles.memoryUsage / 1024 / 1024) * 100) / 100,
        },
        members: {
          size: stats.members.size,
          maxSize: stats.members.maxSize,
          hitCount: stats.members.hitCount,
          missCount: stats.members.missCount,
          hitRate: stats.members.hitRate,
          evictionCount: stats.members.evictionCount,
          memoryUsageMB: Math.round((stats.members.memoryUsage / 1024 / 1024) * 100) / 100,
        },
        combined: {
          totalSize: stats.combined.size,
          maxSize: stats.combined.maxSize,
          totalRequests,
          hitCount: stats.combined.hitCount,
          missCount: stats.combined.missCount,
          hitRate: stats.combined.hitRate,
          evictionCount: stats.combined.evictionCount,
          memoryUsageMB,
        },
      },
      performance: {
        averageResponseTime: totalRequests > 0 ? 'N/A - Not tracked' : 'N/A',
        cacheEfficiency:
          stats.combined.hitRate >= 80
            ? 'Excellent'
            : stats.combined.hitRate >= 60
              ? 'Good'
              : stats.combined.hitRate >= 40
                ? 'Fair'
                : 'Poor',
        memoryEfficiency:
          memoryUsageMB < 50
            ? 'Excellent'
            : memoryUsageMB < 80
              ? 'Good'
              : memoryUsageMB < 95
                ? 'Fair'
                : 'Critical',
      },
      recommendations: generateRecommendations(stats.combined, memoryUsageMB),
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    logger.error('Error getting cache status', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to get cache status',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Generate performance recommendations based on cache metrics
 */
function generateRecommendations(
  stats: {
    hitRate: number;
    evictionCount: number;
    hitCount: number;
    size: number;
    maxSize: number;
  },
  memoryUsageMB: number
): string[] {
  const recommendations: string[] = [];

  if (stats.hitRate < 40) {
    recommendations.push('Consider increasing cache TTL to improve hit rate');
  }

  if (stats.evictionCount > stats.hitCount * 0.1) {
    recommendations.push('High eviction rate detected - consider increasing cache size');
  }

  if (memoryUsageMB > 80) {
    recommendations.push('High memory usage - monitor for memory leaks or reduce cache size');
  }

  if (stats.size === stats.maxSize) {
    recommendations.push('Cache is at maximum capacity - consider increasing maxSize');
  }

  if (stats.hitRate > 90 && memoryUsageMB < 20) {
    recommendations.push('Excellent performance - cache is working optimally');
  }

  if (recommendations.length === 0) {
    recommendations.push('Cache performance is within normal parameters');
  }

  return recommendations;
}

/**
 * POST /api/gdelt/cache/status
 *
 * Performs cache maintenance operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    let result;

    switch (action) {
      case 'cleanup':
        result = gdeltCache.cleanup();
        return NextResponse.json({
          success: true,
          action: 'cleanup',
          removedEntries: result,
          timestamp: new Date().toISOString(),
        });

      case 'clear':
        gdeltCache.clear();
        return NextResponse.json({
          success: true,
          action: 'clear',
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString(),
        });

      case 'stats':
        const stats = gdeltCache.getStats();
        return NextResponse.json({
          success: true,
          action: 'stats',
          stats,
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json(
          {
            error: 'Invalid action',
            validActions: ['cleanup', 'clear', 'stats'],
            timestamp: new Date().toISOString(),
          },
          { status: 400 }
        );
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    logger.error('Error performing cache operation', error as Error);

    return NextResponse.json(
      {
        error: 'Failed to perform cache operation',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

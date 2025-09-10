/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextResponse } from 'next/server';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';

/**
 * GET /api/cache/status
 *
 * Returns comprehensive cache statistics and status information
 * for monitoring cache performance and debugging
 */
export async function GET() {
  try {
    const stats = await govCache.getStats();

    // Calculate hit rate estimates (since we don't track requests vs hits)
    const activeEntries = stats.combined?.activeEntries || 0;
    const estimatedHitRate = activeEntries > 0 ? Math.min(85, 60 + activeEntries * 2) : 0;

    // Memory usage estimation in MB (from fallback cache)
    const memoryUsageMB = ((stats.fallback?.memorySizeEstimate || 0) / 1024 / 1024).toFixed(2);

    // Cache efficiency score based on active vs expired ratio
    const expiredEntries = stats.combined?.expiredEntries || 0;
    const totalCacheEntries = activeEntries + expiredEntries;
    const efficiencyScore =
      totalCacheEntries > 0 ? Math.round((activeEntries / totalCacheEntries) * 100) : 100;

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),

      // Core cache statistics
      cache: {
        totalEntries: stats.combined.totalEntries,
        activeEntries: stats.combined.activeEntries,
        expiredEntries: stats.combined.expiredEntries,
        memoryUsageMB: parseFloat(memoryUsageMB),
        isConnected: stats.redis.isConnected,
        redisStatus: stats.redis.status,
        redundancy: stats.combined.redundancy,
      },

      // Performance metrics
      performance: {
        estimatedHitRate: `${estimatedHitRate}%`,
        efficiencyScore: `${efficiencyScore}%`,
        cacheHealthStatus:
          efficiencyScore >= 80
            ? 'excellent'
            : efficiencyScore >= 60
              ? 'good'
              : efficiencyScore >= 40
                ? 'fair'
                : 'needs_attention',
      },

      // TTL configuration
      ttlConfig: {
        representatives: '30 minutes',
        voting: '15 minutes',
        finance: '24 hours',
        districts: '7 days',
        committees: '1 hour',
      },

      // Operational info
      operations: {
        cleanupInterval: '5 minutes',
        cacheType: 'in-memory-map',
        nodeEnvironment: process.env.NODE_ENV || 'development',
      },

      // Health indicators
      health: {
        memoryPressure:
          parseFloat(memoryUsageMB) > 50
            ? 'high'
            : parseFloat(memoryUsageMB) > 20
              ? 'medium'
              : 'low',
        expirationRate:
          totalCacheEntries > 0
            ? `${Math.round((stats.combined.expiredEntries / totalCacheEntries) * 100)}%`
            : '0%',
        overallHealth:
          parseFloat(memoryUsageMB) < 50 && efficiencyScore >= 60
            ? 'healthy'
            : 'monitoring_required',
      },

      // Metadata
      metadata: {
        endpoint: '/api/cache/status',
        dataSource: 'unified-cache-service',
        generatedAt: new Date().toISOString(),
        version: '2.0.0',
      },
    };

    // Log cache status for monitoring
    logger.info('Cache status requested', {
      activeEntries: stats.combined.activeEntries,
      memoryUsageMB: parseFloat(memoryUsageMB),
      efficiencyScore,
      healthStatus: response.health.overallHealth,
      redundancy: stats.combined.redundancy,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error retrieving cache status', error as Error, {
      endpoint: '/api/cache/status',
    });

    return NextResponse.json(
      {
        status: 'error',
        error: {
          code: 'CACHE_STATUS_ERROR',
          message: 'Unable to retrieve cache status',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
        metadata: {
          endpoint: '/api/cache/status',
          dataSource: 'unified-cache-service',
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cache/status
 *
 * Provides cache management operations
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, pattern } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    let result;

    switch (action) {
      case 'clear':
        if (pattern) {
          govCache.clear(pattern);
          result = { message: `Cleared cache entries matching pattern: ${pattern}` };
        } else {
          govCache.clear();
          result = { message: 'Cleared all cache entries' };
        }
        break;

      case 'cleanup':
        govCache.cleanup();
        result = { message: 'Expired entries cleanup completed' };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Supported actions: clear, cleanup` },
          { status: 400 }
        );
    }

    logger.info('Cache management operation performed', {
      action,
      pattern: pattern || 'all',
      endpoint: '/api/cache/status',
    });

    return NextResponse.json({
      success: true,
      action,
      pattern: pattern || null,
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error performing cache management operation', error as Error, {
      endpoint: '/api/cache/status',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CACHE_MANAGEMENT_ERROR',
          message: 'Unable to perform cache management operation',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

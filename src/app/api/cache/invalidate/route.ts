/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { unifiedCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';

/**
 * POST /api/cache/invalidate
 *
 * Pattern-based cache invalidation for fine-grained cache management
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pattern, patterns } = body;

    if (!pattern && !patterns) {
      return NextResponse.json(
        {
          error: 'Either "pattern" or "patterns" parameter is required',
          examples: {
            single: { pattern: 'representative:K000367' },
            multiple: { patterns: ['representative:', 'voting:'] },
          },
        },
        { status: 400 }
      );
    }

    const results: Array<{ pattern: string; redis: number; fallback: number }> = [];

    // Handle single pattern
    if (pattern) {
      const result = await unifiedCache.invalidatePattern(pattern);
      results.push({ pattern, ...result });
    }

    // Handle multiple patterns
    if (patterns && Array.isArray(patterns)) {
      for (const p of patterns) {
        const result = await unifiedCache.invalidatePattern(p);
        results.push({ pattern: p, ...result });
      }
    }

    const totalInvalidated = results.reduce(
      (acc, r) => ({ redis: acc.redis + r.redis, fallback: acc.fallback + r.fallback }),
      { redis: 0, fallback: 0 }
    );

    logger.info('Cache invalidation completed', {
      patterns: patterns || [pattern],
      results,
      totalInvalidated,
      endpoint: '/api/cache/invalidate',
    });

    return NextResponse.json({
      success: true,
      action: 'invalidate',
      patterns: patterns || [pattern],
      results,
      summary: {
        patternsProcessed: results.length,
        totalEntriesInvalidated: totalInvalidated.redis + totalInvalidated.fallback,
        redisInvalidated: totalInvalidated.redis,
        fallbackInvalidated: totalInvalidated.fallback,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error performing cache invalidation', error as Error, {
      endpoint: '/api/cache/invalidate',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'CACHE_INVALIDATION_ERROR',
          message: 'Unable to perform cache invalidation',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cache/invalidate
 *
 * Get documentation for cache invalidation patterns
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cache/invalidate',
    method: 'POST',
    description: 'Pattern-based cache invalidation for fine-grained cache management',

    parameters: {
      pattern: {
        type: 'string',
        description: 'Single pattern to invalidate',
        examples: ['representative:K000367', 'voting:', 'bills:', 'districts:'],
      },
      patterns: {
        type: 'string[]',
        description: 'Array of patterns to invalidate',
        examples: [
          ['representative:', 'voting:'],
          ['bills:K000367', 'votes:K000367'],
        ],
      },
    },

    commonPatterns: {
      byRepresentative: 'representative:BIOGUIDE_ID',
      allRepresentatives: 'representative:',
      votingData: 'voting:',
      billsData: 'bills:',
      financeData: 'finance:',
      districtsData: 'districts:',
      committeesData: 'committees:',
    },

    examples: {
      invalidateSingleRep: {
        method: 'POST',
        body: { pattern: 'representative:K000367' },
        description: 'Invalidate all cache entries for Amy Klobuchar',
      },
      invalidateAllVoting: {
        method: 'POST',
        body: { pattern: 'voting:' },
        description: 'Invalidate all voting-related cache entries',
      },
      invalidateMultiple: {
        method: 'POST',
        body: { patterns: ['bills:', 'votes:'] },
        description: 'Invalidate multiple data types at once',
      },
    },

    response: {
      success: 'boolean',
      patterns: 'string[]',
      results: 'Array<{ pattern: string, redis: number, fallback: number }>',
      summary: {
        patternsProcessed: 'number',
        totalEntriesInvalidated: 'number',
        redisInvalidated: 'number',
        fallbackInvalidated: 'number',
      },
    },

    metadata: {
      version: '1.0.0',
      cacheSystem: 'unified-cache-service',
      redundancy: 'redis-primary-with-fallback',
    },
  });
}

/**
 * Cache Management Admin API
 * POST /api/admin/cache
 * Invalidates cache by pattern (requires authentication)
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';

/**
 * Verify admin access using timing-safe comparison
 * Prevents timing attacks that could leak token information
 */
function verifyAdminAccess(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey) {
    logger.warn('[CacheAdminAPI] ADMIN_API_KEY not configured in environment');
    return false;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.substring(7);

  // Use timing-safe comparison to prevent timing attacks
  // Both strings must be the same length for timingSafeEqual
  if (token.length !== adminKey.length) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(token, 'utf8'), Buffer.from(adminKey, 'utf8'));
  } catch {
    // If comparison fails for any reason, deny access
    return false;
  }
}

interface CacheInvalidationRequest {
  pattern?: string;
  clearAll?: boolean;
}

interface CacheInvalidationResponse {
  success: boolean;
  message: string;
  cleared?: {
    redis: number;
    fallback: number;
    total: number;
  };
  error?: string;
}

/**
 * POST /api/admin/cache - Invalidate cache by pattern
 * Body: { pattern: "core:state-legislators:MI", clearAll: false }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      logger.warn('[CacheAdminAPI] Unauthorized access attempt', {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Invalid or missing admin credentials',
        } as CacheInvalidationResponse,
        { status: 401 }
      );
    }

    const body = (await request.json()) as CacheInvalidationRequest;
    const { pattern, clearAll } = body;

    // Clear all caches
    if (clearAll) {
      logger.info('[CacheAdminAPI] Clearing ALL cache entries');
      await govCache.clear();
      return NextResponse.json({
        success: true,
        message: 'All cache entries cleared successfully',
        cleared: {
          redis: 0,
          fallback: 0,
          total: 0,
        },
      } as CacheInvalidationResponse);
    }

    // Clear by pattern
    if (pattern) {
      logger.info(`[CacheAdminAPI] Clearing cache entries matching pattern: ${pattern}`);
      const result = await govCache.invalidatePattern(pattern);

      return NextResponse.json({
        success: true,
        message: `Cache entries matching "${pattern}" cleared successfully`,
        cleared: {
          redis: result.redis,
          fallback: result.fallback,
          total: result.redis + result.fallback,
        },
      } as CacheInvalidationResponse);
    }

    // No pattern or clearAll specified
    return NextResponse.json(
      {
        success: false,
        error: 'Must specify either "pattern" or "clearAll: true"',
      } as CacheInvalidationResponse,
      { status: 400 }
    );
  } catch (error) {
    logger.error('[CacheAdminAPI] Error invalidating cache', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to invalidate cache',
      } as CacheInvalidationResponse,
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/cache - Get cache statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    if (!verifyAdminAccess(request)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Invalid or missing admin credentials',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cache statistics endpoint',
      note: 'Statistics tracking not yet implemented - use POST to clear cache',
      availablePatterns: [
        'core:state-legislators:{state}',
        'core:state-legislator:{state}:{id}',
        'core:state-legislator-votes:{state}:{id}',
        'core:state-bill:{state}:{id}',
        'core:state-jurisdiction:{state}',
        'census:geocode:{address}',
      ],
    });
  } catch (error) {
    logger.error('[CacheAdminAPI] Error fetching cache stats', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cache statistics',
      },
      { status: 500 }
    );
  }
}

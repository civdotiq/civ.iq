/**
 * Cache Warming API Endpoint
 * Proactively warms cache for high-traffic endpoints
 * Intended to be called by cron jobs every 6 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 30; // Cache warming can take time

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization (optional - add secret token check)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CACHE_WARM_SECRET;

    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const results: { endpoint: string; success: boolean; duration: number; error?: string }[] = [];

    // Warm districts/all cache
    const districtStart = Date.now();
    try {
      const response = await fetch(`${baseUrl}/api/districts/all?bust=true`, {
        headers: {
          'User-Agent': 'CacheWarmer/1.0',
        },
      });

      if (response.ok) {
        results.push({
          endpoint: '/api/districts/all',
          success: true,
          duration: Date.now() - districtStart,
        });
        logger.info('Cache warmed successfully', {
          endpoint: '/api/districts/all',
          duration: Date.now() - districtStart,
        });
      } else {
        results.push({
          endpoint: '/api/districts/all',
          success: false,
          duration: Date.now() - districtStart,
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      results.push({
        endpoint: '/api/districts/all',
        success: false,
        duration: Date.now() - districtStart,
        error: (error as Error).message,
      });
      logger.error('Failed to warm cache', error as Error, {
        endpoint: '/api/districts/all',
      });
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    logger.info('Cache warming completed', {
      totalDuration,
      successCount,
      totalEndpoints: results.length,
    });

    return NextResponse.json({
      success: true,
      totalDuration,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: results.length - successCount,
      },
    });
  } catch (error) {
    logger.error('Cache warming failed', error as Error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
        duration: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}

// GET endpoint for manual triggering (if needed)
export async function GET(request: NextRequest) {
  return POST(request);
}

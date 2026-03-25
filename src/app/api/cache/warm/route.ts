/**
 * Cache Warming API Endpoint
 * Proactively warms cache for high-traffic endpoints
 * Intended to be called by cron jobs every 6 hours
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getServerBaseUrl } from '@/lib/server-url';
import { verifyBearerToken } from '@/lib/security/verify-bearer-token';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Cache warming can take time

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Verify authorization - REQUIRED in production (fail-closed security)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CACHE_WARM_SECRET;

    // In production, require CACHE_WARM_SECRET to be set
    if (process.env.NODE_ENV === 'production' && !expectedToken) {
      logger.error('CACHE_WARM_SECRET not configured - endpoint disabled for security');
      return NextResponse.json(
        { error: 'Endpoint not configured - contact administrator' },
        { status: 503 }
      );
    }

    // If secret is configured, always require it (timing-safe comparison)
    if (expectedToken && !verifyBearerToken(authHeader, expectedToken)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = getServerBaseUrl();
    const results: { endpoint: string; success: boolean; duration: number; error?: string }[] = [];

    // Endpoints to warm — ordered by priority
    const endpoints = [
      '/api/districts/all?bust=true',
      '/api/v1/representatives',
      '/api/v1/committees',
      '/api/v1/bills?limit=50',
      '/api/feed/bills/latest',
    ];

    // Top congressional leaders — warm their member feeds to pre-cache votes + bills
    const leaderBioguideIds = [
      'J000307', // Mike Johnson (Speaker)
      'J000174', // Hakeem Jeffries (Minority Leader)
      'T000278', // John Thune (Senate Majority Leader)
      'S000148', // Chuck Schumer (Senate Minority Leader)
      'S001172', // Steve Scalise (Majority Leader)
      'C000880', // Mike Crapo (Senate Pro Tempore)
      'D000197', // Diana DeGette (Senior Whip)
      'D000399', // Lloyd Doggett
      'C001075', // Tom Cotton
      'G000386', // Chuck Grassley
      'P000197', // Nancy Pelosi
      'M000355', // Mitch McConnell
      'W000437', // Roger Wicker
      'M001111', // Patty Murray
      'K000367', // Amy Klobuchar
      'C001056', // John Cornyn
      'D000618', // Steve Daines
      'C001098', // Ted Cruz
      'W000817', // Elizabeth Warren
      'S000033', // Bernie Sanders
    ];

    for (const bioguideId of leaderBioguideIds) {
      endpoints.push(`/api/feed/member/${bioguideId}`);
    }

    // Warm each endpoint sequentially to avoid overwhelming upstream APIs
    for (const endpoint of endpoints) {
      const epStart = Date.now();
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: { 'User-Agent': 'CacheWarmer/1.0' },
        });

        results.push({
          endpoint,
          success: response.ok,
          duration: Date.now() - epStart,
          ...(response.ok ? {} : { error: `HTTP ${response.status}` }),
        });

        if (response.ok) {
          logger.info('Cache warmed successfully', {
            endpoint,
            duration: Date.now() - epStart,
          });
        }
      } catch (error) {
        results.push({
          endpoint,
          success: false,
          duration: Date.now() - epStart,
          error: (error as Error).message,
        });
        logger.error('Failed to warm cache', error as Error, { endpoint });
      }
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

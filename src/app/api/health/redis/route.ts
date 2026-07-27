/**
 * Redis Health Check Endpoint
 *
 * Reports whether Redis is actually reachable — not whether it is configured.
 *
 * The previous version of this route could not detect a Redis outage. It
 * exercised `redisClient.set/get/exists`, all of which swallow transport
 * errors and answer from the in-memory fallback, then hardcoded
 * `status: 'healthy'` regardless of what those operations returned. During
 * the 2026-07 Upstash suspension it served:
 *
 *   {"status":"healthy","redis":{"connected":true,"redisAvailable":true,
 *    "operations":{"set":true,"get":false,"exists":false}}}
 *
 * — `set: true` was the memory fallback reporting success, `get` and
 * `exists` were already failing, and the verdict was still "healthy". Six
 * days of a production cache outage passed with a green health check.
 *
 * This version derives the verdict from `probe()`, which round-trips the
 * backing store with no fallback, and returns 503 when Redis is unreachable
 * so that external monitoring can page on it.
 */

import { NextResponse } from 'next/server';
import { govCache } from '@/services/cache';
import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

type HealthVerdict = 'healthy' | 'degraded' | 'unhealthy';

export async function GET() {
  try {
    const startTime = Date.now();
    const redisClient = getRedisCache();

    // Real round-trip. Does not consult the in-memory fallback.
    const probe = await redisClient.probe();
    const redisStatus = redisClient.getStatus();
    const cacheStats = await govCache.getStats();
    const responseTime = Date.now() - startTime;

    // Unreachable is an outage. Reachable-but-previously-degraded means the
    // fallback absorbed real failures since this instance started — worth
    // surfacing, but not worth paging on, so it is not a 503.
    const verdict: HealthVerdict = !probe.reachable
      ? 'unhealthy'
      : redisStatus.degraded
        ? 'degraded'
        : 'healthy';

    const body = {
      status: verdict,
      redis: {
        reachable: probe.reachable,
        transport: probe.transport,
        probeLatencyMs: probe.latencyMs,
        ...(probe.error ? { error: probe.error } : {}),
        configured: redisStatus.redisAvailable,
        clientStatus: redisStatus.redisStatus,
        fallbackCacheSize: redisStatus.fallbackCacheSize,
        // Non-zero means operations silently degraded to memory.
        restFailureCount: redisStatus.restFailureCount,
        lastRestFailure: redisStatus.lastRestFailure,
      },
      cache: {
        ...cacheStats,
        performance: {
          responseTimeMs: responseTime,
          status: responseTime < 100 ? 'fast' : responseTime < 500 ? 'good' : 'slow',
        },
      },
      timestamp: new Date().toISOString(),
    };

    if (verdict === 'unhealthy') {
      logger.error('Redis health check: unreachable', new Error(probe.error ?? 'unknown'), {
        transport: probe.transport,
        probeLatencyMs: probe.latencyMs,
      });
    } else {
      logger.info('Redis health check completed', {
        verdict,
        probeLatencyMs: probe.latencyMs,
        restFailureCount: redisStatus.restFailureCount,
      });
    }

    return NextResponse.json(body, {
      status: verdict === 'unhealthy' ? 503 : 200,
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    });
  } catch (error) {
    logger.error('Redis health check failed', error as Error);

    return NextResponse.json(
      {
        status: 'unhealthy' satisfies HealthVerdict,
        error: (error as Error).message,
        redis: { reachable: false, transport: 'none', configured: false },
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  }
}

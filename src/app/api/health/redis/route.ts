/**
 * Redis Health Check Endpoint
 * Tests Redis connection and cache performance
 */

import { NextResponse } from 'next/server';
import { govCache } from '@/services/cache';
import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

export async function GET() {
  try {
    const startTime = Date.now();

    // Get Redis client
    const redisClient = getRedisCache();

    // Test Redis connection and basic operations
    const testKey = 'health-check-test';
    const testValue = { timestamp: Date.now(), test: 'redis-health' };

    // Test SET operation
    const setResult = await redisClient.set(testKey, testValue, 60); // 1 minute TTL

    // Test GET operation
    const getResult = await redisClient.get(testKey);

    // Test EXISTS operation
    const existsResult = await redisClient.exists(testKey);

    // Clean up test key
    await redisClient.delete(testKey);

    // Get Redis status
    const redisStatus = redisClient.getStatus();

    // Get cache stats
    const cacheStats = await govCache.getStats();

    const responseTime = Date.now() - startTime;

    const healthStatus = {
      status: 'healthy',
      redis: {
        connected: redisStatus.isConnected,
        status: redisStatus.redisStatus,
        fallbackCacheSize: redisStatus.fallbackCacheSize,
        redisAvailable: redisStatus.redisAvailable,
        operations: {
          set: setResult === true,
          get: getResult !== null && getResult !== undefined,
          exists: existsResult === false, // Should be false after delete
        },
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

    logger.info('Redis health check completed', {
      connected: redisStatus.isConnected,
      responseTime,
      operations: healthStatus.redis.operations,
    });

    return NextResponse.json(healthStatus);
  } catch (error) {
    logger.error('Redis health check failed', error as Error);

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: (error as Error).message,
        redis: {
          connected: false,
          status: 'error',
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}

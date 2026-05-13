/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { getRedisCache, RedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import { monitorCache } from '@/lib/monitoring/telemetry';

// Lazy-load the Redis cache instance
let redisCache: RedisCache | null = null;

const getCache = (): RedisCache => {
  if (!redisCache) {
    redisCache = getRedisCache();
  }
  return redisCache;
};

// Cache helper function with automatic key generation
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  const monitor = monitorCache('get', key);
  const cache = getCache();

  try {
    const cached = await cache.get<T>(key);
    // Treat empty arrays as cache miss — they indicate an upstream fetch
    // failure that should be retried, not served from cache.
    if (cached && !(Array.isArray(cached) && cached.length === 0)) {
      monitor.end(true);
      logger.info('Cache hit', { key, ttl: ttlSeconds });
      return cached;
    }

    monitor.end(false);
    logger.info('Cache miss, fetching data', { key });
    const data = await fetchFn();

    // Don't cache empty arrays — they would poison the cache and prevent
    // recovery when the upstream source comes back.
    if (Array.isArray(data) && data.length === 0) {
      logger.warn('Skipping cache write for empty result', { key });
      return data;
    }

    // Set in cache with monitoring
    const setMonitor = monitorCache('set', key);
    const setSuccess = await cache.set(key, data, ttlSeconds);
    setMonitor.end();

    if (setSuccess) {
      logger.info('Data cached successfully', { key, ttl: ttlSeconds });
    } else {
      logger.warn('Failed to cache data', { key });
    }

    return data;
  } catch (error) {
    monitor.end(false, error as Error);
    logger.error('Cache operation failed', error as Error, { key });

    // Fall back to direct fetch on cache error
    return await fetchFn();
  }
}

// Export Redis cache methods for direct use
export const cache = {
  get: async <T>(key: string): Promise<T | null> => {
    try {
      return await getCache().get<T>(key);
    } catch (error) {
      logger.error('Cache get failed', error as Error, { key });
      return null;
    }
  },

  set: async <T>(key: string, data: T, ttlSeconds: number = 3600): Promise<boolean> => {
    try {
      return await getCache().set(key, data, ttlSeconds);
    } catch (error) {
      logger.error('Cache set failed', error as Error, { key });
      return false;
    }
  },

  delete: async (key: string): Promise<boolean> => {
    try {
      return await getCache().delete(key);
    } catch (error) {
      logger.error('Cache delete failed', error as Error, { key });
      return false;
    }
  },

  clear: async (): Promise<boolean> => {
    try {
      return await getCache().flush();
    } catch (error) {
      logger.error('Cache clear failed', error as Error);
      return false;
    }
  },

  exists: async (key: string): Promise<boolean> => {
    try {
      return await getCache().exists(key);
    } catch (error) {
      logger.error('Cache exists check failed', error as Error, { key });
      return false;
    }
  },

  getStatus: () => getCache().getStatus(),
};

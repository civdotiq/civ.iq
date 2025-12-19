/**
 * Edge-Compatible Cache Service
 *
 * Uses @upstash/redis which is designed for Edge Runtime and Serverless.
 * This replaces ioredis-based caching for Edge functions.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 */

import { Redis } from '@upstash/redis';

// Lazy initialization to avoid build-time errors
let redisClient: Redis | null = null;

function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return null;
  }

  redisClient = new Redis({
    url,
    token,
  });

  return redisClient;
}

// In-memory fallback for when Redis is unavailable
const memoryCache = new Map<string, { data: unknown; expiresAt: number }>();

// TTL configuration in seconds
const TTL_CONFIG: Record<string, number> = {
  representatives: 86400, // 24 hours
  districts: 604800, // 7 days
  committees: 43200, // 12 hours
  finance: 14400, // 4 hours
  bills: 7200, // 2 hours
  votes: 900, // 15 minutes
  news: 900, // 15 minutes
  default: 3600, // 1 hour
};

export class EdgeCache {
  /**
   * Get cached data
   */
  async get<T>(key: string): Promise<T | null> {
    const redis = getRedisClient();

    // Try Redis first
    if (redis) {
      try {
        const result = await redis.get<T>(key);
        if (result !== null) {
          return result;
        }
      } catch {
        // Redis failed, fall through to memory cache
      }
    }

    // Try memory cache
    const cached = memoryCache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data as T;
    }

    // Cleanup expired entry
    if (cached) {
      memoryCache.delete(key);
    }

    return null;
  }

  /**
   * Set cached data
   */
  async set<T>(key: string, data: T, options?: { ttl?: number; dataType?: string }): Promise<void> {
    const ttlSeconds = options?.ttl || TTL_CONFIG[options?.dataType || 'default'] || 3600;
    const redis = getRedisClient();

    // Set in Redis
    if (redis) {
      try {
        await redis.set(key, data, { ex: ttlSeconds });
      } catch {
        // Redis failed, continue to memory cache
      }
    }

    // Also set in memory cache (shorter TTL for memory)
    const memoryTtl = Math.min(ttlSeconds * 1000, 5 * 60 * 1000); // Max 5 minutes in memory
    memoryCache.set(key, {
      data,
      expiresAt: Date.now() + memoryTtl,
    });
  }

  /**
   * Delete cached data
   */
  async delete(key: string): Promise<void> {
    const redis = getRedisClient();

    if (redis) {
      try {
        await redis.del(key);
      } catch {
        // Ignore errors
      }
    }

    memoryCache.delete(key);
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const result = await this.get(key);
    return result !== null;
  }
}

// Export singleton instance
export const edgeCache = new EdgeCache();

/**
 * Cached fetch helper for Edge functions
 */
export async function edgeCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { ttl?: number; dataType?: string }
): Promise<T> {
  // Try cache first
  const cached = await edgeCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Cache the result
  await edgeCache.set(key, data, options);

  return data;
}

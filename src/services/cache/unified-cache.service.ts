/**
 * Unified Cache Service
 * Redis primary with in-memory fallback for high availability
 * Replaces both simple-government-cache and redis-government-cache
 *
 * NOTE: Migrated to use redis-client.ts for better Upstash REST API support
 * and improved serverless compatibility.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import { requestCoalescer } from '@/lib/cache/request-coalescer';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  source: string;
  expiresAt: number;
}

export class UnifiedCacheService {
  private fallbackCache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL_SECONDS = 3600; // 1 hour
  private redisCache = getRedisCache();

  // TTL configuration optimized for data volatility patterns
  // Redis TTLs: seconds, Memory TTLs: milliseconds
  private readonly ttls = {
    // Static/Semi-static data - long cache times
    representatives: { redis: 86400, memory: 60 * 60 * 1000 }, // 24h / 1h (basic info rarely changes)
    districts: { redis: 7 * 86400, memory: 24 * 60 * 60 * 1000 }, // 7d / 1d (boundaries static)
    committees: { redis: 12 * 60 * 60, memory: 2 * 60 * 60 * 1000 }, // 12h / 2h (membership changes periodically)

    // Dynamic financial data - moderate cache times
    finance: { redis: 4 * 60 * 60, memory: 30 * 60 * 1000 }, // 4h / 30min (quarterly/annual filings)

    // Legislative data - variable based on activity
    bills: { redis: 2 * 60 * 60, memory: 10 * 60 * 1000 }, // 2h / 10min (active during sessions)
    votes: { redis: 15 * 60, memory: 3 * 60 * 1000 }, // 15min / 3min (frequent during voting periods - need fresh data)
    voting: { redis: 15 * 60, memory: 3 * 60 * 1000 }, // 15min / 3min (voting history accumulates during active sessions)

    // Heavy computation endpoints - balanced for performance vs freshness
    batch: { redis: 30 * 60, memory: 5 * 60 * 1000 }, // 30min / 5min (multi-API aggregation)
    heavyEndpoints: { redis: 45 * 60, memory: 10 * 60 * 1000 }, // 45min / 10min (complex queries)

    // News and external data - shorter cache for freshness
    news: { redis: 15 * 60, memory: 2 * 60 * 1000 }, // 15min / 2min (breaking news)

    // Session-based data - very short cache
    search: { redis: 5 * 60, memory: 30 * 1000 }, // 5min / 30sec (user search results)
  };

  constructor() {
    // Cleanup expired fallback cache entries every 5 minutes
    if (typeof window === 'undefined') {
      setInterval(() => this.cleanupFallbackCache(), 5 * 60 * 1000);
    }
  }

  /**
   * Get cached data with Redis primary, fallback secondary
   */
  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    try {
      const redisResult = await this.redisCache.get<CacheEntry<T>>(key);

      if (redisResult) {
        const entry = redisResult;

        // Double-check expiry (Redis should handle this automatically)
        if (Date.now() <= entry.expiresAt) {
          logger.debug(`[Unified Cache HIT-Redis] ${key} (source: ${entry.source})`);
          return entry.data;
        } else {
          logger.debug(`[Unified Cache EXPIRED-Redis] ${key}`);
          await this.redisCache.delete(key);
        }
      }
    } catch (error) {
      logger.warn('[Unified Cache] Redis get failed, trying fallback', {
        key,
        error: (error as Error).message,
      });
    }

    // Try fallback cache
    const fallbackEntry = this.fallbackCache.get(key);
    if (fallbackEntry) {
      if (Date.now() <= fallbackEntry.expiresAt) {
        logger.debug(`[Unified Cache HIT-Fallback] ${key} (source: ${fallbackEntry.source})`);
        return fallbackEntry.data as T;
      } else {
        logger.debug(`[Unified Cache EXPIRED-Fallback] ${key}`);
        this.fallbackCache.delete(key);
      }
    }

    logger.debug(`[Unified Cache MISS] ${key}`);
    return null;
  }

  /**
   * Set data in both Redis and fallback cache
   */
  async set<T>(
    key: string,
    data: T,
    options?: {
      ttl?: number;
      source?: string;
      dataType?: keyof UnifiedCacheService['ttls'];
    }
  ): Promise<void> {
    const dataType = options?.dataType || 'representatives';
    const ttlConfig = this.ttls[dataType as keyof typeof this.ttls] || {
      redis: this.DEFAULT_TTL_SECONDS,
      memory: 30 * 60 * 1000,
    };

    // Use provided TTL or data type defaults
    const redisTtl = options?.ttl ? Math.floor(options.ttl / 1000) : ttlConfig.redis;
    const memoryTtl = options?.ttl || ttlConfig.memory;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      source: options?.source || 'unknown',
      expiresAt: Date.now() + redisTtl * 1000,
    };

    // Set in Redis (primary)
    try {
      await this.redisCache.set(key, entry, redisTtl);
      logger.debug(`[Unified Cache SET-Redis] ${key} (TTL: ${redisTtl}s, source: ${entry.source})`);
    } catch (error) {
      logger.warn('[Unified Cache] Redis set failed, fallback only', {
        key,
        error: (error as Error).message,
      });
    }

    // Set in fallback cache (always)
    const fallbackEntry: CacheEntry<T> = {
      ...entry,
      expiresAt: Date.now() + memoryTtl,
    };
    this.fallbackCache.set(key, fallbackEntry);
    logger.debug(
      `[Unified Cache SET-Fallback] ${key} (TTL: ${memoryTtl / 1000}s, source: ${entry.source})`
    );
  }

  /**
   * Clear cache entries with pattern matching
   */
  async clear(pattern?: string): Promise<void> {
    let redisCleared = 0;
    let fallbackCleared = 0;

    // Clear Redis
    try {
      if (!pattern) {
        await this.redisCache.flush();
        logger.info('[Unified Cache CLEAR-Redis] Flushed all entries');
      } else {
        const keysResult = await this.redisCache.keys(`*${pattern}*`);
        if (keysResult && keysResult.length > 0) {
          for (const key of keysResult) {
            await this.redisCache.delete(key);
          }
          redisCleared = keysResult.length;
          logger.info(
            `[Unified Cache CLEAR-Redis] Removed ${redisCleared} entries matching "${pattern}"`
          );
        }
      }
    } catch (error) {
      logger.warn('[Unified Cache] Redis clear failed', {
        pattern,
        error: (error as Error).message,
      });
    }

    // Clear fallback cache
    if (!pattern) {
      fallbackCleared = this.fallbackCache.size;
      this.fallbackCache.clear();
      logger.info(`[Unified Cache CLEAR-Fallback] Removed all ${fallbackCleared} entries`);
    } else {
      for (const key of this.fallbackCache.keys()) {
        if (key.includes(pattern)) {
          this.fallbackCache.delete(key);
          fallbackCleared++;
        }
      }
      logger.info(
        `[Unified Cache CLEAR-Fallback] Removed ${fallbackCleared} entries matching "${pattern}"`
      );
    }
  }

  /**
   * Pattern-based cache invalidation
   */
  async invalidatePattern(pattern: string): Promise<{ redis: number; fallback: number }> {
    let redisCount = 0;
    let fallbackCount = 0;

    // Invalidate in Redis - try both with and without prefix
    try {
      // Try with Redis prefix
      let keysResult = await this.redisCache.keys(`*${pattern}*`);
      if (keysResult && keysResult.length > 0) {
        for (const key of keysResult) {
          await this.redisCache.delete(key);
        }
        redisCount = keysResult.length;
      }

      // If no results and pattern doesn't start with prefix, try with prefix
      if (redisCount === 0 && !pattern.startsWith('civiq:')) {
        keysResult = await this.redisCache.keys(`*civiq:${pattern}*`);
        if (keysResult && keysResult.length > 0) {
          for (const key of keysResult) {
            await this.redisCache.delete(key);
          }
          redisCount = keysResult.length;
        }
      }
    } catch (error) {
      logger.warn('[Unified Cache] Redis pattern invalidation failed', {
        pattern,
        error: (error as Error).message,
      });
    }

    // Invalidate in fallback cache
    for (const key of this.fallbackCache.keys()) {
      if (key.includes(pattern)) {
        this.fallbackCache.delete(key);
        fallbackCount++;
      }
    }

    logger.info(
      `[Unified Cache INVALIDATE] Pattern "${pattern}" - Redis: ${redisCount}, Fallback: ${fallbackCount}`
    );
    return { redis: redisCount, fallback: fallbackCount };
  }

  /**
   * Get comprehensive cache statistics
   */
  async getStats() {
    // Get Redis status
    const redisStatus = this.redisCache.getStatus();
    let redisKeyCount = 0;

    try {
      const keysResult = await this.redisCache.keys('*');
      redisKeyCount = keysResult ? keysResult.length : 0;
    } catch (error) {
      logger.warn('[Unified Cache] Failed to get Redis key count', {
        error: (error as Error).message,
      });
    }

    // Get fallback cache stats
    const now = Date.now();
    let fallbackExpired = 0;
    let fallbackActive = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.fallbackCache.values()) {
      if (entry.expiresAt < now) {
        fallbackExpired++;
      } else {
        fallbackActive++;
      }

      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      redis: {
        isConnected: redisStatus.isConnected,
        status: redisStatus.redisStatus,
        totalEntries: redisKeyCount,
      },
      fallback: {
        totalEntries: this.fallbackCache.size,
        activeEntries: fallbackActive,
        expiredEntries: fallbackExpired,
        oldestEntry: oldestEntry ? new Date(oldestEntry).toISOString() : null,
        newestEntry: newestEntry ? new Date(newestEntry).toISOString() : null,
        memorySizeEstimate: JSON.stringify(Array.from(this.fallbackCache.entries())).length,
      },
      combined: {
        totalEntries: redisKeyCount + this.fallbackCache.size,
        activeEntries: redisKeyCount + fallbackActive,
        expiredEntries: fallbackExpired,
        redundancy: redisStatus.isConnected ? ('dual-layer' as const) : ('fallback-only' as const),
      },
    };
  }

  /**
   * Cleanup expired entries from fallback cache
   */
  private cleanupFallbackCache(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.fallbackCache.entries()) {
      if (entry.expiresAt < now) {
        this.fallbackCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      logger.debug(`[Unified Cache CLEANUP-Fallback] Removed ${removed} expired entries`);
    }
  }

  /**
   * No-op cleanup since Redis handles TTL automatically and fallback has its own cleanup
   */
  cleanup(): void {
    this.cleanupFallbackCache();
  }
}

// Create singleton instance
export const unifiedCache = new UnifiedCacheService();

/**
 * Generic cached fetch helper with request coalescing
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    source?: string;
    dataType?: keyof UnifiedCacheService['ttls'];
  }
): Promise<T> {
  // Try cache first
  const cached = await unifiedCache.get<T>(cacheKey);
  if (cached) return cached;

  // Use request coalescing to prevent duplicate simultaneous requests
  return requestCoalescer.coalesce(cacheKey, async () => {
    // Double-check cache in case another request just populated it
    const doubleCheck = await unifiedCache.get<T>(cacheKey);
    if (doubleCheck) return doubleCheck;

    // Fetch fresh data
    const fresh = await fetcher();

    // Cache for next time
    await unifiedCache.set(cacheKey, fresh, options);

    return fresh;
  });
}

/**
 * Specialized caching for heavy endpoints
 */
export async function cachedHeavyEndpoint<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    source?: string;
    bypassCache?: boolean;
  }
): Promise<T> {
  // Skip cache if bypassing
  if (options?.bypassCache) {
    const fresh = await fetcher();
    await unifiedCache.set(cacheKey, fresh, { dataType: 'heavyEndpoints', source: options.source });
    return fresh;
  }

  return cachedFetch(cacheKey, fetcher, {
    dataType: 'heavyEndpoints',
    source: options?.source || 'heavy-endpoint',
  });
}

/**
 * Stale-while-revalidate caching strategy
 * Serves stale cache immediately while fetching fresh data in background
 */
export async function cachedStaleWhileRevalidate<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    source?: string;
    dataType?: keyof UnifiedCacheService['ttls'];
    maxStaleTime?: number; // How long to serve stale data (default: 2x TTL)
  }
): Promise<T> {
  const cached = await unifiedCache.get<T>(cacheKey);

  // If we have cached data, return it immediately
  if (cached) {
    // Trigger background revalidation
    // Don't await this - let it run in background
    void (async () => {
      try {
        const fresh = await fetcher();
        await unifiedCache.set(cacheKey, fresh, options);
        logger.debug(`[SWR] Background revalidation complete for ${cacheKey}`);
      } catch (error) {
        logger.warn('[SWR] Background revalidation failed', {
          key: cacheKey,
          error: (error as Error).message,
        });
      }
    })();

    return cached;
  }

  // No cache - fetch normally with coalescing
  return cachedFetch(cacheKey, fetcher, options);
}

// Backwards compatibility exports
export const govCache = unifiedCache;

// Type exports
export interface CacheOptions {
  ttl?: number;
  source?: string;
  dataType?:
    | 'representatives'
    | 'voting'
    | 'finance'
    | 'districts'
    | 'committees'
    | 'bills'
    | 'votes'
    | 'batch'
    | 'heavyEndpoints'
    | 'news'
    | 'search';
}

export interface CacheStats {
  redis: {
    isConnected: boolean;
    status: string;
    totalEntries: number;
  };
  fallback: {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    oldestEntry: string | null;
    newestEntry: string | null;
    memorySizeEstimate: number;
  };
  combined: {
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    redundancy: 'dual-layer' | 'fallback-only';
  };
}

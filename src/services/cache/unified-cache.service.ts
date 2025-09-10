/**
 * Unified Cache Service
 * Redis primary with in-memory fallback for high availability
 * Replaces both simple-government-cache and redis-government-cache
 */

import { redisService } from './redis.service';
import logger from '@/lib/logging/simple-logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: string;
  expiresAt: number;
}

export class UnifiedCacheService {
  private fallbackCache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL_SECONDS = 3600; // 1 hour

  // TTL configuration in seconds for Redis, milliseconds for in-memory
  private readonly ttls = {
    representatives: { redis: 86400, memory: 30 * 60 * 1000 }, // 24h / 30min
    voting: { redis: 21600, memory: 15 * 60 * 1000 }, // 6h / 15min
    finance: { redis: 86400, memory: 24 * 60 * 60 * 1000 }, // 24h / 24h
    districts: { redis: 604800, memory: 7 * 24 * 60 * 60 * 1000 }, // 7d / 7d
    committees: { redis: 86400, memory: 60 * 60 * 1000 }, // 24h / 1h
    bills: { redis: 21600, memory: 5 * 60 * 1000 }, // 6h / 5min
    votes: { redis: 21600, memory: 5 * 60 * 1000 }, // 6h / 5min
    batch: { redis: 21600, memory: 5 * 60 * 1000 }, // 6h / 5min
    heavyEndpoints: { redis: 21600, memory: 5 * 60 * 1000 }, // 6h / 5min
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
      const redisResult = await redisService.get<CacheEntry<T>>(key);

      if (redisResult.success && redisResult.data) {
        const entry = redisResult.data;

        // Double-check expiry (Redis should handle this automatically)
        if (Date.now() <= entry.expiresAt) {
          logger.debug(`[Unified Cache HIT-Redis] ${key} (source: ${entry.source})`);
          return entry.data;
        } else {
          logger.debug(`[Unified Cache EXPIRED-Redis] ${key}`);
          await redisService.delete(key);
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
        return fallbackEntry.data;
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
    const ttlConfig = (this.ttls as any)[dataType] || {
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
      await redisService.set(key, entry, redisTtl);
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
        await redisService.flush();
        logger.info('[Unified Cache CLEAR-Redis] Flushed all entries');
      } else {
        const keysResult = await redisService.keys(`*${pattern}*`);
        if (keysResult.success && keysResult.data) {
          for (const key of keysResult.data) {
            await redisService.delete(key);
          }
          redisCleared = keysResult.data.length;
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
      let keysResult = await redisService.keys(`*${pattern}*`);
      if (keysResult.success && keysResult.data) {
        for (const key of keysResult.data) {
          await redisService.delete(key);
        }
        redisCount = keysResult.data.length;
      }

      // If no results and pattern doesn't start with prefix, try with prefix
      if (redisCount === 0 && !pattern.startsWith('civiq:')) {
        keysResult = await redisService.keys(`*civiq:${pattern}*`);
        if (keysResult.success && keysResult.data) {
          for (const key of keysResult.data) {
            await redisService.delete(key);
          }
          redisCount = keysResult.data.length;
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
    const redisStatus = redisService.getStatus();
    let redisKeyCount = 0;

    try {
      const keysResult = await redisService.keys('*');
      redisKeyCount = keysResult.success && keysResult.data ? keysResult.data.length : 0;
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
 * Generic cached fetch helper
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

  // Fetch fresh data
  const fresh = await fetcher();

  // Cache for next time
  await unifiedCache.set(cacheKey, fresh, options);

  return fresh;
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
    | 'heavyEndpoints';
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

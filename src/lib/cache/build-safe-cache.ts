/**
 * Build-Safe Cache Service
 * Prevents Redis connections during build-time/static generation
 */

import logger from '@/lib/logging/simple-logger';

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Build-safe cache that uses only in-memory storage during build time
 * and falls back to Redis in runtime when available
 */
export class BuildSafeCache {
  private fallbackCache = new Map<string, CacheEntry>();
  private readonly keyPrefix: string;
  private redisService: {
    get: (key: string) => Promise<{ success: boolean; data?: unknown }>;
    set: (key: string, data: unknown, ttl: number) => Promise<{ success: boolean }>;
    delete: (key: string) => Promise<{ success: boolean }>;
    flush: () => Promise<{ success: boolean }>;
  } | null = null;
  private isInitialized = false;

  constructor(keyPrefix = 'civiq:') {
    this.keyPrefix = keyPrefix;

    // Only initialize Redis in runtime, not during build
    if (!this.isBuildTime()) {
      this.initializeRedis();
    }
  }

  private isBuildTime(): boolean {
    return (
      process.env.NEXT_PHASE === 'phase-production-build' ||
      process.env.CI === 'true' ||
      process.argv.includes('build') ||
      (typeof window === 'undefined' && process.env.NODE_ENV === 'production')
    );
  }

  private async initializeRedis(): Promise<void> {
    if (this.isInitialized || this.isBuildTime()) return;

    try {
      // Only import Redis services in runtime
      const { redisService } = await import('@/services/cache/redis.service');
      this.redisService = redisService;
      this.isInitialized = true;
      logger.debug('Redis cache service initialized for runtime');
    } catch (error) {
      logger.warn('Redis not available, using memory-only cache', error as Error);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const fullKey = `${this.keyPrefix}${key}`;

    // During build time, only use memory cache
    if (this.isBuildTime()) {
      const entry = this.fallbackCache.get(fullKey);
      if (entry && Date.now() < entry.timestamp + entry.ttl) {
        logger.debug(`Build cache hit: ${key}`);
        return entry.data as T;
      }
      return null;
    }

    // Runtime: try Redis first, then fallback
    if (!this.isInitialized) {
      await this.initializeRedis();
    }

    if (this.redisService) {
      try {
        const result = await this.redisService.get(fullKey);
        if (result.success && result.data) {
          return (result.data as { data: T }).data;
        }
      } catch (error) {
        logger.warn(`Redis get failed for ${key}, using fallback`, error as Error);
      }
    }

    // Fallback to memory cache
    const entry = this.fallbackCache.get(fullKey);
    if (entry && Date.now() < entry.timestamp + entry.ttl) {
      return entry.data as T;
    }

    return null;
  }

  async set<T>(key: string, data: T, ttlSeconds = 3600): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000,
    };

    // Always set in memory cache
    this.fallbackCache.set(fullKey, entry);

    // During build time, skip Redis entirely
    if (this.isBuildTime()) {
      logger.debug(`Build cache set: ${key} (memory only)`);
      return;
    }

    // Runtime: also try Redis
    if (!this.isInitialized) {
      await this.initializeRedis();
    }

    if (this.redisService) {
      try {
        await this.redisService.set(fullKey, entry, ttlSeconds);
        logger.debug(`Cache set: ${key} (Redis + memory)`);
      } catch (error) {
        logger.warn(`Redis set failed for ${key}, memory only`, error as Error);
      }
    }
  }

  async delete(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;

    // Always delete from memory
    this.fallbackCache.delete(fullKey);

    // Skip Redis during build time
    if (this.isBuildTime()) return;

    // Runtime: also try Redis
    if (this.redisService) {
      try {
        await this.redisService.delete(fullKey);
      } catch (error) {
        logger.warn(`Redis delete failed for ${key}`, error as Error);
      }
    }
  }

  async clear(): Promise<void> {
    this.fallbackCache.clear();

    if (this.isBuildTime()) return;

    if (this.redisService) {
      try {
        await this.redisService.flush();
      } catch (error) {
        logger.warn('Redis flush failed', error as Error);
      }
    }
  }

  getStatus() {
    return {
      isBuildTime: this.isBuildTime(),
      isRedisInitialized: this.isInitialized,
      memoryEntries: this.fallbackCache.size,
      redisAvailable: !!this.redisService,
    };
  }
}

// Export singleton instance
export const buildSafeCache = new BuildSafeCache();

/**
 * Build-safe cached function wrapper
 */
export async function cachedFunction<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds = 3600
): Promise<T> {
  const cached = await buildSafeCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  await buildSafeCache.set(key, fresh, ttlSeconds);
  return fresh;
}

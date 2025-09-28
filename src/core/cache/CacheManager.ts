/**
 * Multi-Level Cache Manager
 *
 * Implements a hierarchical caching strategy with L1 (memory) and L2 (Redis) cache layers.
 * Optimized for government API responses with intelligent cache warming and invalidation.
 */

import type {
  ICacheService,
  CacheOptions,
  CacheMetrics,
} from '../services/interfaces/ICacheService';
import { MemoryCacheService } from '../services/implementations/MemoryCacheService';
import { PerformanceTimer } from '@/lib/performance/api-timer';
import logger from '@/lib/logging/simple-logger';

export class CacheManager implements ICacheService {
  private l1Cache: MemoryCacheService;
  private l2Cache?: ICacheService;
  private hitCount = 0;
  private missCount = 0;
  private setCount = 0;
  private deleteCount = 0;

  constructor(l2Cache?: ICacheService) {
    this.l1Cache = new MemoryCacheService();
    this.l2Cache = l2Cache;
  }

  /**
   * Get value from cache with L1 -> L2 fallback
   */
  async get<T>(key: string): Promise<T | null> {
    const timer = new PerformanceTimer(`CacheManager.get.${key}`);

    try {
      // Try L1 first
      const l1Value = await this.l1Cache.get<T>(key);
      if (l1Value !== null) {
        this.hitCount++;
        timer.end();
        return l1Value;
      }

      // Try L2 if available
      if (this.l2Cache) {
        const l2Value = await this.l2Cache.get<T>(key);
        if (l2Value !== null) {
          this.hitCount++;
          // Backfill L1 cache
          this.backfillL1(key, l2Value);
          timer.end();
          return l2Value;
        }
      }

      this.missCount++;
      timer.end();
      return null;
    } catch (error) {
      this.missCount++;
      logger.error(`[CacheManager] Error getting key '${key}':`, error);
      timer.end();
      return null;
    }
  }

  /**
   * Set value in both cache layers
   */
  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    const timer = new PerformanceTimer(`CacheManager.set.${key}`);
    const ttlMs = options?.ttlMs || 300000; // 5 minutes default

    try {
      // Set in L1 cache
      await this.l1Cache.set(key, value, { ttlMs });

      // Set in L2 cache if available
      if (this.l2Cache) {
        await this.l2Cache.set(key, value, options);
      }

      this.setCount++;
      timer.end();
    } catch (error) {
      logger.error(`[CacheManager] Error setting key '${key}':`, error);
      timer.end();
      throw error;
    }
  }

  /**
   * Delete from both cache layers
   */
  async delete(key: string): Promise<boolean> {
    const timer = new PerformanceTimer(`CacheManager.delete.${key}`);

    try {
      const l1Success = await this.l1Cache.delete(key);
      let l2Success = true;

      if (this.l2Cache) {
        l2Success = await this.l2Cache.delete(key);
      }

      this.deleteCount++;
      timer.end();
      return l1Success && l2Success;
    } catch (error) {
      logger.error(`[CacheManager] Error deleting key '${key}':`, error);
      timer.end();
      return false;
    }
  }

  /**
   * Delete multiple values by pattern
   */
  async deleteByPattern(pattern: string): Promise<number> {
    let deleted = 0;

    if (this.l2Cache) {
      deleted = await this.l2Cache.deleteByPattern(pattern);
    }

    return deleted;
  }

  /**
   * Delete values by tags
   */
  async deleteByTags(tags: string[]): Promise<number> {
    let deleted = 0;

    if (this.l2Cache) {
      deleted = await this.l2Cache.deleteByTags(tags);
    }

    return deleted;
  }

  /**
   * Clear both cache layers
   */
  async clear(): Promise<void> {
    const timer = new PerformanceTimer('CacheManager.clear');

    try {
      await this.l1Cache.clear();

      if (this.l2Cache) {
        await this.l2Cache.clear();
      }

      // Reset metrics
      this.hitCount = 0;
      this.missCount = 0;
      this.setCount = 0;
      this.deleteCount = 0;

      timer.end();
    } catch (error) {
      logger.error('[CacheManager] Error clearing cache:', error);
      timer.end();
      throw error;
    }
  }

  /**
   * Check if key exists in cache
   */
  async exists(key: string): Promise<boolean> {
    try {
      const value = await this.get(key);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * Get cache metrics
   */
  async getMetrics(): Promise<CacheMetrics> {
    const total = this.hitCount + this.missCount;
    const hitRate = total > 0 ? (this.hitCount / total) * 100 : 0;

    return {
      hits: this.hitCount,
      misses: this.missCount,
      sets: this.setCount,
      deletes: this.deleteCount,
      hitRate,
    };
  }

  /**
   * Get or set pattern (cache aside)
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Backfill L1 cache asynchronously
   */
  private backfillL1<T>(key: string, value: T): void {
    // Async backfill without blocking
    setImmediate(async () => {
      try {
        await this.l1Cache.set(key, value, { ttlMs: 300000 }); // 5 minutes
        logger.debug(`[CacheManager] Backfilled L1 cache for key '${key}'`);
      } catch (error) {
        logger.error(`[CacheManager] Failed to backfill L1 cache for key '${key}':`, error);
      }
    });
  }
}

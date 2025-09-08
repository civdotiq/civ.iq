/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cache Service Interface
 *
 * Defines the contract for caching operations.
 * Supports multi-level caching (L1: Memory, L2: Redis).
 */

export interface CacheOptions {
  ttlMs?: number;
  tags?: string[];
  compress?: boolean;
  serialize?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  hitRate: number;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export interface ICacheService {
  /**
   * Get value from cache
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional TTL
   */
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;

  /**
   * Delete value from cache
   */
  delete(key: string): Promise<boolean>;

  /**
   * Delete multiple values by pattern
   */
  deleteByPattern(pattern: string): Promise<number>;

  /**
   * Delete values by tags
   */
  deleteByTags(tags: string[]): Promise<number>;

  /**
   * Clear all cache entries
   */
  clear(): Promise<void>;

  /**
   * Check if key exists in cache
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get cache metrics
   */
  getMetrics(): Promise<CacheMetrics>;

  /**
   * Get or set pattern (cache aside)
   */
  getOrSet<T>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T>;
}

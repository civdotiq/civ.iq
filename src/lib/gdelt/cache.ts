/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT LRU Cache Implementation
 *
 * High-performance caching layer for GDELT API responses with:
 * - LRU eviction strategy (1000 entries max)
 * - 30-minute TTL (2x GDELT's 15-minute update cycle)
 * - Memory-efficient storage with size tracking
 * - Cache statistics for monitoring
 */

import { GDELTArticle, GDELTError, Result } from '@/types/gdelt';
import { BaseRepresentative } from '@/types/representative';

export interface CacheEntry<T> {
  readonly data: T;
  readonly timestamp: number;
  readonly ttl: number;
  readonly size: number; // Estimated memory size in bytes
}

export interface CacheStats {
  readonly size: number;
  readonly maxSize: number;
  readonly hitCount: number;
  readonly missCount: number;
  readonly evictionCount: number;
  readonly memoryUsage: number; // Estimated bytes
  readonly hitRate: number; // Percentage
}

export interface CacheOptions {
  readonly maxSize?: number;
  readonly defaultTtl?: number;
  readonly maxMemoryBytes?: number;
}

export class LRUCache<T> {
  private readonly maxSize: number;
  private readonly defaultTtl: number;
  private readonly maxMemoryBytes: number;
  private readonly cache = new Map<string, CacheEntry<T>>();

  private hitCount = 0;
  private missCount = 0;
  private evictionCount = 0;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize ?? 1000;
    this.defaultTtl = options.defaultTtl ?? 30 * 60 * 1000; // 30 minutes
    this.maxMemoryBytes = options.maxMemoryBytes ?? 100 * 1024 * 1024; // 100MB
  }

  /**
   * Get item from cache, returns undefined if expired or not found
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.missCount++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.hitCount++;

    return entry.data;
  }

  /**
   * Set item in cache with optional TTL
   */
  set(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl ?? this.defaultTtl,
      size: this.estimateSize(data),
    };

    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add new entry
    this.cache.set(key, entry);

    // Enforce size limits
    this.enforceSize();
    this.enforceMemoryLimit();
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  /**
   * Delete specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalMemory = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      memoryUsage: totalMemory,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Remove expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let removedCount = 0;

    Array.from(this.cache.entries()).forEach(([key, entry]) => {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    });

    return removedCount;
  }

  /**
   * Enforce maximum cache size (LRU eviction)
   */
  private enforceSize(): void {
    while (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.evictionCount++;
      }
    }
  }

  /**
   * Enforce memory limit by evicting LRU entries
   */
  private enforceMemoryLimit(): void {
    let totalMemory = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    while (totalMemory > this.maxMemoryBytes && this.cache.size > 0) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        const entry = this.cache.get(firstKey);
        if (entry) {
          totalMemory -= entry.size;
          this.cache.delete(firstKey);
          this.evictionCount++;
        }
      }
    }
  }

  /**
   * Estimate memory size of cached data (rough approximation)
   */
  private estimateSize(data: T): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate: 2 bytes per character
    } catch {
      return 1024; // Default fallback size
    }
  }
}

/**
 * GDELT-specific cache implementation
 */
export class GDELTCache {
  private readonly articleCache: LRUCache<Result<GDELTArticle[], GDELTError>>;
  private readonly memberCache: LRUCache<Result<GDELTArticle[], GDELTError>>;

  constructor() {
    // Articles cache: larger capacity for general queries
    this.articleCache = new LRUCache({
      maxSize: 500,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      maxMemoryBytes: 50 * 1024 * 1024, // 50MB
    });

    // Member cache: smaller capacity for representative-specific queries
    this.memberCache = new LRUCache({
      maxSize: 500,
      defaultTtl: 30 * 60 * 1000, // 30 minutes
      maxMemoryBytes: 50 * 1024 * 1024, // 50MB
    });
  }

  /**
   * Generate cache key for general queries
   */
  generateQueryKey(query: string, timespan: string, maxrecords: number): string {
    return `query:${query}:${timespan}:${maxrecords}`;
  }

  /**
   * Generate cache key for member queries
   */
  generateMemberKey(bioguideId: string, timespan: string, maxrecords: number): string {
    return `member:${bioguideId}:${timespan}:${maxrecords}`;
  }

  /**
   * Get cached articles for a query
   */
  getArticles(
    query: string,
    timespan: string,
    maxrecords: number
  ): Result<GDELTArticle[], GDELTError> | undefined {
    const key = this.generateQueryKey(query, timespan, maxrecords);
    return this.articleCache.get(key);
  }

  /**
   * Cache articles for a query
   */
  setArticles(
    query: string,
    timespan: string,
    maxrecords: number,
    result: Result<GDELTArticle[], GDELTError>
  ): void {
    const key = this.generateQueryKey(query, timespan, maxrecords);
    this.articleCache.set(key, result);
  }

  /**
   * Get cached articles for a member
   */
  getMemberArticles(
    member: BaseRepresentative,
    timespan: string,
    maxrecords: number
  ): Result<GDELTArticle[], GDELTError> | undefined {
    const key = this.generateMemberKey(member.bioguideId, timespan, maxrecords);
    return this.memberCache.get(key);
  }

  /**
   * Cache articles for a member
   */
  setMemberArticles(
    member: BaseRepresentative,
    timespan: string,
    maxrecords: number,
    result: Result<GDELTArticle[], GDELTError>
  ): void {
    const key = this.generateMemberKey(member.bioguideId, timespan, maxrecords);
    this.memberCache.set(key, result);
  }

  /**
   * Get combined cache statistics
   */
  getStats(): { articles: CacheStats; members: CacheStats; combined: CacheStats } {
    const articleStats = this.articleCache.getStats();
    const memberStats = this.memberCache.getStats();

    const combined: CacheStats = {
      size: articleStats.size + memberStats.size,
      maxSize: articleStats.maxSize + memberStats.maxSize,
      hitCount: articleStats.hitCount + memberStats.hitCount,
      missCount: articleStats.missCount + memberStats.missCount,
      evictionCount: articleStats.evictionCount + memberStats.evictionCount,
      memoryUsage: articleStats.memoryUsage + memberStats.memoryUsage,
      hitRate:
        articleStats.hitCount + memberStats.hitCount > 0
          ? ((articleStats.hitCount + memberStats.hitCount) /
              (articleStats.hitCount +
                memberStats.hitCount +
                articleStats.missCount +
                memberStats.missCount)) *
            100
          : 0,
    };

    return {
      articles: articleStats,
      members: memberStats,
      combined,
    };
  }

  /**
   * Clear all caches
   */
  clear(): void {
    this.articleCache.clear();
    this.memberCache.clear();
  }

  /**
   * Clean up expired entries in both caches
   */
  cleanup(): { articles: number; members: number } {
    return {
      articles: this.articleCache.cleanup(),
      members: this.memberCache.cleanup(),
    };
  }
}

// Global cache instance
export const gdeltCache = new GDELTCache();

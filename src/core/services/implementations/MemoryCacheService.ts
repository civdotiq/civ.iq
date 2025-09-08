/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Memory Cache Service Implementation
 *
 * In-memory cache (L1) with TTL support and automatic cleanup.
 * Optimized for high-frequency, short-term caching (100ms-1s TTL).
 */

import type { ICacheService, CacheOptions, CacheMetrics } from '../interfaces/ICacheService';

interface MemoryCacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

export class MemoryCacheService implements ICacheService {
  private cache = new Map<string, MemoryCacheEntry<unknown>>();
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private cleanupIntervalMs = 30000) {
    this.startCleanup();
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key) as MemoryCacheEntry<T> | undefined;

    if (!entry) {
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.updateHitRate();
      return null;
    }

    this.metrics.hits++;
    this.updateHitRate();
    return entry.value;
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttlMs ?? 100; // Default 100ms for L1 cache
    const tags = options.tags ?? [];

    const entry: MemoryCacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl,
      tags,
    };

    this.cache.set(key, entry);
    this.metrics.sets++;
  }

  async delete(key: string): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.metrics.deletes++;
    }
    return deleted;
  }

  async deleteByPattern(pattern: string): Promise<number> {
    let deletedCount = 0;
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));

    for (const key of Array.from(this.cache.keys())) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
        this.metrics.deletes++;
      }
    }

    return deletedCount;
  }

  async deleteByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      const hasAnyTag = tags.some(tag => entry.tags.includes(tag));
      if (hasAnyTag) {
        this.cache.delete(key);
        deletedCount++;
        this.metrics.deletes++;
      }
    }

    return deletedCount;
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      hitRate: 0,
    };
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async getMetrics(): Promise<CacheMetrics> {
    return { ...this.metrics };
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache
    const value = await fetcher();
    await this.set(key, value, options);
    return value;
  }

  /**
   * Get current cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys (for debugging)
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  private isExpired(entry: MemoryCacheEntry<unknown>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private updateHitRate(): void {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? this.metrics.hits / total : 0;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, this.cleanupIntervalMs);

    // Don't keep the process alive just for cleanup
    this.cleanupTimer.unref?.();
  }

  private cleanupExpired(): void {
    const now = Date.now();

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

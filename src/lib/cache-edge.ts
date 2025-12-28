/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Edge Runtime compatible caching solution
 * Uses in-memory storage with TTL support
 */

import { monitorCache } from './monitoring/telemetry-edge';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class EdgeCache {
  private cache = new Map<string, CacheEntry<any>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Clean up expired entries every 5 minutes
    if (typeof setInterval !== 'undefined') {
      this.cleanupInterval = setInterval(
        () => {
          this.cleanup();
        },
        5 * 60 * 1000
      );
    }
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
      }
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const monitor = monitorCache('get', key);

    try {
      const entry = this.cache.get(key);
      if (!entry) {
        monitor.end(false);
        return null;
      }

      const now = Date.now();
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.cache.delete(key);
        monitor.end(false);
        return null;
      }

      monitor.end(true);
      return entry.data as T;
    } catch (error) {
      monitor.end(false, error as Error);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlSeconds: number = 3600): Promise<boolean> {
    const monitor = monitorCache('set', key);

    try {
      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      });
      monitor.end(true);
      return true;
    } catch (error) {
      monitor.end(false, error as Error);
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    return this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }
}

// Global cache instance
const edgeCache = new EdgeCache();

// Edge Runtime compatible cached fetch function
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  try {
    // Try to get from cache first
    const cached = await edgeCache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Cache miss - fetch new data
    const data = await fetchFn();

    // Store in cache
    await edgeCache.set(key, data, ttlSeconds);

    return data;
  } catch (error) {
    console.error('Cache operation failed:', error);
    // Fall back to direct fetch on cache error
    return await fetchFn();
  }
}

// Export cache instance for direct access if needed
export { edgeCache };

// Cache utility functions
export const cacheUtils = {
  clear: () => edgeCache.clear(),
  getStats: () => edgeCache.getStats(),
  delete: (key: string) => edgeCache.delete(key),
};

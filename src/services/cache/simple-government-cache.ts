// src/services/cache/simple-government-cache.ts
// START HERE - This won't break anything and provides immediate benefits

/**
 * Simple in-memory cache for government API data
 * No external dependencies required - works immediately
 * Upgrade to Redis later for production
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  source: string;
  expiresAt: number;
}

class SimpleGovernmentCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 30 * 60 * 1000; // 30 minutes

  // Different TTLs for different data types (in milliseconds)
  private readonly ttls = {
    representatives: 30 * 60 * 1000, // 30 minutes
    voting: 15 * 60 * 1000, // 15 minutes
    finance: 24 * 60 * 60 * 1000, // 24 hours
    districts: 7 * 24 * 60 * 60 * 1000, // 7 days
    committees: 60 * 60 * 1000, // 1 hour
  };

  /**
   * Get cached data if available and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      console.log(`[Cache MISS] ${key}`);
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      console.log(`[Cache EXPIRED] ${key}`);
      this.cache.delete(key);
      return null;
    }

    console.log(`[Cache HIT] ${key} (source: ${entry.source})`);
    return entry.data;
  }

  /**
   * Store data in cache with TTL
   */
  set<T>(
    key: string,
    data: T,
    options?: {
      ttl?: number;
      source?: string;
      dataType?: keyof typeof SimpleGovernmentCache.prototype.ttls;
    }
  ): void {
    const ttl =
      options?.ttl ||
      (options?.dataType ? this.ttls[options.dataType] : undefined) ||
      this.DEFAULT_TTL;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      source: options?.source || 'unknown',
      expiresAt: Date.now() + ttl,
    };

    this.cache.set(key, entry);
    console.log(`[Cache SET] ${key} (TTL: ${ttl / 1000}s, source: ${entry.source})`);
  }

  /**
   * Clear specific keys or entire cache
   */
  clear(pattern?: string): void {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      console.log(`[Cache CLEAR] Removed all ${size} entries`);
      return;
    }

    let cleared = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    console.log(`[Cache CLEAR] Removed ${cleared} entries matching "${pattern}"`);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    for (const entry of this.cache.values()) {
      if (entry.expiresAt < now) {
        expired++;
      } else {
        active++;
      }

      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }
    }

    return {
      totalEntries: this.cache.size,
      activeEntries: active,
      expiredEntries: expired,
      oldestEntry: oldestEntry ? new Date(oldestEntry).toISOString() : null,
      newestEntry: newestEntry ? new Date(newestEntry).toISOString() : null,
      memorySizeEstimate: JSON.stringify(Array.from(this.cache.entries())).length,
    };
  }

  /**
   * Clean up expired entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      console.log(`[Cache CLEANUP] Removed ${removed} expired entries`);
    }
  }
}

// Create singleton instance
export const govCache = new SimpleGovernmentCache();

// Run cleanup every 5 minutes
if (typeof window === 'undefined') {
  // Only on server
  setInterval(() => govCache.cleanup(), 5 * 60 * 1000);
}

/**
 * Generic cached fetch helper
 */
export async function cachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number;
    source?: string;
    dataType?: keyof (typeof govCache)['ttls'];
  }
): Promise<T> {
  // Try cache first
  const cached = govCache.get<T>(cacheKey);
  if (cached) return cached;

  // Fetch fresh data
  const fresh = await fetcher();

  // Cache for next time
  govCache.set(cacheKey, fresh, options);

  return fresh;
}

// Type definitions for better TypeScript support
export interface CacheOptions {
  ttl?: number;
  source?: string;
  dataType?: 'representatives' | 'voting' | 'finance' | 'districts' | 'committees';
}

export interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  expiredEntries: number;
  oldestEntry: string | null;
  newestEntry: string | null;
  memorySizeEstimate: number;
}

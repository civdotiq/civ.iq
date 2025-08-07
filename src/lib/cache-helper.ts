/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import logger from '@/lib/logging/simple-logger';

// Simple in-memory cache to prevent API rate limits
const cache = new Map<string, { data: unknown; time: number }>();

/**
 * Cache wrapper that provides stale-while-revalidate functionality
 * @param key - Unique cache key
 * @param fetcher - Function that fetches fresh data
 * @param ttl - Time to live in milliseconds (default: 24 hours)
 * @returns Promise that resolves to cached or fresh data
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 86400000 // 24 hours default
): Promise<T> {
  const cached = cache.get(key);
  const now = Date.now();

  // Return fresh cache if available and not expired
  if (cached && now - cached.time < ttl) {
    return cached.data as T;
  }

  try {
    // Fetch fresh data
    const data = await fetcher();
    cache.set(key, { data, time: now });
    return data;
  } catch (error) {
    // Return stale data if available, otherwise rethrow error
    if (cached) {
      logger.warn('Returning stale cached data due to fetch error', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      return cached.data as T;
    }
    throw error;
  }
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries
 */
export function clearAllCache(): void {
  cache.clear();
}

/**
 * Get cache stats for debugging
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

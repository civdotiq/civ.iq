/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cache adapter interface for the entity-resolution package.
 * Consumers provide their own cache via setCache() or configure().
 * Default is a no-op cache (always misses).
 */
export interface CacheAdapter {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}

const noopCache: CacheAdapter = {
  get: async () => null,
  set: async () => {},
};

let currentCache: CacheAdapter = noopCache;

/** Set the cache adapter implementation for this package. */
export function setCache(cache: CacheAdapter): void {
  currentCache = cache;
}

/** Get the current cache adapter. */
export function getCache(): CacheAdapter {
  return currentCache;
}

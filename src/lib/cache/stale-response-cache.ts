/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Stale Response Cache
 *
 * Stores last successful API response per endpoint key with timestamp.
 * When an upstream government API fails, serves the last-known-good data
 * with a staleness timestamp instead of an error wall.
 */

import { getRedisCache } from './redis-client';
import logger from '@/lib/logging/simple-logger';

const STALE_PREFIX = 'stale:response:';
const STALE_TTL = 7 * 24 * 60 * 60; // 7 days

export interface StaleResponseEntry<T = unknown> {
  data: T;
  fetchedAt: string;
  source: string;
}

/** Store a successful API response for stale fallback */
export async function storeResponse<T>(
  endpointKey: string,
  data: T,
  source: string
): Promise<void> {
  try {
    const cache = getRedisCache();
    const entry: StaleResponseEntry<T> = {
      data,
      fetchedAt: new Date().toISOString(),
      source,
    };
    await cache.set(`${STALE_PREFIX}${endpointKey}`, entry, STALE_TTL);
  } catch {
    // Fire-and-forget — stale cache storage should never block
  }
}

/** Retrieve last-known-good response when upstream fails */
export async function getStaleResponse<T>(
  endpointKey: string
): Promise<StaleResponseEntry<T> | null> {
  try {
    const cache = getRedisCache();
    const entry = await cache.get<StaleResponseEntry<T>>(`${STALE_PREFIX}${endpointKey}`);
    if (entry) {
      logger.info('Serving stale response', {
        endpointKey,
        fetchedAt: entry.fetchedAt,
        source: entry.source,
        operation: 'stale_cache',
      });
    }
    return entry;
  } catch {
    return null;
  }
}

/**
 * Wrapper: attempt a fetch, store on success, return stale on failure.
 * Returns { data, stale: boolean, staleSince?: string }
 */
export async function fetchWithStaleFallback<T>(
  endpointKey: string,
  fetcher: () => Promise<T>,
  source: string
): Promise<{ data: T; stale: boolean; staleSince?: string } | null> {
  try {
    const data = await fetcher();
    // Store for future stale fallback (fire-and-forget)
    storeResponse(endpointKey, data, source).catch(() => {});
    return { data, stale: false };
  } catch (error) {
    logger.warn('Upstream fetch failed, checking stale cache', {
      endpointKey,
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'stale_cache',
    });

    const staleEntry = await getStaleResponse<T>(endpointKey);
    if (staleEntry) {
      return {
        data: staleEntry.data,
        stale: true,
        staleSince: staleEntry.fetchedAt,
      };
    }

    return null;
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Graph neighborhood Redis caching.
 * Uses existing RedisCache singleton with graph-specific key prefixes.
 *
 * Cache key: graph:nbr:{nodeId}
 * TTL: 24 hours
 * Typical size: ~20-40KB per neighborhood
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import type { GraphNeighborhood } from '@/types/graph';

/** 24 hours in seconds */
const NEIGHBORHOOD_TTL = 24 * 60 * 60;

/** Cache key prefix for graph neighborhoods */
const CACHE_PREFIX = 'graph:nbr:';

export async function getCachedNeighborhood(nodeId: string): Promise<GraphNeighborhood | null> {
  try {
    const cache = getRedisCache();
    return await cache.get<GraphNeighborhood>(`${CACHE_PREFIX}${nodeId}`);
  } catch (error) {
    logger.warn('[Graph] Cache read failed', { nodeId, error: String(error) });
    return null;
  }
}

export async function setCachedNeighborhood(
  nodeId: string,
  neighborhood: GraphNeighborhood
): Promise<void> {
  try {
    const cache = getRedisCache();
    await cache.set(`${CACHE_PREFIX}${nodeId}`, neighborhood, NEIGHBORHOOD_TTL);
  } catch (error) {
    logger.warn('[Graph] Cache write failed', { nodeId, error: String(error) });
  }
}

export async function invalidateNeighborhood(nodeId: string): Promise<void> {
  try {
    const cache = getRedisCache();
    await cache.delete(`${CACHE_PREFIX}${nodeId}`);
  } catch (error) {
    logger.warn('[Graph] Cache invalidate failed', { nodeId, error: String(error) });
  }
}

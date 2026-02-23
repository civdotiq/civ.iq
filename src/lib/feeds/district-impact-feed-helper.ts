/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Impact Feed Helper
 *
 * Reads cached district impact data from Redis for feed generation.
 * NEVER triggers AI generation — returns only pre-cached impacts.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import type { DistrictImpact } from '@/types/district-impact';
import type { AtomEntry } from '@/lib/feeds/atom-generator';
import logger from '@/lib/logging/simple-logger';

// Redis key prefix used by RedisCache
const REDIS_PREFIX = 'civiq:';

/**
 * Fetch cached district impacts and convert to Atom entries.
 * Read-only: never triggers AI generation from the feed path.
 */
export async function getCachedDistrictImpactEntries(
  districtId: string,
  baseUrl: string
): Promise<AtomEntry[]> {
  const entries: AtomEntry[] = [];

  try {
    const redis = getRedisCache();

    // keys() passes pattern directly to Redis (includes prefix)
    // get() adds prefix internally, so we strip it from keys results
    const pattern = `${REDIS_PREFIX}district-impact:*:${districtId}`;
    const rawKeys = await redis.keys(pattern);

    if (!rawKeys || rawKeys.length === 0) {
      return entries;
    }

    // Strip prefix for get() calls (which add it back internally)
    const cacheKeys = rawKeys
      .map(k => (k.startsWith(REDIS_PREFIX) ? k.slice(REDIS_PREFIX.length) : k))
      .slice(0, 10);

    for (const key of cacheKeys) {
      try {
        const impact = await redis.get<DistrictImpact>(key);
        if (!impact) continue;

        entries.push({
          id: `${baseUrl}/districts/${districtId}#impact-${impact.billId}`,
          title: `Bill Impact: ${impact.billId} — ${impact.overallImpact}`,
          link: `${baseUrl}/bill/${impact.billId}`,
          updated: new Date(),
          summary: impact.summary,
          categories: [
            { term: 'district-impact', label: 'District Impact' },
            { term: impact.overallImpact.toLowerCase(), label: impact.overallImpact },
          ],
        });
      } catch {
        // Skip individual cache read failures
      }
    }

    if (entries.length > 0) {
      logger.info('Loaded cached district impacts for feed', {
        districtId,
        impactCount: entries.length,
      });
    }
  } catch {
    // Redis unavailable — return empty, feed continues without impacts
  }

  return entries;
}

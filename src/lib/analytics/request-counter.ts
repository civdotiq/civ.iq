/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request Analytics — Upstash Redis Counters
 *
 * Fire-and-forget request counting for API usage analytics.
 * Never blocks responses. 30-day TTL on all counter keys.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    // cache: 'default' — the SDK's 'no-store' default breaks ISR renders
    // (app-static-to-dynamic-error); POSTs are never data-cached anyway.
    redis = new Redis({ url, token, cache: 'default' });
    return redis;
  } catch {
    return null;
  }
}

const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/**
 * Increment a request counter. Fire-and-forget — errors are silently ignored.
 * Key format: analytics:requests:{date}:{path}:{method}:{status}
 */
export function incrementRequestCounter(path: string, method: string, statusCode: number): void {
  const client = getRedis();
  if (!client) return;

  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const normalizedPath = normalizePath(path);
  const key = `analytics:requests:${date}:${normalizedPath}:${method}:${statusCode}`;

  // Fire and forget — never awaited, never blocks
  client.incr(key).then(
    // Set TTL only on first increment (when value is 1)
    val => {
      if (val === 1) {
        client.expire(key, TTL_SECONDS).catch(() => {});
      }
    },
    () => {} // Silently ignore errors
  );
}

/**
 * Normalize path to collapse dynamic segments for aggregation.
 * e.g., /api/v1/representatives/P000197 → /api/v1/representatives/:id
 */
function normalizePath(path: string): string {
  return path
    .replace(/\/[A-Z]\d{6}/gi, '/:id') // bioguide IDs
    .replace(/\/\d+-[a-z]+-\d+/gi, '/:billId') // bill IDs like 119-hr-1
    .replace(/\/[A-Z]{2}-(\d{1,2}|AL)/gi, '/:districtId') // district IDs
    .replace(/\/(house|senate)-\d+-\d+/gi, '/:voteId') // vote IDs
    .replace(/\/[A-Z]{2,6}(?=\/|$)/g, '/:committeeId'); // committee codes
}

/**
 * Get request counts for a date range. Used by the analytics endpoint.
 */
export async function getRequestCounts(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const client = getRedis();
  if (!client) return {};

  const counts: Record<string, number> = {};

  // Iterate through dates in range
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const date = d.toISOString().slice(0, 10);
    const pattern = `analytics:requests:${date}:*`;

    try {
      const keys = await client.keys(pattern);
      for (const key of keys) {
        const val = await client.get<number>(key);
        if (val) {
          // Extract path from key for aggregation
          const parts = key.split(':');
          const path = parts[3] || 'unknown';
          counts[path] = (counts[path] || 0) + val;
        }
      }
    } catch {
      // Skip dates with errors
    }
  }

  return counts;
}

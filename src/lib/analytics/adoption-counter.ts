/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Adoption Counters — Upstash Redis
 *
 * Persists the adoption signals that adoption-telemetry.ts only logs, so
 * scripts/stats.ts can report MCP client and SDK usage without a log drain.
 * Fire-and-forget like request-counter.ts: never awaited, never throws,
 * never blocks a response. 90-day TTL on all counter keys.
 *
 * Key formats:
 *   analytics:adoption:mcp:{YYYY-MM-DD}:{clientName}
 *   analytics:adoption:sdk:{YYYY-MM-DD}:{version}
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return null;

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

const TTL_SECONDS = 90 * 24 * 60 * 60; // 90 days

/** Colons delimit key segments; whitespace breaks `keys` pattern scans. */
function sanitizeSegment(value: string): string {
  return value.replace(/[:\s]+/g, '-').slice(0, 64) || 'unknown';
}

function increment(key: string): void {
  const client = getRedis();
  if (!client) return;

  client.incr(key).then(
    val => {
      if (val === 1) {
        client.expire(key, TTL_SECONDS).catch(() => {});
      }
    },
    () => {} // Silently ignore errors
  );
}

/** Count an MCP initialize handshake by client name (e.g. claude-ai, cursor). */
export function incrementMcpInitialize(clientName: string): void {
  const date = new Date().toISOString().slice(0, 10);
  increment(`analytics:adoption:mcp:${date}:${sanitizeSegment(clientName)}`);
}

/** Count a REST request that carried an @civiq/sdk User-Agent signature. */
export function incrementSdkRequest(version: string): void {
  const date = new Date().toISOString().slice(0, 10);
  increment(`analytics:adoption:sdk:${date}:${sanitizeSegment(version)}`);
}

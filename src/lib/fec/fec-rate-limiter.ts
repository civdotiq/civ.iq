/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC shared-key rate limiter.
 *
 * Every Vercel function shares one FEC_API_KEY, so per-process throttling is
 * useless — bursts from background crons can drain the key's per-minute quota
 * and starve live user requests (observed live `X-RateLimit-Limit: 60`). This
 * module keeps a single per-minute counter in Redis (strongly consistent on the
 * Upstash primary, so atomic `INCR` counts correctly across all instances) and
 * gives live traffic priority over crons:
 *
 *   - 'live'  → always allowed; only records consumption so crons can see it.
 *   - 'cron'  → allowed while the minute's total stays under the cron ceiling,
 *               otherwise paces (short waits) and finally yields the call.
 *
 * Priority is carried implicitly through AsyncLocalStorage: cron routes wrap
 * their work in `runWithFecPriority('cron', ...)` and every nested FEC call —
 * however deep — picks it up with no signature changes. Fails open (allows the
 * call) whenever Redis is unavailable; the FEC 429 + backoff path is the real
 * backstop.
 *
 * Tuning: raise `FEC_CRON_BUDGET_PER_MIN` after the key limit is lifted via
 * APIinfo@fec.gov (60/min → 120/min).
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { Redis } from '@upstash/redis';
import logger from '@/lib/logging/simple-logger';

export type FecPriority = 'live' | 'cron';

const priorityStore = new AsyncLocalStorage<FecPriority>();

/** Run `fn` (and every FEC call it triggers) under the given priority. */
export function runWithFecPriority<T>(priority: FecPriority, fn: () => Promise<T>): Promise<T> {
  return priorityStore.run(priority, fn);
}

/** Current priority for this async context. Defaults to 'live'. */
export function getFecPriority(): FecPriority {
  return priorityStore.getStore() ?? 'live';
}

const WINDOW_SECONDS = 60;
const CRON_MAX_WAITS = 5;
const CRON_WAIT_MS = 800;
const DEFAULT_CRON_BUDGET = 30; // leave headroom under the observed 60/min key limit

function cronCeiling(): number {
  const raw = process.env.FEC_CRON_BUDGET_PER_MIN;
  if (!raw) return DEFAULT_CRON_BUDGET;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_CRON_BUDGET;
}

let redis: Redis | null = null;
let redisChecked = false;
function getRedis(): Redis | null {
  if (redisChecked) return redis;
  redisChecked = true;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      // cache: 'default' (not the SDK's 'no-store' default) — a no-store fetch
      // inside an ISR render throws app-static-to-dynamic-error (500'd every
      // record card 2026-07-12). Upstash commands are POSTs, which Next's
      // data cache never stores, so 'default' is safe: uncached in practice,
      // invisible to the static/dynamic tracker.
      redis = Redis.fromEnv({ cache: 'default' });
    } catch (error) {
      logger.warn('[FEC RL] Redis unavailable — rate limiter disabled (fail-open)', {
        error: (error as Error).message,
      });
      redis = null;
    }
  }
  return redis;
}

function windowKey(): string {
  const bucket = Math.floor(Date.now() / 1000 / WINDOW_SECONDS);
  return `fec:rl:${bucket}`;
}

export interface FecReservation {
  allowed: boolean;
  count: number;
  ceiling: number;
}

/**
 * Reserve one FEC call against the shared per-minute budget. Live calls are
 * never blocked (they only increment the counter); cron calls pace and yield
 * once the minute's total reaches the cron ceiling. Fails open on Redis errors.
 */
export async function reserveFecCall(
  priority: FecPriority = getFecPriority()
): Promise<FecReservation> {
  const client = getRedis();
  const ceiling = cronCeiling();
  if (!client) return { allowed: true, count: 0, ceiling };

  const maxAttempts = priority === 'cron' ? CRON_MAX_WAITS : 0;

  for (let attempt = 0; attempt <= maxAttempts; attempt++) {
    try {
      const key = windowKey();
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, WINDOW_SECONDS + 5);

      if (priority === 'live' || count <= ceiling) {
        return { allowed: true, count, ceiling };
      }

      // Over the cron ceiling — hand the token back so live keeps its headroom,
      // then pace before retrying (the window may roll over and free up budget).
      await client.decr(key);
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, CRON_WAIT_MS));
        continue;
      }
      return { allowed: false, count, ceiling };
    } catch (error) {
      logger.warn('[FEC RL] reserve failed — allowing call (fail-open)', {
        error: (error as Error).message,
      });
      return { allowed: true, count: 0, ceiling };
    }
  }

  return { allowed: false, count: ceiling, ceiling };
}

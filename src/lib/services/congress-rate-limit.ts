/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Congress.gov rate-limit breaker.
 *
 * The API key allows 20,000 requests an hour. Once Congress.gov answers 429,
 * every further call until the window resets is wasted, and a bill assembled
 * from 429'd sub-requests looks like a bill with no cosponsors or actions.
 * The first 429 sets a shared flag; while it is set, callers skip
 * Congress.gov and report the data as unavailable instead.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';

const FLAG_KEY = 'congress:rate-limited';
const DEFAULT_PAUSE_SECONDS = 600;
const MIN_PAUSE_SECONDS = 60;
const MAX_PAUSE_SECONDS = 3600;

/** In-process copy of the flag so a warm instance doesn't ask Redis every time. */
let blockedUntil = 0;

export class CongressRateLimitError extends Error {
  constructor() {
    super('Congress.gov rate limit reached');
    this.name = 'CongressRateLimitError';
  }
}

function pauseSeconds(retryAfter: string | null): number {
  const seconds = Number(retryAfter);
  if (!Number.isFinite(seconds) || seconds <= 0) return DEFAULT_PAUSE_SECONDS;
  return Math.min(MAX_PAUSE_SECONDS, Math.max(MIN_PAUSE_SECONDS, Math.ceil(seconds)));
}

/** True while a recent 429 says the key is out of requests. */
export async function isCongressRateLimited(now: number = Date.now()): Promise<boolean> {
  if (blockedUntil > now) return true;
  try {
    const until = await getRedisCache().get<number>(FLAG_KEY);
    if (typeof until === 'number' && until > now) {
      blockedUntil = until;
      return true;
    }
  } catch {
    // Redis down: fall through and let Congress.gov answer for itself.
  }
  return false;
}

/**
 * Call after every Congress.gov fetch. On a 429, sets the shared flag and
 * throws CongressRateLimitError; any other status passes through untouched.
 */
export async function throwIfCongressRateLimited(response: Response): Promise<void> {
  if (response.status !== 429) return;

  const pause = pauseSeconds(response.headers?.get('retry-after') ?? null);
  const until = Date.now() + pause * 1000;
  blockedUntil = until;
  logger.warn('Congress.gov rate limit reached; pausing upstream calls', {
    pauseSeconds: pause,
  });
  try {
    await getRedisCache().set(FLAG_KEY, until, pause);
  } catch {
    // The in-process flag still protects this instance.
  }
  throw new CongressRateLimitError();
}

/** Test hook: forget the in-process flag. */
export function _resetForTesting(): void {
  blockedUntil = 0;
}

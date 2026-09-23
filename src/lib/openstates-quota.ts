/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * OpenStates daily-quota flag, shared by every OpenStates caller.
 *
 * OpenStates enforces 40/min AND 1000/day. A per-minute 429 is worth a retry;
 * a daily-quota 429 is not — every retry is another rejected call that still
 * counts. When the body says the daily limit is gone, remember that until the
 * quota resets at 00:00 UTC and stop calling OpenStates for the rest of the day.
 */

import { cache } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

export const OPENSTATES_QUOTA_FLAG = 'openstates:daily-quota-exhausted';

/** Thrown instead of calling OpenStates while the daily quota is exhausted. */
export class OpenStatesQuotaExhaustedError extends Error {
  constructor(detail = 'OpenStates daily quota exhausted') {
    super(detail);
    this.name = 'OpenStatesQuotaExhaustedError';
  }
}

/** True when a 429 body is the daily cap ("exceeded limit of 1000/day"). */
export function isDailyQuotaBody(body: string): boolean {
  return /\/day/.test(body);
}

export function secondsUntilUtcMidnight(now: Date = new Date()): number {
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
  return Math.max(60, Math.ceil((next - now.getTime()) / 1000));
}

export async function isDailyQuotaExhausted(): Promise<boolean> {
  try {
    return (await cache?.get<boolean>(OPENSTATES_QUOTA_FLAG)) === true;
  } catch {
    return false;
  }
}

export async function markDailyQuotaExhausted(detail: string): Promise<void> {
  logger.warn('OpenStates daily quota exhausted; skipping OpenStates until 00:00 UTC', {
    detail,
  });
  try {
    await cache?.set(OPENSTATES_QUOTA_FLAG, true, secondsUntilUtcMidnight());
  } catch {
    // Flag is an optimisation; failing to store it only costs extra rejected calls.
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared Data.gov Rate Limiter
 *
 * All services using DATA_GOV_API_KEY share the same 1,000 req/hour quota.
 * This module provides a single rate-limited fetch that enforces:
 *   - 400ms minimum interval between requests
 *   - 1,000 requests per sliding 1-hour window
 *
 * Used by: Regulations.gov, FBI UCR, College Scorecard (future)
 */

import logger from '@/lib/logging/simple-logger';

const MAX_REQUESTS_PER_HOUR = 1000;
const WINDOW_MS = 3_600_000; // 1 hour
const MIN_INTERVAL_MS = 400;

const requestTimestamps: number[] = [];
let lastRequestTime = 0;

/**
 * Get the shared Data.gov API key from environment.
 */
export function getDataGovApiKey(): string | null {
  return process.env.DATA_GOV_API_KEY ?? null;
}

/**
 * Rate-limited fetch for any Data.gov API endpoint.
 * Enforces both per-request interval and hourly quota.
 */
export async function dataGovRateLimitedFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  // Enforce minimum interval between requests
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }

  // Prune timestamps outside the sliding window
  const windowStart = Date.now() - WINDOW_MS;
  while (requestTimestamps.length > 0 && requestTimestamps[0]! < windowStart) {
    requestTimestamps.shift();
  }

  // If at hourly capacity, wait for the oldest request to expire
  if (requestTimestamps.length >= MAX_REQUESTS_PER_HOUR) {
    const waitUntil = requestTimestamps[0]! + WINDOW_MS;
    const waitMs = waitUntil - Date.now();
    if (waitMs > 0) {
      logger.warn('Data.gov hourly rate limit reached, waiting', { waitMs });
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
    requestTimestamps.shift();
  }

  lastRequestTime = Date.now();
  requestTimestamps.push(lastRequestTime);

  const headers = new Headers(init?.headers);
  if (!headers.has('User-Agent')) {
    headers.set('User-Agent', 'CIV.IQ/1.0 (Civic Intelligence Platform)');
  }

  return fetch(url, {
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(30_000),
  });
}

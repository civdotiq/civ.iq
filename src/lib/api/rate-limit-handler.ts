/**
 * Rate Limit Handler
 * Retries requests on 429 Too Many Requests with exponential backoff.
 * Parses Retry-After header (seconds or HTTP-date) to determine delay.
 */

import logger from '@/lib/logging/simple-logger';

/**
 * Error thrown when all retries are exhausted due to rate limiting.
 * Circuit breakers should NOT count this as a failure.
 */
export class RateLimitError extends Error {
  readonly status = 429;
  readonly retryAfter: number | null;

  constructor(url: string, retryAfter: number | null, attempts: number) {
    super(
      `Rate limited after ${attempts} attempt(s): ${url}` +
        (retryAfter != null ? ` (retry-after: ${retryAfter}s)` : '')
    );
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export interface FetchWithRetryConfig {
  /** Maximum number of retries after the initial request (default: 3) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 1000) */
  baseDelayMs?: number;
}

/**
 * Parse the Retry-After header value into milliseconds.
 * Supports both delta-seconds ("120") and HTTP-date ("Wed, 21 Oct 2025 07:28:00 GMT").
 */
function parseRetryAfter(header: string | null): number | null {
  if (!header) return null;

  // Try as integer seconds first
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return seconds * 1000;
  }

  // Try as HTTP-date
  const date = new Date(header);
  if (!isNaN(date.getTime())) {
    const delayMs = date.getTime() - Date.now();
    return Math.max(0, delayMs);
  }

  return null;
}

/**
 * Fetch with automatic retry on 429 Too Many Requests.
 *
 * - Checks for status 429 or X-RateLimit-Remaining: 0
 * - Parses Retry-After header to determine delay
 * - Falls back to exponential backoff: baseDelayMs * 2^attempt
 * - Throws RateLimitError after maxRetries exhausted
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  config?: FetchWithRetryConfig
): Promise<Response> {
  const maxRetries = config?.maxRetries ?? 3;
  const baseDelayMs = config?.baseDelayMs ?? 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, options);

    // Check for rate limiting
    const isRateLimited =
      response.status === 429 || response.headers.get('X-RateLimit-Remaining') === '0';

    if (!isRateLimited) {
      return response;
    }

    // Last attempt — don't retry, throw
    if (attempt === maxRetries) {
      const retryAfterHeader = response.headers.get('Retry-After');
      const retryAfterSeconds = retryAfterHeader ? parseRetryAfter(retryAfterHeader) : null;

      throw new RateLimitError(
        url,
        retryAfterSeconds != null ? retryAfterSeconds / 1000 : null,
        attempt + 1
      );
    }

    // Calculate delay
    const retryAfterMs = parseRetryAfter(response.headers.get('Retry-After'));
    const backoffMs = baseDelayMs * Math.pow(2, attempt);
    const delayMs = retryAfterMs ?? backoffMs;

    logger.warn(
      `Rate limited (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delayMs}ms`,
      {
        url,
        status: response.status,
        retryAfterMs,
        backoffMs,
      }
    );

    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  // Unreachable, but TypeScript needs it
  throw new RateLimitError(url, null, maxRetries + 1);
}

/**
 * Request Deduplication Service
 *
 * Prevents duplicate concurrent API calls when multiple users request the same data simultaneously.
 * Example: 5 users search for "Detroit, MI" at once → only 1 OpenStates API call is made
 *
 * Usage:
 * ```typescript
 * const result = await dedupe('state-legislator-MI-8-upper', async () => {
 *   return await openStatesAPI.getPerson(id);
 * });
 * ```
 */

// In-memory map of pending requests
const pendingRequests = new Map<string, Promise<unknown>>();

// Track deduplication metrics for monitoring
interface DedupeMetrics {
  totalRequests: number;
  dedupedRequests: number;
  uniqueKeys: Set<string>;
}

const metrics: DedupeMetrics = {
  totalRequests: 0,
  dedupedRequests: 0,
  uniqueKeys: new Set(),
};

/**
 * Deduplicate concurrent requests for the same resource
 *
 * @param key - Unique key identifying the request (e.g., "state-legislator-CA-1-upper")
 * @param fn - Async function that fetches the data
 * @returns Promise that resolves to the fetched data
 *
 * @example
 * ```typescript
 * // Multiple concurrent calls with same key will only execute fn once
 * const data1 = dedupe('user-123', () => fetchUser(123));
 * const data2 = dedupe('user-123', () => fetchUser(123)); // Reuses first call
 * ```
 */
export async function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  metrics.totalRequests++;
  metrics.uniqueKeys.add(key);

  // Check if a request for this key is already pending
  const existing = pendingRequests.get(key);
  if (existing) {
    metrics.dedupedRequests++;
    return existing as Promise<T>;
  }

  // No pending request - create one
  const promise = fn().finally(() => {
    // Clean up after request completes (success or failure)
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

/**
 * Get deduplication metrics for monitoring
 */
export function getDedupeMetrics() {
  const savingsPercent =
    metrics.totalRequests > 0
      ? ((metrics.dedupedRequests / metrics.totalRequests) * 100).toFixed(1)
      : '0.0';

  return {
    ...metrics,
    uniqueKeys: metrics.uniqueKeys.size,
    savingsPercent: `${savingsPercent}%`,
    pendingCount: pendingRequests.size,
  };
}

/**
 * Reset metrics (useful for testing)
 */
export function resetDedupeMetrics() {
  metrics.totalRequests = 0;
  metrics.dedupedRequests = 0;
  metrics.uniqueKeys.clear();
}

/**
 * Clear all pending requests (useful for testing or forced refresh)
 */
export function clearPendingRequests() {
  pendingRequests.clear();
}

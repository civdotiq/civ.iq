/**
 * Request Coalescing Utility
 * Deduplicates simultaneous requests to the same resource
 * Prevents cache stampede and reduces API load
 */

import logger from '@/lib/logging/simple-logger';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestCoalescer {
  private pending = new Map<string, PendingRequest<unknown>>();
  private readonly MAX_PENDING_TIME = 30000; // 30 seconds max

  /**
   * Coalesce requests - if a request is already in flight, wait for it
   * instead of making a new one
   */
  async coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    // Check if there's already a pending request
    const existing = this.pending.get(key);

    if (existing) {
      const age = Date.now() - existing.timestamp;

      // If request is still fresh, reuse it
      if (age < this.MAX_PENDING_TIME) {
        logger.debug(`[Request Coalescer] Reusing pending request for ${key}`, { age });
        try {
          return (await existing.promise) as T;
        } catch (error) {
          // If the existing request failed, remove it and try again
          this.pending.delete(key);
          logger.warn('[Request Coalescer] Pending request failed, retrying', {
            key,
            error: (error as Error).message,
          });
        }
      } else {
        // Request is too old, remove it
        this.pending.delete(key);
        logger.warn('[Request Coalescer] Pending request expired, creating new one', {
          key,
          age,
        });
      }
    }

    // Create new request
    logger.debug(`[Request Coalescer] Creating new request for ${key}`);
    const promise = fetcher()
      .then(result => {
        // Clean up after successful completion
        this.pending.delete(key);
        return result;
      })
      .catch(error => {
        // Clean up after error
        this.pending.delete(key);
        throw error;
      });

    // Store the pending request
    this.pending.set(key, {
      promise,
      timestamp: Date.now(),
    });

    return promise as Promise<T>;
  }

  /**
   * Get statistics about pending requests
   */
  getStats() {
    const now = Date.now();
    const pendingRequests = Array.from(this.pending.entries()).map(([key, req]) => ({
      key,
      age: now - req.timestamp,
    }));

    return {
      total: this.pending.size,
      requests: pendingRequests,
      oldestAge: pendingRequests.length > 0 ? Math.max(...pendingRequests.map(r => r.age)) : 0,
    };
  }

  /**
   * Clear all pending requests (useful for testing)
   */
  clear() {
    this.pending.clear();
  }
}

// Export singleton instance
export const requestCoalescer = new RequestCoalescer();

/**
 * Helper function to wrap a fetch operation with coalescing
 */
export async function coalescedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  return requestCoalescer.coalesce(key, fetcher);
}

/**
 * Request Deduplication Service
 *
 * Prevents duplicate concurrent requests by returning the same promise
 * for identical requests. This significantly reduces load on government APIs
 * and improves response times for concurrent users.
 */

import { PerformanceTimer } from '@/lib/performance/api-timer';
import logger from '@/lib/logging/simple-logger';

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  requestCount: number;
}

interface DeduplicationMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  activePendingRequests: number;
  averageDeduplicationRatio: number;
  cacheCleanupCount: number;
}

export class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private metrics: DeduplicationMetrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    activePendingRequests: 0,
    averageDeduplicationRatio: 0,
    cacheCleanupCount: 0,
  };
  private cleanupInterval: NodeJS.Timeout;
  private readonly maxPendingAge = 30000; // 30 seconds
  private readonly cleanupIntervalMs = 10000; // 10 seconds

  constructor() {
    // Periodic cleanup of expired pending requests
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRequests();
    }, this.cleanupIntervalMs);
  }

  /**
   * Deduplicate a request by key. If an identical request is pending,
   * return the existing promise. Otherwise, execute the fetcher.
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      maxAge?: number;
      tags?: string[];
    } = {}
  ): Promise<T> {
    const timer = new PerformanceTimer(`RequestDeduplicator.${key}`);
    this.metrics.totalRequests++;

    try {
      // Check if we have a pending request for this key
      const existing = this.pendingRequests.get(key) as PendingRequest<T> | undefined;

      if (existing) {
        const age = Date.now() - existing.timestamp;
        const maxAge = options.maxAge ?? this.maxPendingAge;

        if (age < maxAge) {
          // Return existing promise and increment request count
          existing.requestCount++;
          this.metrics.deduplicatedRequests++;
          this.updateDeduplicationRatio();

          logger.info(
            `[DEDUP] Cache HIT for key '${key}' - ${existing.requestCount} concurrent requests`
          );

          timer.checkpoint('cache-hit');
          const result = await existing.promise;
          timer.end();
          return result;
        } else {
          // Expired, remove it
          this.pendingRequests.delete(key);
          this.metrics.activePendingRequests--;
        }
      }

      // Create new request
      timer.checkpoint('cache-miss');
      const promise = this.executeWithCleanup(key, fetcher);

      const pendingRequest: PendingRequest<T> = {
        promise,
        timestamp: Date.now(),
        requestCount: 1,
      };

      this.pendingRequests.set(key, pendingRequest as PendingRequest<unknown>);
      this.metrics.activePendingRequests++;

      logger.info(`[DEDUP] NEW request for key '${key}'`);

      const result = await promise;
      timer.end();
      return result;
    } catch (error) {
      // Remove failed request from pending
      this.pendingRequests.delete(key);
      this.metrics.activePendingRequests--;
      timer.end();
      throw error;
    }
  }

  /**
   * Execute fetcher and automatically clean up on completion
   */
  private async executeWithCleanup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    try {
      const result = await fetcher();
      return result;
    } finally {
      // Clean up after request completes
      setTimeout(() => {
        if (this.pendingRequests.has(key)) {
          this.pendingRequests.delete(key);
          this.metrics.activePendingRequests--;
        }
      }, 100); // Small delay to allow other pending requests to complete
    }
  }

  /**
   * Clear all pending requests for a specific pattern
   */
  clearPattern(pattern: string): number {
    let cleared = 0;
    const regex = new RegExp(pattern);

    for (const [key] of this.pendingRequests) {
      if (regex.test(key)) {
        this.pendingRequests.delete(key);
        this.metrics.activePendingRequests--;
        cleared++;
      }
    }

    logger.info(`[DEDUP] Cleared ${cleared} requests matching pattern '${pattern}'`);
    return cleared;
  }

  /**
   * Get current deduplication metrics
   */
  getMetrics(): DeduplicationMetrics {
    return {
      ...this.metrics,
    };
  }

  /**
   * Generate a cache key for typical API requests
   */
  static generateKey(
    method: string,
    url: string,
    params?: Record<string, unknown>,
    body?: unknown
  ): string {
    const paramString = params ? JSON.stringify(params) : '';
    const bodyString = body ? JSON.stringify(body) : '';
    return `${method}:${url}:${paramString}:${bodyString}`;
  }

  /**
   * Cleanup expired pending requests
   */
  private cleanupExpiredRequests(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, request] of this.pendingRequests) {
      if (now - request.timestamp > this.maxPendingAge) {
        this.pendingRequests.delete(key);
        this.metrics.activePendingRequests--;
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.metrics.cacheCleanupCount += cleaned;
      logger.debug(`[DEDUP] Cleaned up ${cleaned} expired requests`);
    }
  }

  /**
   * Update deduplication ratio metric
   */
  private updateDeduplicationRatio(): void {
    if (this.metrics.totalRequests > 0) {
      this.metrics.averageDeduplicationRatio =
        (this.metrics.deduplicatedRequests / this.metrics.totalRequests) * 100;
    }
  }

  /**
   * Clear all pending requests and metrics
   */
  clear(): void {
    this.pendingRequests.clear();
    this.metrics = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      activePendingRequests: 0,
      averageDeduplicationRatio: 0,
      cacheCleanupCount: 0,
    };
  }

  /**
   * Destroy deduplicator and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Global singleton instance
export const requestDeduplicator = new RequestDeduplicator();

// Utility function for easy deduplication
export async function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: { maxAge?: number; tags?: string[] }
): Promise<T> {
  return requestDeduplicator.deduplicate(key, fetcher, options);
}

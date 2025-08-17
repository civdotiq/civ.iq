/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Bill Summary Caching System
 *
 * Manages caching and storage of AI-generated bill summaries
 * with intelligent cache invalidation and performance optimization.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import logger from '@/lib/logging/simple-logger';
import type { BillSummary } from './bill-summarizer';

export interface BillSummaryCacheEntry {
  summary: BillSummary;
  metadata: {
    createdAt: string;
    lastAccessed: string;
    accessCount: number;
    billTextHash: string;
    version: string;
  };
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  averageAccessCount: number;
  oldestEntry: string;
  newestEntry: string;
  sizeEstimate: number; // in bytes
}

export class BillSummaryCache {
  private static readonly CACHE_VERSION = '1.0';
  private static readonly DEFAULT_TTL = 7 * 24 * 60 * 60; // 7 days in seconds
  private static readonly LONG_TTL = 30 * 24 * 60 * 60; // 30 days for stable bills
  private static readonly SHORT_TTL = 6 * 60 * 60; // 6 hours for recent bills

  private static readonly CACHE_PREFIXES = {
    summary: 'bill-summary:',
    metadata: 'bill-summary-meta:',
    stats: 'bill-summary-stats:',
    index: 'bill-summary-index',
    textHash: 'bill-text-hash:',
  };

  private static get cache() {
    return getRedisCache();
  }

  /**
   * Store a bill summary in cache with appropriate TTL
   */
  static async storeSummary(
    billId: string,
    summary: BillSummary,
    billTextHash: string,
    options: {
      ttl?: number;
      priority?: 'high' | 'medium' | 'low';
    } = {}
  ): Promise<void> {
    try {
      const ttl = this.calculateTTL(summary, options.priority);
      const cacheKey = this.CACHE_PREFIXES.summary + billId;
      const metadataKey = this.CACHE_PREFIXES.metadata + billId;

      const cacheEntry: BillSummaryCacheEntry = {
        summary,
        metadata: {
          createdAt: new Date().toISOString(),
          lastAccessed: new Date().toISOString(),
          accessCount: 0,
          billTextHash,
          version: this.CACHE_VERSION,
        },
      };

      // Store summary and metadata
      await Promise.all([
        this.cache.set(cacheKey, cacheEntry, ttl),
        this.cache.set(metadataKey, cacheEntry.metadata, ttl),
        this.cache.set(this.CACHE_PREFIXES.textHash + billId, billTextHash, ttl),
      ]);

      // Update index
      await this.updateCacheIndex(billId, 'add');

      logger.info('Bill summary cached successfully', {
        billId,
        ttl,
        confidence: summary.confidence,
        readingLevel: summary.readingLevel,
        operation: 'bill_summary_cache',
      });
    } catch (error) {
      logger.error('Failed to cache bill summary', error as Error, {
        billId,
        operation: 'bill_summary_cache',
      });
      throw error;
    }
  }

  /**
   * Retrieve a bill summary from cache
   */
  static async getSummary(billId: string): Promise<BillSummary | null> {
    try {
      const cacheKey = this.CACHE_PREFIXES.summary + billId;
      const metadataKey = this.CACHE_PREFIXES.metadata + billId;

      const [cacheEntry, metadata] = await Promise.all([
        this.cache.get<BillSummaryCacheEntry>(cacheKey),
        this.cache.get<BillSummaryCacheEntry['metadata']>(metadataKey),
      ]);

      if (!cacheEntry) {
        logger.debug('Bill summary cache miss', {
          billId,
          operation: 'bill_summary_cache',
        });
        return null;
      }

      // Update access metadata
      await this.updateAccessMetadata(billId, metadata || undefined);

      logger.info('Bill summary cache hit', {
        billId,
        confidence: cacheEntry.summary.confidence,
        readingLevel: cacheEntry.summary.readingLevel,
        operation: 'bill_summary_cache',
      });

      return cacheEntry.summary;
    } catch (error) {
      logger.error('Failed to retrieve bill summary from cache', error as Error, {
        billId,
        operation: 'bill_summary_cache',
      });
      return null;
    }
  }

  /**
   * Check if cached summary is still valid based on bill text changes
   */
  static async isSummaryValid(billId: string, currentBillTextHash: string): Promise<boolean> {
    try {
      const cachedHashKey = this.CACHE_PREFIXES.textHash + billId;
      const cachedHash = await this.cache.get<string>(cachedHashKey);

      if (!cachedHash) {
        return false;
      }

      const isValid = cachedHash === currentBillTextHash;

      logger.debug('Bill summary validation check', {
        billId,
        isValid,
        operation: 'bill_summary_cache',
      });

      return isValid;
    } catch (error) {
      logger.error('Failed to validate bill summary', error as Error, {
        billId,
        operation: 'bill_summary_cache',
      });
      return false;
    }
  }

  /**
   * Invalidate a specific bill summary
   */
  static async invalidateSummary(billId: string): Promise<void> {
    try {
      const keys = [
        this.CACHE_PREFIXES.summary + billId,
        this.CACHE_PREFIXES.metadata + billId,
        this.CACHE_PREFIXES.textHash + billId,
      ];

      await Promise.all(keys.map(key => this.cache.delete(key)));
      await this.updateCacheIndex(billId, 'remove');

      logger.info('Bill summary invalidated', {
        billId,
        operation: 'bill_summary_cache',
      });
    } catch (error) {
      logger.error('Failed to invalidate bill summary', error as Error, {
        billId,
        operation: 'bill_summary_cache',
      });
      throw error;
    }
  }

  /**
   * Get multiple summaries in batch
   */
  static async getBatchSummaries(billIds: string[]): Promise<Map<string, BillSummary>> {
    const results = new Map<string, BillSummary>();

    try {
      const cacheKeys = billIds.map(id => this.CACHE_PREFIXES.summary + id);
      const cachedEntries = await Promise.all(
        cacheKeys.map(key => this.cache.get<BillSummaryCacheEntry>(key))
      );

      for (let i = 0; i < billIds.length; i++) {
        const billId = billIds[i];
        const entry = cachedEntries[i];

        if (billId && entry?.summary) {
          results.set(billId, entry.summary);
          // Update access metadata asynchronously
          this.updateAccessMetadata(billId, entry.metadata).catch(err =>
            logger.warn('Failed to update access metadata', { billId, error: err })
          );
        }
      }

      logger.info('Batch bill summaries retrieved', {
        requested: billIds.length,
        found: results.size,
        hitRate: (results.size / billIds.length) * 100,
        operation: 'bill_summary_cache',
      });

      return results;
    } catch (error) {
      logger.error('Failed to retrieve batch summaries', error as Error, {
        billIds: billIds.slice(0, 5), // Log first 5 IDs only
        operation: 'bill_summary_cache',
      });
      return results;
    }
  }

  /**
   * Get cache statistics and performance metrics
   */
  static async getCacheStats(): Promise<CacheStats> {
    try {
      const indexKey = this.CACHE_PREFIXES.index;
      const billIds = (await this.cache.get<string[]>(indexKey)) || [];

      if (billIds.length === 0) {
        return {
          totalEntries: 0,
          hitRate: 0,
          averageAccessCount: 0,
          oldestEntry: '',
          newestEntry: '',
          sizeEstimate: 0,
        };
      }

      // Get metadata for all cached summaries
      const metadataKeys = billIds.map(id => this.CACHE_PREFIXES.metadata + id);
      const metadataEntries = await Promise.all(
        metadataKeys.map(key => this.cache.get<BillSummaryCacheEntry['metadata']>(key))
      );

      const validEntries = metadataEntries.filter(Boolean) as BillSummaryCacheEntry['metadata'][];

      // Calculate statistics
      const totalAccess = validEntries.reduce((sum, meta) => sum + meta.accessCount, 0);
      const avgAccessCount = validEntries.length > 0 ? totalAccess / validEntries.length : 0;

      const sortedByDate = validEntries.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Estimate size (rough calculation)
      const avgSummarySize = 2000; // Average summary size in bytes
      const sizeEstimate = validEntries.length * avgSummarySize;

      return {
        totalEntries: validEntries.length,
        hitRate: 0, // Would need separate tracking for hit rate
        averageAccessCount: Math.round(avgAccessCount * 100) / 100,
        oldestEntry: sortedByDate[0]?.createdAt || '',
        newestEntry: sortedByDate[sortedByDate.length - 1]?.createdAt || '',
        sizeEstimate,
      };
    } catch (error) {
      logger.error('Failed to get cache stats', error as Error, {
        operation: 'bill_summary_cache',
      });

      return {
        totalEntries: 0,
        hitRate: 0,
        averageAccessCount: 0,
        oldestEntry: '',
        newestEntry: '',
        sizeEstimate: 0,
      };
    }
  }

  /**
   * Clean up old or low-quality cache entries
   */
  static async cleanupCache(
    options: {
      maxAge?: number; // days
      minConfidence?: number;
      maxEntries?: number;
    } = {}
  ): Promise<{ removed: number; retained: number }> {
    const { maxAge = 30, minConfidence = 0.5, maxEntries = 1000 } = options;

    try {
      const indexKey = this.CACHE_PREFIXES.index;
      const billIds = (await this.cache.get<string[]>(indexKey)) || [];

      if (billIds.length === 0) {
        return { removed: 0, retained: 0 };
      }

      // Get metadata and summaries for evaluation
      const metadataKeys = billIds.map(id => this.CACHE_PREFIXES.metadata + id);
      const summaryKeys = billIds.map(id => this.CACHE_PREFIXES.summary + id);

      const [metadataEntries, summaryEntries] = await Promise.all([
        Promise.all(
          metadataKeys.map(key => this.cache.get<BillSummaryCacheEntry['metadata']>(key))
        ),
        Promise.all(summaryKeys.map(key => this.cache.get<BillSummaryCacheEntry>(key))),
      ]);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);

      const toRemove: string[] = [];

      for (let i = 0; i < billIds.length; i++) {
        const billId = billIds[i];
        const metadata = metadataEntries[i];
        const summary = summaryEntries[i];

        if (!billId || !metadata || !summary) {
          if (billId) toRemove.push(billId);
          continue;
        }

        const createdAt = new Date(metadata.createdAt);
        const isOld = createdAt < cutoffDate;
        const isLowConfidence = summary.summary.confidence < minConfidence;

        if (isOld || isLowConfidence) {
          toRemove.push(billId);
        }
      }

      // If still too many entries, remove least accessed
      if (billIds.length - toRemove.length > maxEntries) {
        const remaining = billIds.filter(id => !toRemove.includes(id));
        const remainingWithMetadata = remaining
          .map((id, _index) => ({
            id,
            metadata: metadataEntries[billIds.indexOf(id)],
          }))
          .filter(item => item.metadata)
          .sort((a, b) => a.metadata!.accessCount - b.metadata!.accessCount);

        const additionalToRemove = remainingWithMetadata
          .slice(0, Math.max(0, remainingWithMetadata.length - maxEntries))
          .map(item => item.id);

        toRemove.push(...additionalToRemove);
      }

      // Remove selected entries
      const removalPromises = toRemove.map(billId => this.invalidateSummary(billId));
      await Promise.all(removalPromises);

      const removed = toRemove.length;
      const retained = billIds.length - removed;

      logger.info('Cache cleanup completed', {
        removed,
        retained,
        totalBefore: billIds.length,
        maxAge,
        minConfidence,
        maxEntries,
        operation: 'bill_summary_cache',
      });

      return { removed, retained };
    } catch (error) {
      logger.error('Cache cleanup failed', error as Error, {
        operation: 'bill_summary_cache',
      });
      return { removed: 0, retained: 0 };
    }
  }

  /**
   * Calculate appropriate TTL based on bill and priority
   */
  private static calculateTTL(summary: BillSummary, priority?: string): number {
    // High confidence summaries can be cached longer
    if (summary.confidence > 0.9) {
      return this.LONG_TTL;
    }

    // High priority items get shorter TTL for freshness
    if (priority === 'high') {
      return this.SHORT_TTL;
    }

    // Default TTL
    return this.DEFAULT_TTL;
  }

  /**
   * Update access metadata for cache entry
   */
  private static async updateAccessMetadata(
    billId: string,
    existingMetadata?: BillSummaryCacheEntry['metadata']
  ): Promise<void> {
    try {
      const metadataKey = this.CACHE_PREFIXES.metadata + billId;

      let metadata = existingMetadata;
      if (!metadata) {
        metadata =
          (await this.cache.get<BillSummaryCacheEntry['metadata']>(metadataKey)) || undefined;
      }

      if (metadata) {
        metadata.lastAccessed = new Date().toISOString();
        metadata.accessCount += 1;

        // Update with extended TTL based on access pattern
        const newTTL = metadata.accessCount > 10 ? this.LONG_TTL : this.DEFAULT_TTL;
        await this.cache.set(metadataKey, metadata, newTTL);
      }
    } catch (error) {
      // Don't throw on metadata update failures
      logger.warn('Failed to update access metadata', {
        billId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Update the cache index
   */
  private static async updateCacheIndex(
    billId: string,
    operation: 'add' | 'remove'
  ): Promise<void> {
    try {
      const indexKey = this.CACHE_PREFIXES.index;
      const currentIndex = (await this.cache.get<string[]>(indexKey)) || [];

      let newIndex: string[];
      if (operation === 'add') {
        newIndex = currentIndex.includes(billId) ? currentIndex : [...currentIndex, billId];
      } else {
        newIndex = currentIndex.filter(id => id !== billId);
      }

      await this.cache.set(indexKey, newIndex, this.LONG_TTL);
    } catch (error) {
      logger.warn('Failed to update cache index', {
        billId,
        operation,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Generate a hash for bill text to detect changes
   */
  static generateTextHash(text: string): string {
    // Simple hash function for detecting text changes
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }
}

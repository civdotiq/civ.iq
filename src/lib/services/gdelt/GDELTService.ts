/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Service - Centralized GDELT API Integration
 *
 * Provides a unified service layer for GDELT API interactions, eliminating
 * internal HTTP calls and providing a clean interface for both individual
 * and batch operations.
 *
 * Features:
 * - Direct GDELT API calls (no internal HTTP routing)
 * - Built-in retry logic and error handling
 * - Rate limiting and circuit breaker support
 * - Batch processing capabilities
 * - Query optimization for Congress members
 */

import {
  GDELTArticle,
  GDELTResponse,
  GDELTQueryParams,
  GDELTError,
  GDELTErrorType,
  Result,
} from '@/types/gdelt';
import { BaseRepresentative } from '@/types/representative';
import { NameVariantsGenerator } from '@/lib/gdelt/name-variants';
import { gdeltCache } from '@/lib/gdelt/cache';

export interface GDELTServiceOptions {
  readonly timeout?: number;
  readonly retryAttempts?: number;
  readonly retryDelayMs?: number;
  readonly userAgent?: string;
}

export interface GDELTFetchOptions {
  readonly timespan?: string;
  readonly maxrecords?: number;
  readonly theme?: string;
  readonly mode?: 'artlist' | 'timelinevol' | 'timelinevolraw';
}

export class GDELTService {
  private readonly timeout: number;
  private readonly retryAttempts: number;
  private readonly retryDelayMs: number;
  private readonly userAgent: string;
  private readonly nameVariantsGenerator: NameVariantsGenerator;

  constructor(options: GDELTServiceOptions = {}) {
    this.timeout = options.timeout ?? 30000; // 30 seconds
    this.retryAttempts = options.retryAttempts ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
    this.userAgent = options.userAgent ?? 'CIV.IQ-Congressional-Tracker/1.0';
    this.nameVariantsGenerator = new NameVariantsGenerator();
  }

  /**
   * Fetch GDELT articles for a query string
   */
  async fetchArticles(
    query: string,
    options: GDELTFetchOptions = {}
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    const timespan = options.timespan ?? '7days';
    const maxrecords = options.maxrecords ?? 50;

    // Check cache first
    const cachedResult = gdeltCache.getArticles(query, timespan, maxrecords);
    if (cachedResult) {
      return cachedResult;
    }

    const gdeltParams: GDELTQueryParams = {
      query,
      timespan,
      maxrecords,
      mode: options.mode ?? 'artlist',
      format: 'json',
      theme: options.theme ?? 'GENERAL_GOVERNMENT',
    };

    const result = await this.fetchWithRetry(gdeltParams);

    // Cache the result (both success and error cases)
    gdeltCache.setArticles(query, timespan, maxrecords, result);

    return result;
  }

  /**
   * Fetch GDELT articles for a specific Congress member
   */
  async fetchMemberArticles(
    member: BaseRepresentative,
    options: GDELTFetchOptions = {}
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    const timespan = options.timespan ?? '7days';
    const maxrecords = options.maxrecords ?? 50;

    // Check member-specific cache first
    const cachedResult = gdeltCache.getMemberArticles(member, timespan, maxrecords);
    if (cachedResult) {
      return cachedResult;
    }

    const nameVariants = this.nameVariantsGenerator.generateGDELTOptimizedVariants(member);
    const query = this.buildQueryFromVariants(nameVariants);

    const result = await this.fetchArticles(query, options);

    // Cache the result using member-specific cache
    gdeltCache.setMemberArticles(member, timespan, maxrecords, result);

    return result;
  }

  /**
   * Fetch GDELT articles for multiple Congress members
   * Processes requests with proper rate limiting
   */
  async fetchBatchMemberArticles(
    members: BaseRepresentative[],
    options: GDELTFetchOptions = {},
    batchOptions: { batchSize?: number; delayMs?: number } = {}
  ): Promise<Map<string, Result<GDELTArticle[], GDELTError>>> {
    const batchSize = batchOptions.batchSize ?? 10;
    const delayMs = batchOptions.delayMs ?? 2000;
    const results = new Map<string, Result<GDELTArticle[], GDELTError>>();

    // Process in batches to respect rate limits
    for (let i = 0; i < members.length; i += batchSize) {
      const batch = members.slice(i, i + batchSize);

      // Process batch in parallel
      const batchPromises = batch.map(async member => {
        const result = await this.fetchMemberArticles(member, options);
        return { bioguideId: member.bioguideId, result };
      });

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((promiseResult, index) => {
        const member = batch[index];
        if (!member) return;

        if (promiseResult.status === 'fulfilled') {
          results.set(member.bioguideId, promiseResult.value.result);
        } else {
          results.set(member.bioguideId, {
            error: {
              type: GDELTErrorType.NETWORK_ERROR,
              message: promiseResult.reason?.message || 'Promise rejected',
              timestamp: new Date().toISOString(),
            },
          });
        }
      });

      // Rate limiting delay (except for last batch)
      if (i + batchSize < members.length) {
        await this.sleep(delayMs);
      }
    }

    return results;
  }

  /**
   * Build GDELT query from name variants
   * Fixed: Use simple queries instead of complex OR statements that GDELT rejects
   */
  private buildQueryFromVariants(variants: string[]): string {
    // Use the first (most specific) variant instead of complex OR logic
    // GDELT API doesn't support complex nested parentheses
    const primaryVariant = variants[0] || '';
    return `${primaryVariant} theme:GENERAL_GOVERNMENT`;
  }

  /**
   * Core GDELT API fetch with retry logic
   */
  private async fetchWithRetry(
    params: GDELTQueryParams
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    let lastError: GDELTError | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      const result = await this.fetchGDELTDirect(params);

      // Success case
      if (result.data) {
        return result;
      }

      // Store the error
      lastError = result.error!;

      // Don't retry on certain error types
      if (result.error?.type === GDELTErrorType.INVALID_QUERY) {
        break;
      }

      // Exponential backoff before retry (except last attempt)
      if (attempt < this.retryAttempts) {
        const backoffMs = Math.pow(2, attempt - 1) * this.retryDelayMs;
        await this.sleep(backoffMs);
      }
    }

    return { error: lastError! };
  }

  /**
   * Direct GDELT API call without any internal routing
   */
  private async fetchGDELTDirect(
    params: GDELTQueryParams
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    try {
      // Build GDELT API URL
      const gdeltUrl = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          gdeltUrl.searchParams.append(key, value.toString());
        }
      });

      // Fetch from GDELT with timeout and proper headers
      const response = await fetch(gdeltUrl.toString(), {
        headers: {
          'User-Agent': this.userAgent,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return {
            error: {
              type: GDELTErrorType.RATE_LIMIT,
              message: 'Rate limit exceeded',
              statusCode: 429,
              timestamp: new Date().toISOString(),
            },
          };
        }

        if (response.status >= 500) {
          return {
            error: {
              type: GDELTErrorType.SERVER_ERROR,
              message: `GDELT server error: ${response.status}`,
              statusCode: response.status,
              timestamp: new Date().toISOString(),
            },
          };
        }

        throw new Error(`GDELT API error: ${response.status} ${response.statusText}`);
      }

      // Parse and validate response
      const data = await response.json();

      // GDELT sometimes returns different structures, normalize it
      const articles: GDELTArticle[] = data.articles || [];

      return { data: articles };
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        return {
          error: {
            type: GDELTErrorType.TIMEOUT,
            message: 'Request timeout. GDELT API took too long to respond.',
            timestamp: new Date().toISOString(),
          },
        };
      }

      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
          details: error instanceof Error ? { stack: error.stack } : undefined,
        },
      };
    }
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a formatted GDELT response for API compatibility
   */
  createGDELTResponse(
    articles: GDELTArticle[],
    queryParams: Partial<GDELTQueryParams> = {}
  ): GDELTResponse {
    return {
      articles,
      metadata: {
        totalResults: articles.length,
        timespan: queryParams.timespan,
        theme: queryParams.theme,
      },
    };
  }

  /**
   * Get cache statistics for monitoring performance
   */
  getCacheStats() {
    return gdeltCache.getStats();
  }

  /**
   * Clear the cache (useful for testing or manual cache invalidation)
   */
  clearCache(): void {
    gdeltCache.clear();
  }

  /**
   * Clean up expired cache entries
   */
  cleanupCache() {
    return gdeltCache.cleanup();
  }
}

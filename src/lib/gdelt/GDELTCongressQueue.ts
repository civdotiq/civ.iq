/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GDELT Congress Queue - Batch Processing for Scale
 *
 * Implements efficient batch processing for tracking all 535 Congress members
 * with the GDELT API while respecting rate limits and optimizing performance.
 *
 * Features:
 * - Batch size of 50 members with 2-second intervals
 * - Exponential backoff for rate limiting
 * - Name variation generation (nicknames, titles)
 * - Graceful error handling with partial failure support
 */

import { BaseRepresentative } from '@/types/representative';
import { GDELTArticle, Result, GDELTError, GDELTErrorType } from '@/types/gdelt';
import { GDELTService } from '@/lib/services/gdelt';

export interface BatchProcessingOptions {
  readonly batchSize?: number;
  readonly batchInterval?: number;
  readonly maxConcurrent?: number;
  readonly retryAttempts?: number;
  readonly exponentialBackoffBase?: number;
}

export interface BatchResult {
  readonly successful: Map<string, GDELTArticle[]>;
  readonly failed: Map<string, GDELTError>;
  readonly totalProcessed: number;
  readonly processingTimeMs: number;
}

export class GDELTCongressQueue {
  private readonly batchSize: number;
  private readonly batchInterval: number;
  private readonly maxConcurrent: number;
  private readonly retryAttempts: number;
  private readonly exponentialBackoffBase: number;
  private readonly gdeltService: GDELTService;

  constructor(options: BatchProcessingOptions = {}) {
    this.batchSize = options.batchSize ?? 50;
    this.batchInterval = options.batchInterval ?? 2000; // 2 seconds
    this.maxConcurrent = options.maxConcurrent ?? 5;
    this.retryAttempts = options.retryAttempts ?? 3;
    this.exponentialBackoffBase = options.exponentialBackoffBase ?? 2;
    this.gdeltService = new GDELTService();
  }

  /**
   * Process all Congress members in batches
   * Returns Map of bioguideId -> articles with partial failure support
   */
  async processAllMembers(members: BaseRepresentative[]): Promise<BatchResult> {
    const startTime = Date.now();
    const batches = this.createBatches(members, this.batchSize);
    const results = new Map<string, GDELTArticle[]>();
    const errors = new Map<string, GDELTError>();

    for (const [index, batch] of batches.entries()) {
      const batchPromises = batch.map(member => this.fetchMemberNewsWithRetry(member));

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, memberIndex) => {
        const member = batch[memberIndex];
        if (!member) return; // Safety check for undefined member

        if (result.status === 'fulfilled') {
          if (result.value.data) {
            results.set(member.bioguideId, result.value.data);
          } else if (result.value.error) {
            errors.set(member.bioguideId, result.value.error);
          }
        } else {
          errors.set(member.bioguideId, {
            type: GDELTErrorType.NETWORK_ERROR,
            message: result.reason?.message || 'Promise rejected',
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Rate limiting pause (except for last batch)
      if (index < batches.length - 1) {
        await this.sleep(this.batchInterval);
      }
    }

    const endTime = Date.now();
    const processingTimeMs = endTime - startTime;

    return {
      successful: results,
      failed: errors,
      totalProcessed: members.length,
      processingTimeMs,
    };
  }

  /**
   * Fetch news for a single member with retry logic
   */
  private async fetchMemberNewsWithRetry(
    member: BaseRepresentative
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    let lastError: GDELTError | null = null;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      const result = await this.fetchMemberNews(member);

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
        const backoffMs = Math.pow(this.exponentialBackoffBase, attempt - 1) * 1000;
        await this.sleep(backoffMs);
      }
    }

    return { error: lastError! };
  }

  /**
   * Fetch news for a single Congress member using GDELTService
   */
  private async fetchMemberNews(
    member: BaseRepresentative
  ): Promise<Result<GDELTArticle[], GDELTError>> {
    // Use GDELTService directly instead of internal HTTP calls
    return this.gdeltService.fetchMemberArticles(member, {
      timespan: '7days',
      maxrecords: 50,
      theme: 'GENERAL_GOVERNMENT',
    });
  }

  /**
   * Create batches from array of members
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Sleep utility for rate limiting
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

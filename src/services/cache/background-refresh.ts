/**
 * Background Cache Refresh Service
 * Pre-loads representative data into Redis to prevent timeout issues
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import {
  getOptimizedBillsByMember,
  getBillsSummary,
} from '@/services/congress/optimized-congress.service';
import { fecAPI } from '@/lib/fec-api';

/**
 * Safely extracts an error message from an unknown error value
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message: unknown }).message;
    return typeof msg === 'string' ? msg : 'Unknown error';
  }
  return 'Unknown error';
}

interface RefreshOptions {
  maxConcurrent?: number;
  delay?: number; // ms between requests
  includeBills?: boolean;
  includeFinance?: boolean;
}

interface RefreshResult {
  totalProcessed: number;
  successful: number;
  failed: number;
  errors: Array<{ bioguideId: string; error: string }>;
  executionTime: number;
  cached: {
    representatives: number;
    bills: number;
    finance: number;
  };
}

// List of active representatives (you can expand this or fetch from database)
const ACTIVE_REPRESENTATIVES = [
  'K000367', // Amy Klobuchar - test representative
  'P000612', // Jon Ossoff
  'W000805', // Mark Warner
  'S000148', // Chuck Schumer
  'P000603', // Rand Paul
  // Add more bioguideIds as needed
];

/**
 * Type-safe result for single representative refresh
 */
type SingleRefreshResult =
  | {
      success: true;
      cached: { representatives: number; bills: number; finance: number };
    }
  | {
      success: false;
      cached: { representatives: number; bills: number; finance: number };
      error: string;
    };

/**
 * Refresh cache for a single representative
 */
async function refreshRepresentative(
  bioguideId: string,
  options: RefreshOptions = {}
): Promise<SingleRefreshResult> {
  const cached = { representatives: 0, bills: 0, finance: 0 };

  try {
    logger.info(`Refreshing cache for representative ${bioguideId}`);

    // 1. Cache basic representative data
    const repCacheKey = `representative:${bioguideId}`;
    try {
      const repData = await getEnhancedRepresentative(bioguideId);
      await govCache.set(repCacheKey, repData, {
        dataType: 'representatives',
        source: 'background-refresh',
      });
      cached.representatives = 1;
      logger.debug(`Cached representative data for ${bioguideId}`);
    } catch (error) {
      logger.warn(`Failed to cache representative ${bioguideId}:`, getErrorMessage(error));
    }

    // 2. Cache bills if requested
    if (options.includeBills) {
      try {
        // Cache bills summary
        const billsSummaryKey = `bills-summary:${bioguideId}:119`;
        const billsSummary = await getBillsSummary(bioguideId);
        await govCache.set(billsSummaryKey, billsSummary, {
          dataType: 'bills',
          source: 'background-refresh',
        });

        // Cache first page of bills
        const billsKey = `bills:${bioguideId}:119:25:1`;
        const billsData = await getOptimizedBillsByMember({
          bioguideId,
          limit: 25,
          page: 1,
          congress: 119,
        });
        await govCache.set(billsKey, billsData, {
          dataType: 'bills',
          source: 'background-refresh',
        });

        cached.bills = 2;
        logger.debug(`Cached bills data for ${bioguideId}`);
      } catch (error) {
        logger.warn(`Failed to cache bills for ${bioguideId}:`, getErrorMessage(error));
      }
    }

    // 3. Cache finance data if requested
    if (options.includeFinance) {
      try {
        // Only cache if we have FEC ID mapping
        const financeKey = `finance:${bioguideId}`;
        const financeData = await fecAPI.getCandidateFinancials(bioguideId);
        if (financeData) {
          await govCache.set(financeKey, financeData, {
            dataType: 'finance',
            source: 'background-refresh',
          });
          cached.finance = 1;
          logger.debug(`Cached finance data for ${bioguideId}`);
        }
      } catch (error) {
        logger.warn(`Failed to cache finance for ${bioguideId}:`, getErrorMessage(error));
      }
    }

    // Add delay between requests to be API-friendly
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay));
    }
    // Success case - return with success: true
    return { success: true, cached };
  } catch (error) {
    // Failure case - return with success: false and error message
    logger.error(`Failed to refresh representative ${bioguideId}:`, error);
    return { success: false, cached, error: getErrorMessage(error) };
  }
}

/**
 * Refresh cache for multiple representatives with concurrency control
 */
export async function refreshRepresentativesCache(
  bioguideIds: string[] = ACTIVE_REPRESENTATIVES,
  options: RefreshOptions = {}
): Promise<RefreshResult> {
  const startTime = Date.now();
  const maxConcurrent = options.maxConcurrent || 3;
  const delay = options.delay || 1000; // 1 second between requests

  logger.info(`Starting background cache refresh for ${bioguideIds.length} representatives`, {
    maxConcurrent,
    delay,
    includeBills: options.includeBills,
    includeFinance: options.includeFinance,
  });

  const result: RefreshResult = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    errors: [],
    executionTime: 0,
    cached: { representatives: 0, bills: 0, finance: 0 },
  };

  // Process in batches with concurrency control
  const batches = [];
  for (let i = 0; i < bioguideIds.length; i += maxConcurrent) {
    batches.push(bioguideIds.slice(i, i + maxConcurrent));
  }

  for (const batch of batches) {
    const promises = batch.map(bioguideId =>
      refreshRepresentative(bioguideId, { ...options, delay })
    );

    const batchResults = await Promise.allSettled(promises);

    // Using indexed iteration with proper bounds checking
    for (let index = 0; index < batchResults.length; index++) {
      const promiseResult = batchResults[index];
      const bioguideId = batch[index];

      // TypeScript needs these checks due to noUncheckedIndexedAccess
      if (!promiseResult || !bioguideId) {
        continue;
      }

      result.totalProcessed++;

      if (promiseResult.status === 'fulfilled') {
        const refreshResult = promiseResult.value;
        if (refreshResult.success === true) {
          // When success is true, no error field exists
          result.successful++;
          result.cached.representatives += refreshResult.cached.representatives;
          result.cached.bills += refreshResult.cached.bills;
          result.cached.finance += refreshResult.cached.finance;
        } else {
          // When success is false, error field is guaranteed to exist
          result.failed++;
          result.errors.push({
            bioguideId,
            error: refreshResult.error,
          });
        }
      } else {
        result.failed++;
        result.errors.push({
          bioguideId,
          error: getErrorMessage(promiseResult.reason),
        });
      }
    }

    // Add delay between batches
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  result.executionTime = Date.now() - startTime;

  logger.info('Background cache refresh completed', {
    totalProcessed: result.totalProcessed,
    successful: result.successful,
    failed: result.failed,
    cached: result.cached,
    executionTimeMs: result.executionTime,
    errorCount: result.errors.length,
  });

  if (result.errors.length > 0) {
    logger.warn('Background refresh errors:', result.errors);
  }

  return result;
}

/**
 * Quick refresh for essential data only (representatives + bills summary)
 */
export async function quickRefresh(
  bioguideIds: string[] = ACTIVE_REPRESENTATIVES.slice(0, 5) // Just top 5
): Promise<RefreshResult> {
  return refreshRepresentativesCache(bioguideIds, {
    maxConcurrent: 2,
    delay: 500, // Faster for testing
    includeBills: true, // Include bills summary
    includeFinance: false, // Skip finance for quick refresh
  });
}

/**
 * Full refresh for all data types
 */
export async function fullRefresh(
  bioguideIds: string[] = ACTIVE_REPRESENTATIVES
): Promise<RefreshResult> {
  return refreshRepresentativesCache(bioguideIds, {
    maxConcurrent: 2,
    delay: 2000, // Slower to be API-friendly
    includeBills: true,
    includeFinance: true,
  });
}

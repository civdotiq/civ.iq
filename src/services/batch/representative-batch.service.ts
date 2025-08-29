/**
 * Proper Batch Service Layer
 * Calls services directly instead of making HTTP requests
 */

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache/simple-government-cache';
import {
  getOptimizedBillsByMember,
  getBillsSummary,
} from '@/services/congress/optimized-congress.service';
import { fecAPI } from '@/lib/fec-api';
import { getVotesByMember } from '@/features/representatives/services/congress-api';

export interface BatchRequest {
  bioguideId: string;
  endpoints: string[];
  options?: {
    bills?: {
      limit?: number;
      page?: number;
      summaryOnly?: boolean;
    };
    votes?: {
      limit?: number;
    };
    finance?: {
      summaryOnly?: boolean;
    };
  };
}

export interface BatchResponse {
  success: boolean;
  data: Record<string, unknown>;
  metadata: {
    bioguideId: string;
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    executionTime: number;
    cached: boolean;
    timestamp: string;
  };
  errors?: Record<string, { code: string; message: string }>;
}

/**
 * Execute batch request using direct service calls
 * Much faster than HTTP-to-HTTP calls
 */
export async function executeBatchRequest(request: BatchRequest): Promise<BatchResponse> {
  const startTime = Date.now();
  const { bioguideId, endpoints, options = {} } = request;

  // Check if we have a cached batch response
  const cacheKey = `batch:${bioguideId}:${endpoints.sort().join(',')}:${JSON.stringify(options)}`;
  const cached = govCache.get<BatchResponse>(cacheKey);

  if (cached) {
    logger.info('Batch cache hit', { bioguideId, endpoints, cacheKey });
    return {
      ...cached,
      metadata: { ...cached.metadata, cached: true },
    };
  }

  const data: Record<string, unknown> = {};
  const errors: Record<string, { code: string; message: string }> = {};
  const successfulEndpoints: string[] = [];
  const failedEndpoints: string[] = [];

  // Rate limiter for concurrent requests
  const maxConcurrent = 3;
  const semaphore = new Array(maxConcurrent).fill(null);
  let semaphoreIndex = 0;

  const executeEndpoint = async (endpoint: string): Promise<void> => {
    // Wait for available slot
    await new Promise<void>(resolve => {
      const checkSlot = () => {
        if (semaphore[semaphoreIndex] === null) {
          semaphore[semaphoreIndex] = true;
          resolve();
        } else {
          semaphoreIndex = (semaphoreIndex + 1) % maxConcurrent;
          setTimeout(checkSlot, 10);
        }
      };
      checkSlot();
    });

    const currentSlot = semaphoreIndex;
    semaphoreIndex = (semaphoreIndex + 1) % maxConcurrent;

    try {
      let result;

      switch (endpoint) {
        case 'bills': {
          if (options.bills?.summaryOnly) {
            result = await getBillsSummary(bioguideId);
          } else {
            result = await getOptimizedBillsByMember({
              bioguideId,
              limit: options.bills?.limit || 25,
              page: options.bills?.page || 1,
            });
          }
          break;
        }

        case 'votes': {
          // Use existing votes service but with timeout
          const votesPromise = getVotesByMember(bioguideId);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Votes timeout')), 5000)
          );

          result = await Promise.race([votesPromise, timeoutPromise]);

          // Limit results if requested
          if (options.votes?.limit && Array.isArray(result)) {
            result = result.slice(0, options.votes.limit);
          }
          break;
        }

        case 'finance': {
          const fullData = await fecAPI.getCandidateFinancials(bioguideId);

          if (options.finance?.summaryOnly) {
            // Get just basic financial summary from array response
            const firstRecord = Array.isArray(fullData) && fullData.length > 0 ? fullData[0] : null;
            result = {
              totalRaised: firstRecord?.total_receipts || 0,
              totalSpent: firstRecord?.total_disbursements || 0,
              cashOnHand: firstRecord?.cash_on_hand || 0,
              hasData: !!firstRecord,
            };
          } else {
            result = fullData;
          }
          break;
        }

        default:
          throw new Error(`Unknown endpoint: ${endpoint}`);
      }

      data[endpoint] = result;
      successfulEndpoints.push(endpoint);

      logger.info(`Batch endpoint ${endpoint} completed`, {
        bioguideId,
        endpoint,
        hasData: !!result,
        dataSize: Array.isArray(result)
          ? result.length
          : typeof result === 'object' && result !== null
            ? Object.keys(result).length
            : 1,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors[endpoint] = {
        code: 'SERVICE_ERROR',
        message: `${endpoint} service failed: ${errorMessage}`,
      };
      failedEndpoints.push(endpoint);

      logger.error(`Batch endpoint ${endpoint} failed`, error as Error, {
        bioguideId,
        endpoint,
      });
    } finally {
      // Release semaphore slot
      semaphore[currentSlot] = null;
    }
  };

  // Execute all endpoints with concurrency control
  await Promise.allSettled(endpoints.map(endpoint => executeEndpoint(endpoint)));

  const result: BatchResponse = {
    success: successfulEndpoints.length > 0,
    data,
    metadata: {
      bioguideId,
      requestedEndpoints: endpoints,
      successfulEndpoints,
      failedEndpoints,
      executionTime: Date.now() - startTime,
      cached: false,
      timestamp: new Date().toISOString(),
    },
    errors: Object.keys(errors).length > 0 ? errors : undefined,
  };

  // Cache successful results for 5 minutes
  if (successfulEndpoints.length > 0) {
    govCache.set(cacheKey, result, { ttl: 300 * 1000, source: 'batch-service' });
  }

  logger.info('Batch request completed', {
    bioguideId,
    requestedEndpoints: endpoints,
    successfulEndpoints,
    failedEndpoints,
    executionTime: result.metadata.executionTime,
    cacheKey,
  });

  return result;
}

/**
 * Get optimized summary data for stats displays
 * Much faster than full batch requests
 */
export async function getRepresentativeSummary(bioguideId: string) {
  const cacheKey = `representative-summary:${bioguideId}`;
  const cached = govCache.get<{
    bills: unknown;
    finance: unknown;
    lastUpdated: string;
  }>(cacheKey);

  if (cached) {
    return cached;
  }

  try {
    // Execute minimal requests for summary data
    const [billsSummary, financeSummary] = await Promise.allSettled([
      getBillsSummary(bioguideId),
      executeBatchRequest({
        bioguideId,
        endpoints: ['finance'],
        options: { finance: { summaryOnly: true } },
      }),
    ]);

    const result = {
      bills: billsSummary.status === 'fulfilled' ? billsSummary.value : null,
      finance:
        financeSummary.status === 'fulfilled' && financeSummary.value.success
          ? financeSummary.value.data.finance
          : null,
      lastUpdated: new Date().toISOString(),
    };

    govCache.set(cacheKey, result, { ttl: 600 * 1000, source: 'summary-service' }); // Cache for 10 minutes
    return result;
  } catch (error) {
    logger.error('Representative summary failed', error as Error, { bioguideId });
    return {
      bills: null,
      finance: null,
      lastUpdated: new Date().toISOString(),
    };
  }
}

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
            const billsResult = await getOptimizedBillsByMember({
              bioguideId,
              limit: options.bills?.limit || 25,
              page: options.bills?.page || 1,
            });
            
            // Transform to legacy format for backward compatibility
            result = {
              // Legacy format expected by BillsTab
              sponsoredLegislation: billsResult.bills,
              
              // Enhanced format with counts and structure  
              sponsored: {
                count: billsResult.bills.length,
                bills: billsResult.bills,
              },
              cosponsored: {
                count: 0,
                bills: [],
              },
              
              // Summary
              totalSponsored: billsResult.bills.length,
              totalCosponsored: 0,
              totalBills: billsResult.bills.length,
              
              // Include pagination info
              pagination: billsResult.pagination,
              
              metadata: {
                ...billsResult.metadata,
                source: 'Congress.gov API (Optimized)',
                congressLabel: `119th Congress`,
                dataStructure: 'enhanced',
                note: 'Cosponsored bills require separate API implementation',
              },
            };
          }
          break;
        }

        case 'votes': {
          // For now, return empty votes array to avoid timeouts
          // TODO: Implement optimized votes service that doesn't make multiple API calls
          logger.info(`Batch votes: Returning empty array to avoid timeout for ${bioguideId}`);
          result = [];
          break;
        }

        case 'finance': {
          // Direct service call - no HTTP requests for better performance
          logger.info(`Batch finance: Starting for ${bioguideId}`);
          
          // For now, return empty finance data structure
          // TODO: Implement direct FEC service calls after restoring full finance implementation
          result = {
            totalRaised: 0,
            totalSpent: 0,
            cashOnHand: 0,
            individualContributions: 0,
            pacContributions: 0,
            partyContributions: 0,
            candidateContributions: 0,
            metadata: {
              note: 'Finance data pending full implementation',
              bioguideId,
            },
          };
          
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

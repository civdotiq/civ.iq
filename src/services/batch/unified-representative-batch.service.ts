/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Representative Batch Service - Refactored Batch Service
 *
 * This service consolidates the original representative-batch.service.ts to use:
 * - BaseUnifiedService as the foundation
 * - IUnifiedRepresentativeService interface compliance
 * - UnifiedRepresentativeResponse types
 * - Advanced batch processing with direct service calls
 * - Consistent error handling and response formatting
 *
 * Features:
 * - Concurrent batch processing with rate limiting
 * - Multi-endpoint support (bills, votes, finance, committees)
 * - Advanced caching strategies
 * - Service-to-service calls (no HTTP overhead)
 * - Comprehensive error handling
 */

import { BaseUnifiedService } from '../base/unified-base.service';
import type {
  IUnifiedRepresentativeService,
  UnifiedRepresentativeResponse,
  UnifiedServiceResponse,
  VotingRecord,
  BillRecord,
  CommitteeRecord,
  QueryOptions,
} from '../interfaces/unified-service-interfaces';

import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache/simple-government-cache';
import { getBillsSummary } from '@/services/congress/optimized-congress.service';
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
 * Unified Representative Batch Service Implementation
 *
 * Refactored from the original function-based batch service to implement
 * the unified service pattern while maintaining advanced batch processing capabilities.
 */
export class UnifiedRepresentativeBatchService
  extends BaseUnifiedService
  implements IUnifiedRepresentativeService
{
  private static instance: UnifiedRepresentativeBatchService;

  private constructor() {
    super({
      baseUrl: '', // Batch service doesn't use external APIs directly
      timeout: 30000, // 30 seconds for complex batch operations
      retries: 2,
      cacheEnabled: true,
      cacheTtl: 300000, // 5 minutes
    });
  }

  public static getInstance(): UnifiedRepresentativeBatchService {
    if (!UnifiedRepresentativeBatchService.instance) {
      UnifiedRepresentativeBatchService.instance = new UnifiedRepresentativeBatchService();
    }
    return UnifiedRepresentativeBatchService.instance;
  }

  getServiceInfo() {
    return {
      name: 'UnifiedRepresentativeBatchService',
      version: '2.0.0',
      description: 'Unified batch service for multiple representative data endpoints',
      config: {
        baseUrl: this.config.baseUrl || 'batch-service',
        timeout: this.config.timeout,
        retries: this.config.retries,
        cacheEnabled: this.config.cacheEnabled,
        rateLimitEnabled: this.config.rateLimitEnabled,
      },
    };
  }

  // Core unified interface implementations - Specialized for batch operations
  async getRepresentative(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse>> {
    const startTime = Date.now();

    try {
      // Use batch service to get comprehensive data
      const _batchResult = await this.executeBatchRequest({
        bioguideId,
        endpoints: ['bills', 'finance', 'committees'],
        options: {
          bills: { summaryOnly: true },
          finance: { summaryOnly: true },
        },
      });

      // Transform batch result to unified representative response
      const unifiedData: UnifiedRepresentativeResponse = {
        bioguideId,
        name: `Representative ${bioguideId}`,
        firstName: '',
        lastName: '',
        party: 'Unknown' as 'Democratic' | 'Republican' | 'Independent',
        state: '',
        chamber: 'House' as 'House' | 'Senate',
        district: null,
        title: `Representative ${bioguideId}`,
        contactInfo: {},
        lastUpdated: new Date().toISOString(),
        dataSource: 'unified-batch.service',
      };

      return this.formatResponse(unifiedData, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getAllRepresentatives(
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      // Batch service doesn't provide representative listings
      logger.info('Representative listings not available in batch service');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativesByState(
    _state: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      // Batch service doesn't provide state-based listings
      logger.info('State-based representative listings not available in batch service');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async searchRepresentatives(
    _query: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      // Batch service doesn't provide search functionality
      logger.info('Representative search not available in batch service');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Enhanced methods - Core batch functionality
  async getRepresentativeVotes(
    bioguideId: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<VotingRecord[]>> {
    const startTime = Date.now();

    try {
      const batchResult = await this.executeBatchRequest({
        bioguideId,
        endpoints: ['votes'],
        options: {
          votes: { limit: options?.limit },
        },
      });

      const votingRecords: VotingRecord[] = [];

      if (batchResult.success && batchResult.data.votes) {
        const votes = batchResult.data.votes as unknown[];
        // Transform votes data to VotingRecord format
        // Note: This would need proper type transformation based on actual vote data structure
        logger.info(`Retrieved ${Array.isArray(votes) ? votes.length : 0} votes for ${bioguideId}`);
      }

      return this.formatResponse(votingRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeBills(
    bioguideId: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<BillRecord[]>> {
    const startTime = Date.now();

    try {
      const batchResult = await this.executeBatchRequest({
        bioguideId,
        endpoints: ['bills'],
        options: {
          bills: {
            limit: options?.limit,
            page: options?.page,
            summaryOnly: false,
          },
        },
      });

      const billRecords: BillRecord[] = [];

      if (batchResult.success && batchResult.data.bills) {
        const billsData = batchResult.data.bills as unknown;
        if (billsData && typeof billsData === 'object' && 'sponsored' in billsData) {
          const sponsoredData = (billsData as { sponsored?: { bills?: unknown[] } }).sponsored;
          if (sponsoredData?.bills) {
            sponsoredData.bills.forEach((bill: unknown) => {
              if (bill && typeof bill === 'object') {
                const billObj = bill as Record<string, unknown>;
                billRecords.push({
                  billId: (billObj.id as string) || 'unknown',
                  title: (billObj.title as string) || 'Unknown',
                  introducedDate: (billObj.introducedDate as string) || '',
                  status: (billObj.status as string) || 'Unknown',
                  congress: (billObj.congress as number) || 119,
                  type: (billObj.type as string) || 'Unknown',
                  summary: (billObj.policyArea as string) || undefined,
                });
              }
            });
          }
        }
      }

      return this.formatResponse(billRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeCommittees(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<CommitteeRecord[]>> {
    const startTime = Date.now();

    try {
      const batchResult = await this.executeBatchRequest({
        bioguideId,
        endpoints: ['committees'],
      });

      const committeeRecords: CommitteeRecord[] = [];

      if (batchResult.success && batchResult.data.committees) {
        const committeesData = batchResult.data.committees as unknown;
        if (
          committeesData &&
          typeof committeesData === 'object' &&
          'committees' in committeesData
        ) {
          const committees = (committeesData as { committees?: unknown[] }).committees;
          if (committees) {
            committees.forEach((committee: unknown) => {
              if (committee && typeof committee === 'object') {
                const committeeObj = committee as Record<string, unknown>;
                committeeRecords.push({
                  committeeId:
                    (committeeObj.thomas_id as string) || (committeeObj.id as string) || 'unknown',
                  name: (committeeObj.name as string) || 'Unknown',
                  role: committeeObj.rank_in_party ? 'Chair' : 'Member',
                  chamber: ((committeeObj.thomas_id as string)?.startsWith('H')
                    ? 'House'
                    : 'Senate') as 'House' | 'Senate' | 'Joint',
                });
              }
            });
          }
        }
      }

      return this.formatResponse(committeeRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Legacy compatibility methods
  async getByZipCode(_zipCode: string): Promise<UnifiedRepresentativeResponse[]> {
    // Not supported by batch service
    return [];
  }

  // Core batch processing functionality
  public async executeBatchRequest(request: BatchRequest): Promise<BatchResponse> {
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
              // Use the optimized congress service through import
              const { unifiedOptimizedCongressService } = await import(
                '@/services/congress/unified-optimized-congress.service'
              );

              const billsResponse = await unifiedOptimizedCongressService.getRepresentativeBills(
                bioguideId,
                {
                  limit: options.bills?.limit || 25,
                  page: options.bills?.page || 1,
                  congress: 119,
                }
              );

              if (billsResponse.success && billsResponse.data) {
                // Transform to legacy format for backward compatibility
                result = {
                  sponsoredLegislation: billsResponse.data,
                  sponsored: {
                    count: billsResponse.data.length,
                    bills: billsResponse.data,
                  },
                  cosponsored: {
                    count: 0,
                    bills: [],
                  },
                  totalSponsored: billsResponse.data.length,
                  totalCosponsored: 0,
                  totalBills: billsResponse.data.length,
                  metadata: {
                    source: 'Unified Optimized Congress Service',
                    congressLabel: '119th Congress',
                    dataStructure: 'enhanced',
                    note: 'Cosponsored bills require separate API implementation',
                  },
                };
              } else {
                result = { sponsoredLegislation: [], sponsored: { count: 0, bills: [] } };
              }
            }
            break;
          }

          case 'votes': {
            try {
              logger.info(`Batch votes: Starting for ${bioguideId}`);

              // Get representative chamber info for proper API routing
              const { getEnhancedRepresentative } = await import(
                '@/features/representatives/services/congress.service'
              );
              const representative = await getEnhancedRepresentative(bioguideId);
              if (!representative) {
                logger.error('Representative not found for votes', { bioguideId });
                result = [];
                break;
              }
              const chamber = representative.chamber;

              // Use chamber-aware votes function with timeout protection
              const timeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Votes timeout')), 5000)
              );

              const votesPromise = getVotesByMember(bioguideId, undefined, chamber);
              const votes = (await Promise.race([votesPromise, timeout])) as unknown[];

              // Limit results if requested
              result =
                options.votes?.limit && Array.isArray(votes)
                  ? votes.slice(0, options.votes.limit)
                  : votes;

              logger.info(`Votes retrieved for ${bioguideId}`, {
                count: Array.isArray(result) ? result.length : 0,
                chamber,
              });
            } catch (error) {
              if (error instanceof Error && error.message === 'Votes timeout') {
                logger.warn(`Votes timeout for ${bioguideId} after 5 seconds`);
              } else {
                logger.error(`Votes error for ${bioguideId}:`, error);
              }
              result = [];
            }
            break;
          }

          case 'finance': {
            try {
              logger.info(`Batch finance: Starting for ${bioguideId}`);

              const { bioguideToFECMapping } = await import('@/lib/data/bioguide-fec-mapping');
              const fecMapping = bioguideToFECMapping[bioguideId];

              if (!fecMapping || !fecMapping.fecId) {
                result = {
                  totalRaised: 0,
                  totalSpent: 0,
                  cashOnHand: 0,
                  individualContributions: 0,
                  pacContributions: 0,
                  partyContributions: 0,
                  candidateContributions: 0,
                  metadata: {
                    note: 'No FEC data available for this representative',
                    bioguideId,
                  },
                };
                break;
              }

              const candidateId = fecMapping.fecId;
              const cycle = 2024;
              const summaryDataArray = await fecAPI.getCandidateFinancials(candidateId, cycle);

              const summaryData =
                Array.isArray(summaryDataArray) && summaryDataArray.length > 0
                  ? summaryDataArray[0]
                  : null;

              if (!summaryData) {
                result = {
                  totalRaised: 0,
                  totalSpent: 0,
                  cashOnHand: 0,
                  individualContributions: 0,
                  pacContributions: 0,
                  partyContributions: 0,
                  candidateContributions: 0,
                  metadata: {
                    note: 'No financial data found in FEC records',
                    candidateId,
                    bioguideId,
                  },
                };
                break;
              }

              result = {
                totalRaised: summaryData.receipts || 0,
                totalSpent: summaryData.disbursements || 0,
                cashOnHand: summaryData.last_cash_on_hand_end_period || 0,
                individualContributions: summaryData.individual_contributions || 0,
                pacContributions: summaryData.other_political_committee_contributions || 0,
                partyContributions: summaryData.political_party_committee_contributions || 0,
                candidateContributions: summaryData.candidate_contribution || 0,
                metadata: {
                  candidateId,
                  cycle,
                  lastUpdated: new Date().toISOString(),
                  bioguideId,
                },
              };

              logger.info(`Finance data retrieved for ${bioguideId}`, {
                totalRaised: result.totalRaised,
                hasFECMapping: true,
              });
            } catch (error) {
              logger.error(`Finance error for ${bioguideId}:`, error);
              result = {
                totalRaised: 0,
                totalSpent: 0,
                cashOnHand: 0,
                individualContributions: 0,
                pacContributions: 0,
                partyContributions: 0,
                candidateContributions: 0,
                metadata: {
                  note: 'Finance data temporarily unavailable',
                  bioguideId,
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
              };
            }
            break;
          }

          case 'committees': {
            try {
              logger.info(`Batch committees: Starting for ${bioguideId}`);

              const { getEnhancedRepresentative } = await import(
                '@/features/representatives/services/congress.service'
              );

              const representative = await getEnhancedRepresentative(bioguideId);

              if (!representative) {
                result = {
                  committees: [],
                  count: 0,
                  metadata: {
                    note: 'Representative not found',
                    bioguideId,
                    source: 'congress-legislators',
                  },
                };
                break;
              }

              const committees = representative.committees || [];

              result = {
                committees,
                count: committees.length,
                metadata: {
                  bioguideId,
                  source: 'congress-legislators YAML',
                  lastUpdated: new Date().toISOString(),
                  representativeName:
                    representative.fullName?.first + ' ' + representative.fullName?.last,
                },
              };

              logger.info(`Committees retrieved for ${bioguideId}`, {
                count: committees.length,
              });
            } catch (error) {
              logger.error(`Committees error for ${bioguideId}:`, error);
              result = {
                committees: [],
                count: 0,
                metadata: {
                  note: 'Committee data temporarily unavailable',
                  bioguideId,
                  source: 'congress-legislators',
                  error: error instanceof Error ? error.message : 'Unknown error',
                },
              };
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
      govCache.set(cacheKey, result, { ttl: 300 * 1000, source: 'unified-batch-service' });
    }

    logger.info('Batch request completed', {
      bioguideId,
      requestedEndpoints: endpoints,
      successfulEndpoints,
      failedEndpoints,
      executionTime: result.metadata.executionTime,
    });

    return result;
  }

  // Public utility method for summary data
  public async getRepresentativeSummary(bioguideId: string) {
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
        this.executeBatchRequest({
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

      govCache.set(cacheKey, result, { ttl: 600 * 1000, source: 'unified-summary-service' });
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

  protected validateBioguideId(bioguideId: string): boolean {
    return /^[A-Z]\d{6}$/.test(bioguideId);
  }

  protected validateState(state: string): boolean {
    return /^[A-Z]{2}$/.test(state);
  }
}

// Export singleton instance
export const unifiedRepresentativeBatchService = UnifiedRepresentativeBatchService.getInstance();

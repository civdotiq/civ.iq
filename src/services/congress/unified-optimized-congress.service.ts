/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Unified Optimized Congress Service - Refactored Optimized Congress Service
 *
 * This service consolidates the original optimized-congress.service.ts functions to use:
 * - BaseUnifiedService as the foundation
 * - IUnifiedRepresentativeService interface compliance
 * - UnifiedRepresentativeResponse types
 * - Optimized Congress.gov API integration with intelligent pagination
 * - Consistent error handling and response formatting
 *
 * Features:
 * - Intelligent pagination (only fetches what's needed)
 * - Rate limiting for Congress.gov API
 * - Advanced caching strategies
 * - Bills summary optimization
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

// Congress.gov API response types
interface CongressBill {
  number?: string;
  amendmentNumber?: string;
  title?: string;
  introducedDate?: string;
  latestAction?: {
    text?: string;
  };
  congress?: number;
  type?: string;
  policyArea?: {
    name?: string;
  };
  url?: string;
}

interface CongressAPIResponse {
  sponsoredLegislation?: CongressBill[];
  pagination?: {
    count?: number;
  };
}

export interface OptimizedBillsRequest {
  bioguideId: string;
  limit?: number;
  page?: number;
  congress?: number;
  includeAmendments?: boolean;
}

export interface OptimizedBillsResponse {
  bills: Array<{
    id: string;
    number: string;
    title: string;
    introducedDate: string;
    status: string;
    lastAction: string;
    congress: number;
    type: string;
    policyArea?: string;
    url?: string;
  }>;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  metadata: {
    bioguideId: string;
    congress: number;
    cached: boolean;
    executionTime: number;
  };
}

type BillsSummaryResult = {
  currentCongress: { count: number; congress: number };
  totalCareer: number;
  recentBills: Array<{ title: string; date: string; type: string }>;
};

// Rate limiter for Congress.gov API
class CongressRateLimiter {
  private lastCall = 0;
  private readonly minInterval = 100; // 100ms between calls (10 RPS max)

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastCall;

    if (elapsed < this.minInterval) {
      const waitTime = this.minInterval - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastCall = Date.now();
  }
}

const rateLimiter = new CongressRateLimiter();

/**
 * Unified Optimized Congress Service Implementation
 *
 * Refactored from the original function-based optimized congress service to implement
 * the unified service pattern while maintaining performance optimizations.
 */
export class UnifiedOptimizedCongressService
  extends BaseUnifiedService
  implements IUnifiedRepresentativeService
{
  private static instance: UnifiedOptimizedCongressService;

  private constructor() {
    super({
      baseUrl: 'https://api.congress.gov/v3',
      timeout: 10000,
      retries: 3,
      cacheEnabled: true,
      cacheTtl: 1800000, // 30 minutes
    });
  }

  public static getInstance(): UnifiedOptimizedCongressService {
    if (!UnifiedOptimizedCongressService.instance) {
      UnifiedOptimizedCongressService.instance = new UnifiedOptimizedCongressService();
    }
    return UnifiedOptimizedCongressService.instance;
  }

  getServiceInfo() {
    return {
      name: 'UnifiedOptimizedCongressService',
      version: '2.0.0',
      description: 'Unified optimized Congress.gov API service with intelligent pagination',
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retries: this.config.retries,
        cacheEnabled: this.config.cacheEnabled,
        rateLimitEnabled: this.config.rateLimitEnabled,
      },
    };
  }

  // Core unified interface implementations - Limited for Congress.gov focus
  async getRepresentative(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse>> {
    const startTime = Date.now();

    try {
      // This service focuses on bills/legislation data from Congress.gov
      // For basic representative info, other services should be used
      logger.info('Representative data not available in optimized Congress.gov service');

      // Return minimal structure with bills data reference
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
        dataSource: 'optimized-congress.service',
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
      // This service doesn't provide representative listings
      logger.info('Representative listings not available in optimized Congress.gov service');
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
      // This service doesn't provide state-based listings
      logger.info(
        'State-based representative listings not available in optimized Congress.gov service'
      );
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
      // This service doesn't provide search functionality
      logger.info('Representative search not available in optimized Congress.gov service');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Enhanced methods - Core functionality for optimized Congress.gov data
  async getRepresentativeVotes(
    _bioguideId: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<VotingRecord[]>> {
    const startTime = Date.now();

    try {
      // Voting records not implemented in optimized service (focused on bills)
      logger.info('Voting records not available in optimized Congress.gov service');
      return this.formatResponse([], startTime);
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
      const optimizedRequest: OptimizedBillsRequest = {
        bioguideId,
        limit: options?.limit || 25,
        page: options?.page || 1,
        congress: options?.congress || 119,
        includeAmendments: false,
      };

      const optimizedResponse = await this.getOptimizedBillsByMember(optimizedRequest);

      // Transform to unified BillRecord format
      const billRecords: BillRecord[] = optimizedResponse.bills.map(bill => ({
        billId: bill.id,
        title: bill.title,
        introducedDate: bill.introducedDate,
        status: bill.status,
        congress: bill.congress,
        type: bill.type,
        summary: bill.policyArea || undefined,
      }));

      return this.formatResponse(billRecords, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeCommittees(
    _bioguideId: string
  ): Promise<UnifiedServiceResponse<CommitteeRecord[]>> {
    const startTime = Date.now();

    try {
      // Committee records not available in optimized service (focused on bills)
      logger.info('Committee records not available in optimized Congress.gov service');
      return this.formatResponse([], startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  // Legacy compatibility methods
  async getByZipCode(_zipCode: string): Promise<UnifiedRepresentativeResponse[]> {
    // Not supported by Congress.gov API
    return [];
  }

  // Original optimized functionality as private methods
  private async getOptimizedBillsByMember(
    request: OptimizedBillsRequest
  ): Promise<OptimizedBillsResponse> {
    const startTime = Date.now();
    const { bioguideId, limit = 25, page = 1, congress = 119, includeAmendments = false } = request;

    // Check cache first
    const cacheKey = `optimized-bills:${bioguideId}:${congress}:${limit}:${page}:${includeAmendments}`;
    const cached = govCache.get<OptimizedBillsResponse>(cacheKey);

    if (cached) {
      logger.info('Bills cache hit', { bioguideId, congress, cacheKey });
      return {
        ...cached,
        metadata: { ...cached.metadata, cached: true },
      };
    }

    try {
      await rateLimiter.waitIfNeeded();

      const apiKey = process.env.CONGRESS_API_KEY;
      if (!apiKey) {
        throw new Error('Congress API key not configured');
      }

      // Calculate offset for pagination
      const offset = (page - 1) * limit;

      // Fetch only the requested page, not everything
      const url = new URL(`${this.config.baseUrl}/member/${bioguideId}/sponsored-legislation`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('limit', Math.min(limit, 250).toString()); // Cap at API max
      url.searchParams.set('offset', offset.toString());
      url.searchParams.set('congress', congress.toString());
      url.searchParams.set('format', 'json');

      logger.info('Optimized bills API call', {
        bioguideId,
        congress,
        limit,
        page,
        offset,
        url: url.toString().replace(/api_key=[^&]+/, 'api_key=***'),
      });

      const response = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'CIV.IQ/2.0 (Optimized)',
        },
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        throw new Error(`Congress API error: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as CongressAPIResponse;
      const rawBills = data.sponsoredLegislation || [];
      const totalCount = data.pagination?.count || rawBills.length;

      // Transform and filter bills
      const bills = rawBills
        .filter((bill: CongressBill) => {
          // Skip amendments unless specifically requested
          if (!includeAmendments && bill.amendmentNumber) {
            return false;
          }
          return true;
        })
        .map((bill: CongressBill) => ({
          id: bill.number || bill.amendmentNumber || `unknown-${Date.now()}`,
          number: bill.number || bill.amendmentNumber || 'Unknown',
          title: bill.title || 'Title not available',
          introducedDate: bill.introducedDate || '',
          status: bill.latestAction?.text || 'Status unknown',
          lastAction: bill.latestAction?.text || 'No recent action',
          congress: bill.congress || congress,
          type: bill.type || 'Unknown',
          policyArea: bill.policyArea?.name || undefined,
          url: bill.url || undefined,
        }));

      const result: OptimizedBillsResponse = {
        bills,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit),
        },
        metadata: {
          bioguideId,
          congress,
          cached: false,
          executionTime: Date.now() - startTime,
        },
      };

      // Cache for 30 minutes
      govCache.set(cacheKey, result, { ttl: 1800 * 1000, source: 'congress.gov' });

      logger.info('Optimized bills fetch complete', {
        bioguideId,
        congress,
        billCount: bills.length,
        totalAvailable: totalCount,
        executionTime: result.metadata.executionTime,
      });

      return result;
    } catch (error) {
      logger.error('Optimized bills fetch failed', error as Error, {
        bioguideId,
        congress,
        page,
        limit,
      });

      // Return empty result instead of crashing
      return {
        bills: [],
        pagination: { total: 0, page, limit, pages: 0 },
        metadata: {
          bioguideId,
          congress,
          cached: false,
          executionTime: Date.now() - startTime,
        },
      };
    }
  }

  // Public utility method for bills summary
  public async getBillsSummary(bioguideId: string): Promise<BillsSummaryResult> {
    const cacheKey = `bills-summary:${bioguideId}`;
    const cached = govCache.get<BillsSummaryResult>(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Fetch just first page of current congress for stats
      const currentData = await this.getOptimizedBillsByMember({
        bioguideId,
        limit: 10,
        page: 1,
        congress: 119,
      });

      // For total career count, we'd need to query metadata endpoint
      // For now, estimate based on current congress
      const estimatedTotal = currentData.pagination.total * 3; // Rough estimate

      const result = {
        currentCongress: {
          count: currentData.pagination.total,
          congress: 119,
        },
        totalCareer: estimatedTotal,
        recentBills: currentData.bills.slice(0, 5).map(bill => ({
          title: bill.title,
          date: bill.introducedDate,
          type: bill.type,
        })),
      };

      govCache.set(cacheKey, result, { ttl: 3600 * 1000, source: 'congress.gov' }); // Cache for 1 hour
      return result;
    } catch (error) {
      logger.error('Bills summary fetch failed', error as Error, { bioguideId });
      return {
        currentCongress: { count: 0, congress: 119 },
        totalCareer: 0,
        recentBills: [],
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
export const unifiedOptimizedCongressService = UnifiedOptimizedCongressService.getInstance();

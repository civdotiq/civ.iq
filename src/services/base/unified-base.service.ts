/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Base Unified Service Implementation
 *
 * Provides the foundation for all unified services with common functionality:
 * - Configuration management
 * - Error handling
 * - Caching
 * - Rate limiting
 * - Standardized response formatting
 */

import type {
  IUnifiedRepresentativeService,
  IServiceConfig,
  UnifiedServiceResponse,
  ServiceHealthResponse,
  UnifiedRepresentativeResponse,
  VotingRecord,
  BillRecord,
  CommitteeRecord,
  QueryOptions,
} from '../interfaces/unified-service-interfaces';

export abstract class BaseUnifiedService implements IUnifiedRepresentativeService {
  protected config: IServiceConfig;

  constructor(config: Partial<IServiceConfig>) {
    // Apply defaults and validate configuration
    this.config = {
      baseUrl: config.baseUrl || 'https://api.congress.gov/v3',
      apiKey: config.apiKey,
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      cacheEnabled: config.cacheEnabled ?? true,
      cacheTtl: config.cacheTtl || 3600000,
      rateLimitEnabled: config.rateLimitEnabled ?? true,
      rateLimitRequests: config.rateLimitRequests || 100,
      rateLimitWindow: config.rateLimitWindow || 60000,
    };

    if (!this.config.baseUrl) {
      throw new Error('BaseUrl is required in service configuration');
    }
  }

  // Abstract methods that must be implemented by subclasses
  abstract getRepresentative(
    bioguideId: string
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse>>;
  abstract getAllRepresentatives(
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;
  abstract getRepresentativesByState(
    state: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;
  abstract searchRepresentatives(
    query: string,
    options?: QueryOptions
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>>;

  // Default implementations that can be overridden
  async getRepresentativeBatch(
    bioguideIds: string[]
  ): Promise<UnifiedServiceResponse<UnifiedRepresentativeResponse[]>> {
    const startTime = Date.now();

    try {
      const promises = bioguideIds.map(id => this.getRepresentative(id));
      const results = await Promise.allSettled(promises);

      const data = results
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<
            UnifiedServiceResponse<UnifiedRepresentativeResponse>
          > => result.status === 'fulfilled' && result.value.success && result.value.data !== null
        )
        .map(result => result.value.data!);

      return this.formatResponse(data, startTime);
    } catch (error) {
      return this.formatErrorResponse(error, startTime);
    }
  }

  async getRepresentativeVotes(
    _bioguideId: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<VotingRecord[]>> {
    const startTime = Date.now();
    // Default implementation - should be overridden by specific services
    return this.formatResponse([], startTime);
  }

  async getRepresentativeBills(
    _bioguideId: string,
    _options?: QueryOptions
  ): Promise<UnifiedServiceResponse<BillRecord[]>> {
    const startTime = Date.now();
    // Default implementation - should be overridden by specific services
    return this.formatResponse([], startTime);
  }

  async getRepresentativeCommittees(
    _bioguideId: string
  ): Promise<UnifiedServiceResponse<CommitteeRecord[]>> {
    const startTime = Date.now();
    // Default implementation - should be overridden by specific services
    return this.formatResponse([], startTime);
  }

  async healthCheck(): Promise<UnifiedServiceResponse<ServiceHealthResponse>> {
    const startTime = Date.now();

    // Basic health check - can be enhanced by subclasses
    const health: ServiceHealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'up',
        cache: 'up',
        external_apis: 'up',
      },
    };

    return this.formatResponse(health, startTime);
  }

  getServiceInfo() {
    return {
      name: 'BaseUnifiedService',
      version: '2.0.0',
      description: 'Base implementation of unified service interface',
      config: {
        baseUrl: this.config.baseUrl,
        timeout: this.config.timeout,
        retries: this.config.retries,
        cacheEnabled: this.config.cacheEnabled,
        rateLimitEnabled: this.config.rateLimitEnabled,
      },
    };
  }

  async clearCache(): Promise<void> {
    // Default implementation - should be overridden by services with caching
    return Promise.resolve();
  }

  // Helper methods for consistent response formatting
  protected formatResponse<T>(
    data: T,
    startTime: number,
    cacheHit: boolean = false
  ): UnifiedServiceResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cacheHit,
        dataSource: this.config.baseUrl,
        serviceVersion: '2.0.0',
      },
    };
  }

  protected formatErrorResponse<T>(error: unknown, startTime: number): UnifiedServiceResponse<T> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = this.getErrorCode(error);

    return {
      success: false,
      data: null,
      error: {
        code: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cacheHit: false,
        dataSource: this.config.baseUrl,
        serviceVersion: '2.0.0',
      },
    };
  }

  private getErrorCode(error: unknown): string {
    if (error instanceof Error) {
      // Map common error types to standardized codes
      if (error.message.includes('Network') || error.message.includes('ECONNREFUSED')) {
        return 'NETWORK_ERROR';
      }
      if (error.message.includes('timeout')) {
        return 'TIMEOUT_ERROR';
      }
      if (error.message.includes('rate limit')) {
        return 'RATE_LIMIT_EXCEEDED';
      }
      if (error.message.includes('not found')) {
        return 'REPRESENTATIVE_NOT_FOUND';
      }
      if (error.message.includes('invalid') || error.message.includes('bioguide')) {
        return 'INVALID_BIOGUIDE_ID';
      }
    }
    return 'INTERNAL_ERROR';
  }

  // Protected helper methods for subclasses
  protected validateBioguideId(bioguideId: string): boolean {
    // Basic validation - bioguide IDs are typically letter + numbers
    return /^[A-Z]\d{6}$/.test(bioguideId);
  }

  protected validateState(state: string): boolean {
    // Two-letter state codes
    return /^[A-Z]{2}$/.test(state);
  }
}

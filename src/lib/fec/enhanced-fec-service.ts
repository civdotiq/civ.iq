/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Enhanced FEC Service - Performance Optimized Campaign Finance Data Access
 *
 * Builds on the existing FEC API service with:
 * - Committee ID caching for reduced API calls
 * - Batch processing optimizations
 * - Enhanced error resilience
 * - Smart retry logic with exponential backoff
 * - Data quality monitoring
 */

import { fecApiService, FECFinancialSummary, FECContribution } from './fec-api-service';
import { bioguideToFECMapping, getFECIdFromBioguide } from '@/lib/data/bioguide-fec-mapping';
import logger from '@/lib/logging/simple-logger';

// Committee ID cache interface
interface CachedCommitteeInfo {
  committees: string[];
  principalCommittee: string | null;
  lastUpdated: number;
  cycle: number;
}

// Performance metrics interface
interface PerformanceMetrics {
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  lastUpdated: string;
}

// Data quality metrics interface
interface DataQualityMetrics {
  mappingCoverage: number;
  dataAvailabilityRate: number;
  lastValidation: string;
  issuesFound: string[];
}

/**
 * Enhanced FEC Service with performance optimizations
 */
class EnhancedFECService {
  private readonly committeeCache = new Map<string, CachedCommitteeInfo>();
  private readonly performanceMetrics: PerformanceMetrics;
  private readonly retryDelays = [1000, 2000, 4000, 8000]; // Exponential backoff

  constructor() {
    this.performanceMetrics = {
      cacheHitRate: 0,
      averageResponseTime: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get committee IDs with intelligent caching
   */
  async getCommitteeIds(
    candidateId: string,
    cycle: number,
    useCache: boolean = true
  ): Promise<string[]> {
    const cacheKey = `${candidateId}:${cycle}`;
    const startTime = Date.now();

    // Check cache first if enabled
    if (useCache && this.committeeCache.has(cacheKey)) {
      const cached = this.committeeCache.get(cacheKey)!;
      const cacheAge = Date.now() - cached.lastUpdated;

      // Cache valid for 24 hours
      if (cacheAge < 24 * 60 * 60 * 1000) {
        logger.info('[Enhanced FEC] Committee cache hit', { candidateId, cycle });
        this.updateCacheHitMetrics(Date.now() - startTime, true);
        return cached.committees;
      } else {
        // Remove stale cache entry
        this.committeeCache.delete(cacheKey);
      }
    }

    // Fetch from API with retry logic
    const committees = await this.retryOperation(
      () => fecApiService.findCandidateCommitteeIds(candidateId, cycle),
      `getCommitteeIds:${candidateId}:${cycle}`
    );

    // Cache the result
    if (committees.length > 0) {
      this.committeeCache.set(cacheKey, {
        committees,
        principalCommittee: committees[0] || null,
        lastUpdated: Date.now(),
        cycle,
      });
    }

    this.updateCacheHitMetrics(Date.now() - startTime, false);
    return committees;
  }

  /**
   * Get principal committee with caching
   */
  async getPrincipalCommitteeId(candidateId: string, cycle: number): Promise<string | null> {
    const committees = await this.getCommitteeIds(candidateId, cycle);
    return committees.length > 0 ? committees[0]! : null;
  }

  /**
   * Optimized financial summary with enhanced error handling
   */
  async getOptimizedFinancialSummary(
    candidateId: string,
    cycle: number
  ): Promise<FECFinancialSummary | null> {
    return this.retryOperation(
      () => fecApiService.getFinancialSummary(candidateId, cycle),
      `getFinancialSummary:${candidateId}:${cycle}`
    );
  }

  /**
   * Batch process contributions with optimized performance
   */
  async getOptimizedContributions(
    candidateId: string,
    cycle: number,
    maxContributions: number = 1000
  ): Promise<FECContribution[]> {
    const startTime = Date.now();

    try {
      // Use cached committee IDs for better performance
      const committees = await this.getCommitteeIds(candidateId, cycle);

      if (committees.length === 0) {
        logger.warn('[Enhanced FEC] No committees found for contribution fetch', {
          candidateId,
          cycle,
        });
        return [];
      }

      // Fetch contributions with smart batching
      const contributions = await this.retryOperation(
        () => fecApiService.getSampleContributions(candidateId, cycle, maxContributions),
        `getContributions:${candidateId}:${cycle}`
      );

      logger.info('[Enhanced FEC] Contributions fetched successfully', {
        candidateId,
        cycle,
        count: contributions.length,
        responseTime: Date.now() - startTime,
      });

      return contributions;
    } catch (error) {
      logger.error('[Enhanced FEC] Failed to fetch contributions', {
        candidateId,
        cycle,
        error: error instanceof Error ? error.message : String(error),
        responseTime: Date.now() - startTime,
      });
      throw error;
    }
  }

  /**
   * Validate candidate data availability with comprehensive checks
   */
  async validateCandidateData(
    bioguideId: string,
    cycle: number = 2024
  ): Promise<{
    hasFecMapping: boolean;
    fecId: string | null;
    hasFinancialData: boolean;
    hasContributions: boolean;
    dataQuality: 'high' | 'medium' | 'low';
    issues: string[];
  }> {
    const issues: string[] = [];
    const fecId = getFECIdFromBioguide(bioguideId);

    if (!fecId) {
      return {
        hasFecMapping: false,
        fecId: null,
        hasFinancialData: false,
        hasContributions: false,
        dataQuality: 'low',
        issues: ['No FEC mapping found for bioguide ID'],
      };
    }

    try {
      // Check financial data
      const financialSummary = await this.getOptimizedFinancialSummary(fecId, cycle);
      const hasFinancialData = financialSummary !== null;

      if (!hasFinancialData) {
        issues.push(`No financial summary data available for cycle ${cycle}`);
      }

      // Check contribution data
      const contributions = await this.getOptimizedContributions(fecId, cycle, 10);
      const hasContributions = contributions.length > 0;

      if (!hasContributions) {
        issues.push(`No contribution data available for cycle ${cycle}`);
      }

      // Determine data quality
      let dataQuality: 'high' | 'medium' | 'low' = 'low';
      if (hasFinancialData && hasContributions) {
        dataQuality = contributions.length >= 50 ? 'high' : 'medium';
      } else if (hasFinancialData || hasContributions) {
        dataQuality = 'medium';
      }

      return {
        hasFecMapping: true,
        fecId,
        hasFinancialData,
        hasContributions,
        dataQuality,
        issues,
      };
    } catch (error) {
      issues.push(
        `Error validating data: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        hasFecMapping: true,
        fecId,
        hasFinancialData: false,
        hasContributions: false,
        dataQuality: 'low',
        issues,
      };
    }
  }

  /**
   * Generate data quality report for all mappings
   */
  async generateDataQualityReport(sampleSize: number = 50): Promise<DataQualityMetrics> {
    const mappingEntries = Object.entries(bioguideToFECMapping);
    const totalMappings = mappingEntries.length;

    // Sample mappings for validation
    const sampleMappings = mappingEntries
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(sampleSize, totalMappings));

    let availableDataCount = 0;
    const issues: string[] = [];

    for (const [bioguideId, _mapping] of sampleMappings) {
      try {
        const validation = await this.validateCandidateData(bioguideId, 2024);
        if (validation.hasFinancialData || validation.hasContributions) {
          availableDataCount++;
        }
        issues.push(...validation.issues);
      } catch (error) {
        issues.push(
          `Validation failed for ${bioguideId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const dataAvailabilityRate = (availableDataCount / sampleMappings.length) * 100;
    const mappingCoverage = (totalMappings / 535) * 100; // 535 = total Congress

    return {
      mappingCoverage,
      dataAvailabilityRate,
      lastValidation: new Date().toISOString(),
      issuesFound: [...new Set(issues)], // Remove duplicates
    };
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Clear all caches for fresh data
   */
  clearCaches(): void {
    this.committeeCache.clear();
    logger.info('[Enhanced FEC] All caches cleared');
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (attempt > 0) {
          logger.info('[Enhanced FEC] Retry successful', {
            operation: operationName,
            attempt,
          });
        }
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          const delay = this.retryDelays[attempt] || 8000;
          logger.warn('[Enhanced FEC] Operation failed, retrying', {
            operation: operationName,
            attempt: attempt + 1,
            maxRetries,
            retryDelay: delay,
            error: lastError.message,
          });

          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    logger.error('[Enhanced FEC] Operation failed after all retries', {
      operation: operationName,
      maxRetries,
      finalError: lastError!.message,
    });

    throw lastError!;
  }

  /**
   * Update cache hit metrics for performance monitoring
   */
  private updateCacheHitMetrics(responseTime: number, cacheHit: boolean): void {
    // Simple moving average for response time
    this.performanceMetrics.averageResponseTime =
      (this.performanceMetrics.averageResponseTime + responseTime) / 2;

    // Update cache hit rate (simple approximation)
    this.performanceMetrics.cacheHitRate = cacheHit
      ? Math.min(this.performanceMetrics.cacheHitRate + 0.1, 1.0)
      : Math.max(this.performanceMetrics.cacheHitRate - 0.05, 0.0);

    this.performanceMetrics.lastUpdated = new Date().toISOString();
  }
}

// Export singleton instance
export const enhancedFECService = new EnhancedFECService();
export type { PerformanceMetrics, DataQualityMetrics };

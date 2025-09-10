/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Representatives Core Service
 *
 * This service eliminates service-to-self HTTP calls by providing direct
 * function access to representative data. All internal services should
 * use this instead of making fetch() calls to localhost API routes.
 *
 * Key Benefits:
 * - Eliminates network latency for internal calls
 * - Removes circular HTTP dependencies
 * - Provides consistent caching strategy
 * - Centralizes representative data logic
 */

import { getAllEnhancedRepresentatives } from '@/features/representatives/services/congress.service';
import { govCache } from '@/services/cache';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

export class RepresentativesCoreService {
  /**
   * Get all representatives with intelligent caching - DIRECT function call, no HTTP
   */
  static async getAllRepresentatives(): Promise<EnhancedRepresentative[]> {
    const cacheKey = 'core:all-representatives';
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await govCache.get<EnhancedRepresentative[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for all representatives', {
          count: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Direct function call - NO HTTP fetch to localhost!
      logger.info('Fetching representatives via direct service call');
      const representatives = await getAllEnhancedRepresentatives();

      if (!representatives || representatives.length === 0) {
        logger.warn('No representatives returned from congress service');
        return [];
      }

      // Cache the result with appropriate TTL
      await govCache.set(cacheKey, representatives, {
        ttl: 86400000, // 24 hours in milliseconds
        source: 'congress-legislators-direct',
        dataType: 'representatives',
      });

      logger.info('Successfully cached all representatives', {
        count: representatives.length,
        responseTime: Date.now() - startTime,
      });

      return representatives;
    } catch (error) {
      logger.error('Failed to get all representatives', error as Error, {
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get representatives by state - DIRECT data filtering, no HTTP
   */
  static async getRepresentativesByState(state: string): Promise<EnhancedRepresentative[]> {
    const cacheKey = `core:representatives:state:${state}`;
    const startTime = Date.now();

    try {
      // Check state-specific cache first
      const cached = await govCache.get<EnhancedRepresentative[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for state representatives', {
          state,
          count: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Get all representatives and filter in-memory
      const allReps = await this.getAllRepresentatives();
      const stateReps = allReps.filter(rep => rep.state === state.toUpperCase());

      // Cache state-specific results
      await govCache.set(cacheKey, stateReps, {
        ttl: 43200000, // 12 hours
        source: 'congress-legislators-filtered',
        dataType: 'representatives',
      });

      logger.info('Successfully filtered representatives by state', {
        state,
        totalReps: allReps.length,
        stateReps: stateReps.length,
        responseTime: Date.now() - startTime,
      });

      return stateReps;
    } catch (error) {
      logger.error('Failed to get representatives by state', error as Error, {
        state,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Get single representative by bioguide ID - DIRECT lookup, no HTTP
   */
  static async getRepresentativeById(bioguideId: string): Promise<EnhancedRepresentative | null> {
    const cacheKey = `core:representative:${bioguideId}`;
    const startTime = Date.now();

    try {
      // Check individual cache first
      const cached = await govCache.get<EnhancedRepresentative>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for individual representative', {
          bioguideId,
          name: cached.name,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // Get from all representatives and find specific one
      const allReps = await this.getAllRepresentatives();
      const representative = allReps.find(rep => rep.bioguideId === bioguideId);

      if (representative) {
        // Cache individual representative
        await govCache.set(cacheKey, representative, {
          ttl: 3600000, // 1 hour
          source: 'congress-legislators-individual',
          dataType: 'representatives',
        });

        logger.info('Successfully found representative', {
          bioguideId,
          name: representative.name,
          responseTime: Date.now() - startTime,
        });
      } else {
        logger.warn('Representative not found', {
          bioguideId,
          totalRepsSearched: allReps.length,
          responseTime: Date.now() - startTime,
        });
      }

      return representative || null;
    } catch (error) {
      logger.error('Failed to get representative by ID', error as Error, {
        bioguideId,
        responseTime: Date.now() - startTime,
      });
      return null;
    }
  }

  /**
   * Get representatives by ZIP code - DIRECT lookup with district mapping
   */
  static async getRepresentativesByZip(zipCode: string): Promise<EnhancedRepresentative[]> {
    const cacheKey = `core:representatives:zip:${zipCode}`;
    const startTime = Date.now();

    try {
      // Check ZIP-specific cache first
      const cached = await govCache.get<EnhancedRepresentative[]>(cacheKey);
      if (cached) {
        logger.info('Core service cache hit for ZIP representatives', {
          zipCode,
          count: cached.length,
          responseTime: Date.now() - startTime,
        });
        return cached;
      }

      // For now, return empty array - this would integrate with district mapping
      // NOTE: ZIP-to-district mapping service integration pending
      logger.info('ZIP-to-representative mapping not yet implemented in core service', {
        zipCode,
        responseTime: Date.now() - startTime,
      });

      return [];
    } catch (error) {
      logger.error('Failed to get representatives by ZIP', error as Error, {
        zipCode,
        responseTime: Date.now() - startTime,
      });
      return [];
    }
  }

  /**
   * Cache invalidation utilities
   */
  static async invalidateCache(pattern?: string): Promise<void> {
    try {
      if (pattern) {
        await govCache.clear(`core:${pattern}`);
        logger.info('Invalidated core service cache', { pattern });
      } else {
        await govCache.clear('core:');
        logger.info('Invalidated all core service cache');
      }
    } catch (error) {
      logger.error('Failed to invalidate cache', error as Error, { pattern });
    }
  }

  /**
   * Get service health and statistics
   */
  static async getHealthStatus(): Promise<{
    healthy: boolean;
    totalRepresentatives: number;
    cacheStats: Record<string, unknown>;
    lastUpdate: string;
  }> {
    try {
      const representatives = await this.getAllRepresentatives();
      const cacheStats = await govCache.getStats();

      return {
        healthy: representatives.length > 0,
        totalRepresentatives: representatives.length,
        cacheStats,
        lastUpdate: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Health check failed', error as Error);
      return {
        healthy: false,
        totalRepresentatives: 0,
        cacheStats: {},
        lastUpdate: new Date().toISOString(),
      };
    }
  }
}

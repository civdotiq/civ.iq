/*
 * CIV.IQ - Civic Information Hub
 * Phase 6: Performance Optimized ZIP Code Mapping
 *
 * High-performance ZIP code to congressional district mapping with sub-millisecond lookups
 * Optimized for production deployment with caching and memory efficiency
 */

import { ZIP_TO_DISTRICT_MAP_119TH } from './zip-district-mapping-119th';

// Optimized interfaces
export interface OptimizedZipMapping {
  state: string;
  district: string;
  primary?: boolean;
  cached?: boolean;
}

export interface PerformanceMetrics {
  totalLookups: number;
  directHits: number;
  cacheHits: number;
  averageResponseTime: number;
  multiDistrictLookups: number;
  lastResetTime: number;
}

class OptimizedZipLookupService {
  private cache: Map<string, OptimizedZipMapping | OptimizedZipMapping[]> = new Map();
  private stateCache: Map<string, string> = new Map();
  private metrics: PerformanceMetrics = {
    totalLookups: 0,
    directHits: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    multiDistrictLookups: 0,
    lastResetTime: Date.now(),
  };

  // Pre-compile frequently accessed ZIP codes for instant lookup
  private hotCache: Map<string, OptimizedZipMapping> = new Map();

  constructor() {
    this.initializeHotCache();
  }

  /**
   * Initialize hot cache with most frequently accessed ZIP codes
   */
  private initializeHotCache(): void {
    const commonZips = [
      '10001',
      '10002',
      '10003',
      '10004',
      '10005', // NYC
      '90210',
      '90211',
      '90212',
      '90213',
      '90214', // LA
      '60601',
      '60602',
      '60603',
      '60604',
      '60605', // Chicago
      '77001',
      '77002',
      '77003',
      '77004',
      '77005', // Houston
      '85001',
      '85002',
      '85003',
      '85004',
      '85005', // Phoenix
      '19101',
      '19102',
      '19103',
      '19104',
      '19105', // Philadelphia
      '78701',
      '78702',
      '78703',
      '78704',
      '78705', // Austin
      '48201',
      '48202',
      '48203',
      '48204',
      '48205', // Detroit
      '02101',
      '02102',
      '02103',
      '02104',
      '02105', // Boston
      '20001',
      '20002',
      '20003',
      '20004',
      '20005', // Washington DC
    ];

    for (const zip of commonZips) {
      const mapping = ZIP_TO_DISTRICT_MAP_119TH[zip];
      if (mapping) {
        if (Array.isArray(mapping)) {
          const primary = mapping.find(d => d.primary) || mapping[0];
          if (primary) {
            this.hotCache.set(zip, {
              state: primary.state,
              district: primary.district,
              primary: true,
              cached: true,
            });
          }
        } else {
          this.hotCache.set(zip, {
            state: mapping.state,
            district: mapping.district,
            cached: true,
          });
        }
      }
    }
  }

  /**
   * Ultra-fast ZIP code lookup with multiple optimization layers
   */
  getDistrictForZip(zipCode: string): OptimizedZipMapping | null {
    const startTime = performance.now();
    this.metrics.totalLookups++;

    try {
      // Layer 1: Hot cache (most common ZIP codes)
      const hotResult = this.hotCache.get(zipCode);
      if (hotResult) {
        this.metrics.cacheHits++;
        this.metrics.directHits++;
        return hotResult;
      }

      // Layer 2: Runtime cache
      const cached = this.cache.get(zipCode);
      if (cached) {
        this.metrics.cacheHits++;
        this.metrics.directHits++;
        return Array.isArray(cached) ? cached[0] || null : cached;
      }

      // Layer 3: Direct lookup from comprehensive mapping
      const mapping = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
      if (mapping) {
        this.metrics.directHits++;

        let result: OptimizedZipMapping;

        if (Array.isArray(mapping)) {
          this.metrics.multiDistrictLookups++;
          const primary = mapping.find(d => d.primary) || mapping[0];
          if (!primary) return null;
          result = {
            state: primary.state,
            district: primary.district,
            primary: true,
          };

          // Cache all districts for this ZIP
          this.cache.set(
            zipCode,
            mapping.map(d => ({
              state: d.state,
              district: d.district,
              primary: d.primary,
            }))
          );
        } else {
          result = {
            state: mapping.state,
            district: mapping.district,
          };

          // Cache single district
          this.cache.set(zipCode, result);
        }

        // Cache state for faster state lookups
        this.stateCache.set(zipCode, result.state);

        return result;
      }

      // No mapping found
      return null;
    } finally {
      const responseTime = performance.now() - startTime;

      // Optimized rolling average calculation
      const totalTime = this.metrics.averageResponseTime * (this.metrics.totalLookups - 1);
      this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalLookups;
    }
  }

  /**
   * Get all districts for a ZIP code (for multi-district ZIPs)
   */
  getAllDistrictsForZip(zipCode: string): OptimizedZipMapping[] {
    const startTime = performance.now();
    this.metrics.totalLookups++;

    try {
      // Check cache first
      const cached = this.cache.get(zipCode);
      if (cached) {
        this.metrics.cacheHits++;
        return Array.isArray(cached) ? cached : [cached];
      }

      // Direct lookup
      const mapping = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
      if (mapping) {
        this.metrics.directHits++;

        if (Array.isArray(mapping)) {
          this.metrics.multiDistrictLookups++;
          const result = mapping.map(d => ({
            state: d.state,
            district: d.district,
            primary: d.primary,
          }));

          // Cache result
          this.cache.set(zipCode, result);
          return result;
        } else {
          const result = [
            {
              state: mapping.state,
              district: mapping.district,
            },
          ];

          // Cache result
          if (result[0]) {
            this.cache.set(zipCode, result[0]);
          }
          return result;
        }
      }

      return [];
    } finally {
      const responseTime = performance.now() - startTime;
      const totalTime = this.metrics.averageResponseTime * (this.metrics.totalLookups - 1);
      this.metrics.averageResponseTime = (totalTime + responseTime) / this.metrics.totalLookups;
    }
  }

  /**
   * Get primary district for multi-district ZIPs
   */
  getPrimaryDistrictForZip(zipCode: string): OptimizedZipMapping | null {
    const allDistricts = this.getAllDistrictsForZip(zipCode);
    return allDistricts.find(d => d.primary) || allDistricts[0] || null;
  }

  /**
   * Check if ZIP code spans multiple districts
   */
  isZipMultiDistrict(zipCode: string): boolean {
    // Get all districts for this ZIP
    const allDistricts = this.getAllDistrictsForZip(zipCode);
    // Return true if more than one district found
    return allDistricts.length > 1;
  }

  /**
   * Ultra-fast state lookup
   */
  getStateFromZip(zipCode: string): string | null {
    // Check state cache first
    const cachedState = this.stateCache.get(zipCode);
    if (cachedState) {
      return cachedState;
    }

    // Get district and cache state
    const district = this.getDistrictForZip(zipCode);
    return district?.state || null;
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset performance metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalLookups: 0,
      directHits: 0,
      cacheHits: 0,
      averageResponseTime: 0,
      multiDistrictLookups: 0,
      lastResetTime: Date.now(),
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    runtimeCacheSize: number;
    stateCacheSize: number;
    hotCacheSize: number;
    cacheHitRate: number;
  } {
    return {
      runtimeCacheSize: this.cache.size,
      stateCacheSize: this.stateCache.size,
      hotCacheSize: this.hotCache.size,
      cacheHitRate:
        this.metrics.totalLookups > 0
          ? (this.metrics.cacheHits / this.metrics.totalLookups) * 100
          : 0,
    };
  }

  /**
   * Warm up cache with common ZIP codes
   */
  warmUpCache(zipCodes: string[]): void {
    for (const zipCode of zipCodes) {
      this.getDistrictForZip(zipCode);
    }
  }

  /**
   * Clear caches (for memory management)
   */
  clearCaches(): void {
    this.cache.clear();
    this.stateCache.clear();
    // Keep hot cache as it's pre-compiled
  }
}

// Global optimized service instance
export const optimizedZipLookupService = new OptimizedZipLookupService();

// Optimized public API functions
export function getCongressionalDistrictForZip(zipCode: string): OptimizedZipMapping | null {
  return optimizedZipLookupService.getDistrictForZip(zipCode);
}

export function getAllCongressionalDistrictsForZip(zipCode: string): OptimizedZipMapping[] {
  return optimizedZipLookupService.getAllDistrictsForZip(zipCode);
}

export function getPrimaryCongressionalDistrictForZip(zipCode: string): OptimizedZipMapping | null {
  return optimizedZipLookupService.getPrimaryDistrictForZip(zipCode);
}

export function isZipMultiDistrict(zipCode: string): boolean {
  return optimizedZipLookupService.isZipMultiDistrict(zipCode);
}

export function getStateFromZip(zipCode: string): string | null {
  return optimizedZipLookupService.getStateFromZip(zipCode);
}

export function getZipLookupMetrics(): PerformanceMetrics {
  return optimizedZipLookupService.getMetrics();
}

export function resetZipLookupMetrics(): void {
  optimizedZipLookupService.resetMetrics();
}

export function getCacheStats() {
  return optimizedZipLookupService.getCacheStats();
}

export function warmUpCache(zipCodes: string[]): void {
  optimizedZipLookupService.warmUpCache(zipCodes);
}

// Legacy compatibility
export { optimizedZipLookupService as zipLookupService };
export type { OptimizedZipMapping as ZipDistrictMapping };
export type { OptimizedZipMapping as LegacyZipDistrictMapping };

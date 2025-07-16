/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Integrated ZIP to Congressional District mapping for 119th Congress (2025-2027)
// Phase 3: Integration with Existing System
// Combines comprehensive 119th Congress data with existing system compatibility

import { 
  ZIP_TO_DISTRICT_MAP_119TH, 
  getDistrictForZip,
  getPrimaryDistrictForZip,
  isMultiDistrictZip,
  getAllDistrictsForZip,
  ZIP_MAPPING_STATS,
  type ZipDistrictMapping 
} from './zip-district-mapping-119th';

// Legacy interface for backward compatibility
export interface LegacyZipDistrictMapping {
  state: string;
  district: string;
  primary?: boolean;
}

// Performance monitoring
interface PerformanceMetrics {
  totalLookups: number;
  directHits: number;
  fallbackUses: number;
  averageResponseTime: number;
  multiDistrictLookups: number;
}

class ZipDistrictLookupService {
  private metrics: PerformanceMetrics = {
    totalLookups: 0,
    directHits: 0,
    fallbackUses: 0,
    averageResponseTime: 0,
    multiDistrictLookups: 0
  };

  /**
   * Get district for ZIP code with performance monitoring
   * Compatible with existing system expectations
   */
  getDistrictForZip(zipCode: string): LegacyZipDistrictMapping | null {
    const startTime = performance.now();
    this.metrics.totalLookups++;

    try {
      // Use comprehensive 119th Congress mapping
      const result = getDistrictForZip(zipCode);
      
      if (result) {
        this.metrics.directHits++;
        
        // Handle multi-district ZIPs by returning primary district
        if (Array.isArray(result)) {
          this.metrics.multiDistrictLookups++;
          const primaryDistrict = result.find(d => d.primary) || result[0];
          return {
            state: primaryDistrict.state,
            district: primaryDistrict.district,
            primary: true
          };
        }
        
        // Single district ZIP
        return {
          state: result.state,
          district: result.district
        };
      }
      
      // No mapping found
      return null;
      
    } finally {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      // Update average response time
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (this.metrics.totalLookups - 1)) + responseTime) / 
        this.metrics.totalLookups;
    }
  }

  /**
   * Get primary district for ZIP code (optimized for multi-district ZIPs)
   */
  getPrimaryDistrictForZip(zipCode: string): LegacyZipDistrictMapping | null {
    const startTime = performance.now();
    this.metrics.totalLookups++;

    try {
      const result = getPrimaryDistrictForZip(zipCode);
      
      if (result) {
        this.metrics.directHits++;
        return {
          state: result.state,
          district: result.district,
          primary: result.primary
        };
      }
      
      return null;
      
    } finally {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (this.metrics.totalLookups - 1)) + responseTime) / 
        this.metrics.totalLookups;
    }
  }

  /**
   * Get all districts for ZIP code (for multi-district handling)
   */
  getAllDistrictsForZip(zipCode: string): LegacyZipDistrictMapping[] {
    const startTime = performance.now();
    this.metrics.totalLookups++;

    try {
      const result = getAllDistrictsForZip(zipCode);
      
      if (result.length > 0) {
        this.metrics.directHits++;
        
        if (result.length > 1) {
          this.metrics.multiDistrictLookups++;
        }
        
        return result.map(d => ({
          state: d.state,
          district: d.district,
          primary: d.primary
        }));
      }
      
      return [];
      
    } finally {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.metrics.averageResponseTime = 
        ((this.metrics.averageResponseTime * (this.metrics.totalLookups - 1)) + responseTime) / 
        this.metrics.totalLookups;
    }
  }

  /**
   * Check if ZIP code spans multiple districts
   */
  isMultiDistrictZip(zipCode: string): boolean {
    return isMultiDistrictZip(zipCode);
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
      fallbackUses: 0,
      averageResponseTime: 0,
      multiDistrictLookups: 0
    };
  }

  /**
   * Get coverage statistics
   */
  getCoverageStats() {
    return {
      ...ZIP_MAPPING_STATS,
      hitRate: this.metrics.totalLookups > 0 ? 
        (this.metrics.directHits / this.metrics.totalLookups) * 100 : 0,
      averageResponseTime: this.metrics.averageResponseTime,
      multiDistrictPercentage: this.metrics.totalLookups > 0 ?
        (this.metrics.multiDistrictLookups / this.metrics.totalLookups) * 100 : 0
    };
  }
}

// Create singleton instance
const zipLookupService = new ZipDistrictLookupService();

// Export legacy-compatible functions
export const ZIP_TO_DISTRICT_MAP = new Proxy({} as Record<string, LegacyZipDistrictMapping>, {
  get(target, prop: string) {
    if (typeof prop === 'string' && /^\d{5}$/.test(prop)) {
      return zipLookupService.getDistrictForZip(prop);
    }
    return undefined;
  },
  has(target, prop: string) {
    if (typeof prop === 'string' && /^\d{5}$/.test(prop)) {
      return zipLookupService.getDistrictForZip(prop) !== null;
    }
    return false;
  },
  ownKeys(target) {
    // Return all ZIP codes for enumeration
    return Object.keys(ZIP_TO_DISTRICT_MAP_119TH);
  },
  getOwnPropertyDescriptor(target, prop) {
    if (typeof prop === 'string' && /^\d{5}$/.test(prop)) {
      const value = zipLookupService.getDistrictForZip(prop);
      if (value) {
        return {
          enumerable: true,
          configurable: true,
          value
        };
      }
    }
    return undefined;
  }
});

// Export service functions and types
export {
  zipLookupService
};

// Export types with clear names
export type { ZipDistrictMapping };
export type { PerformanceMetrics };
// LegacyZipDistrictMapping is already exported as interface above

// Export utility functions with legacy compatibility
export function getCongressionalDistrictForZip(zipCode: string): LegacyZipDistrictMapping | null {
  return zipLookupService.getDistrictForZip(zipCode);
}

export function getPrimaryCongressionalDistrictForZip(zipCode: string): LegacyZipDistrictMapping | null {
  return zipLookupService.getPrimaryDistrictForZip(zipCode);
}

export function getAllCongressionalDistrictsForZip(zipCode: string): LegacyZipDistrictMapping[] {
  return zipLookupService.getAllDistrictsForZip(zipCode);
}

export function isZipMultiDistrict(zipCode: string): boolean {
  return zipLookupService.isMultiDistrictZip(zipCode);
}

// Export statistics
export const ZIP_DISTRICT_STATS = ZIP_MAPPING_STATS;

// Export performance monitoring
export function getZipLookupMetrics(): PerformanceMetrics {
  return zipLookupService.getMetrics();
}

export function getZipCoverageStats() {
  return zipLookupService.getCoverageStats();
}

export function resetZipLookupMetrics(): void {
  zipLookupService.resetMetrics();
}

// State-level fallback for ZIP codes not in our mapping
export function getStateFromZip(zip: string): string | null {
  const zipNum = parseInt(zip.substring(0, 3));
  
  if (zipNum >= 100 && zipNum <= 149) return 'NY';
  if (zipNum >= 150 && zipNum <= 196) return 'PA';
  if (zipNum >= 197 && zipNum <= 199) return 'DE';
  if (zipNum >= 200 && zipNum <= 219) return 'DC';
  if (zipNum >= 220 && zipNum <= 246) return 'VA';
  if (zipNum >= 247 && zipNum <= 269) return 'WV';
  if (zipNum >= 270 && zipNum <= 289) return 'NC';
  if (zipNum >= 290 && zipNum <= 299) return 'SC';
  if (zipNum >= 300 && zipNum <= 319) return 'GA';
  if (zipNum >= 320 && zipNum <= 349) return 'FL';
  if (zipNum >= 350 && zipNum <= 369) return 'AL';
  if (zipNum >= 370 && zipNum <= 385) return 'TN';
  if (zipNum >= 386 && zipNum <= 399) return 'MS';
  if (zipNum >= 400 && zipNum <= 429) return 'KY';
  if (zipNum >= 430 && zipNum <= 459) return 'OH';
  if (zipNum >= 460 && zipNum <= 479) return 'IN';
  if (zipNum >= 480 && zipNum <= 499) return 'MI';
  if (zipNum >= 500 && zipNum <= 529) return 'IA';
  if (zipNum >= 530 && zipNum <= 549) return 'WI';
  if (zipNum >= 550 && zipNum <= 567) return 'MN';
  if (zipNum >= 570 && zipNum <= 579) return 'SD';
  if (zipNum >= 580 && zipNum <= 589) return 'ND';
  if (zipNum >= 590 && zipNum <= 599) return 'MT';
  if (zipNum >= 600 && zipNum <= 629) return 'IL';
  if (zipNum >= 630 && zipNum <= 659) return 'MO';
  if (zipNum >= 660 && zipNum <= 679) return 'KS';
  if (zipNum >= 680 && zipNum <= 699) return 'NE';
  if (zipNum >= 700 && zipNum <= 715) return 'LA';
  if (zipNum >= 716 && zipNum <= 729) return 'AR';
  if (zipNum >= 730 && zipNum <= 749) return 'OK';
  if (zipNum >= 750 && zipNum <= 799) return 'TX';
  if (zipNum >= 800 && zipNum <= 819) return 'CO';
  if (zipNum >= 820 && zipNum <= 831) return 'WY';
  if (zipNum >= 832 && zipNum <= 839) return 'ID';
  if (zipNum >= 840 && zipNum <= 849) return 'UT';
  if (zipNum >= 850 && zipNum <= 869) return 'AZ';
  if (zipNum >= 870 && zipNum <= 884) return 'NM';
  if (zipNum >= 889 && zipNum <= 899) return 'NV';
  if (zipNum >= 900 && zipNum <= 966) return 'CA';
  if (zipNum >= 967 && zipNum <= 968) return 'HI';
  if (zipNum >= 970 && zipNum <= 979) return 'OR';
  if (zipNum >= 980 && zipNum <= 994) return 'WA';
  if (zipNum >= 995 && zipNum <= 999) return 'AK';
  
  return null;
}

// Migration helper - log when legacy patterns are used
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('🎯 CIV.IQ ZIP District Mapping: 119th Congress comprehensive data loaded');
  console.log(`📊 Coverage: ${ZIP_MAPPING_STATS.totalZips.toLocaleString()} ZIP codes`);
  console.log(`🗺️ Multi-district ZIPs: ${ZIP_MAPPING_STATS.multiDistrictZips.toLocaleString()}`);
}
/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  calculateCookPVI,
  getEnhancedGeographicData,
  handleMultiDistrictZip,
  cookPVICache,
  geographicCache,
  multiDistrictCache,
  type MultiDistrictInfo,
} from '@/lib/services/district-enhancement.service';
import { getCongressionalDistrictForZip } from '@/lib/data/zip-district-mapping-integrated';

interface EnhancedDistrictData {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    bioguideId: string;
    imageUrl?: string;
    yearsInOffice?: number;
  };
  demographics?: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
    white_percent: number;
    black_percent: number;
    hispanic_percent: number;
    asian_percent: number;
    poverty_rate: number;
    bachelor_degree_percent: number;
  };
  political: {
    cookPVI: string;
    cookPVIConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
    cookPVISource: string;
    lastElection: {
      winner: string;
      margin: number;
      turnout: number;
    };
    registeredVoters: number;
  };
  geography: {
    area: number;
    counties: string[];
    majorCities: string[];
    realCounties?: string[];
    realCities?: string[];
    populationDensity?: number;
    ruralPercentage?: number;
  };
  wikidata?: {
    established?: string;
    area?: number;
    previousRepresentatives?: string[];
    wikipediaUrl?: string;
    capital?: string;
    governor?: string;
    motto?: string;
    nickname?: string;
  } | null;
}

interface UseEnhancedDistrictDataResult {
  data: EnhancedDistrictData | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
  multiDistrictInfo?: MultiDistrictInfo;
  isMultiDistrict: boolean;
  prefetchDistrict: (districtId: string) => Promise<void>;
  cacheStatus: {
    hasData: boolean;
    cacheSize: number;
    lastUpdated?: string;
  };
}

// Cache for prefetched district data
const districtDataCache = new Map<string, { data: EnhancedDistrictData; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Enhanced district data hook with production-ready features
 * Includes Cook PVI calculation, real geographic data, multi-district handling, and performance optimizations
 */
export function useEnhancedDistrictData(
  zipCode: string | null,
  options: {
    enablePrefetch?: boolean;
    enableMultiDistrict?: boolean;
    cacheStrategy?: 'stale-while-revalidate' | 'cache-first' | 'network-first';
  } = {}
): UseEnhancedDistrictDataResult {
  const {
    enablePrefetch = true,
    enableMultiDistrict = true,
    cacheStrategy = 'stale-while-revalidate',
  } = options;

  const [data, setData] = useState<EnhancedDistrictData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [multiDistrictInfo, setMultiDistrictInfo] = useState<MultiDistrictInfo | undefined>();

  // Get district mapping from ZIP code or parse district ID
  const zipMapping = useMemo(() => {
    if (!zipCode) return null;

    // Check if input is a district ID (e.g., "SC-04")
    const districtIdMatch = zipCode.match(/^([A-Z]{2})-(\d{1,2})$/);
    if (districtIdMatch) {
      const [, state, district] = districtIdMatch;
      return { state, district: district?.padStart(2, '0') || '00' };
    }

    // Otherwise treat as ZIP code
    return getCongressionalDistrictForZip(zipCode);
  }, [zipCode]);

  const isMultiDistrict = useMemo(() => {
    return enableMultiDistrict && Array.isArray(zipMapping);
  }, [enableMultiDistrict, zipMapping]);

  const districtId = useMemo(() => {
    if (!zipMapping) return null;
    if (Array.isArray(zipMapping)) {
      const primary = zipMapping.find(d => d.primary);
      const district = primary || zipMapping[0];
      return district ? `${district.state}-${district.district}` : null;
    }
    return `${zipMapping.state}-${zipMapping.district}`;
  }, [zipMapping]);

  // Handle multi-district ZIP codes
  useEffect(() => {
    if (isMultiDistrict && Array.isArray(zipMapping) && zipCode) {
      const cached = multiDistrictCache.get(zipCode);
      if (cached) {
        setMultiDistrictInfo(cached);
      } else {
        const info = handleMultiDistrictZip(zipCode, zipMapping);
        multiDistrictCache.set(zipCode, info, CACHE_TTL);
        setMultiDistrictInfo(info);
      }
    } else {
      setMultiDistrictInfo(undefined);
    }
  }, [isMultiDistrict, zipMapping, zipCode]);

  // Prefetch function for performance optimization
  const prefetchDistrict = useCallback(
    async (targetDistrictId: string): Promise<void> => {
      if (!enablePrefetch) return;

      try {
        const cached = districtDataCache.get(targetDistrictId);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          return; // Already cached and fresh
        }

        const response = await fetch(`/api/districts/${targetDistrictId}`);
        if (!response.ok) return;

        const result = await response.json();
        if (!result.success || !result.district) return;

        const enhancedData = await enhanceDistrictData(result.district);
        districtDataCache.set(targetDistrictId, {
          data: enhancedData,
          timestamp: Date.now(),
        });
      } catch {
        // Silently fail prefetch to not affect main functionality
        // Note: Prefetch failures are expected and should not affect main functionality
      }
    },
    [enablePrefetch]
  );

  // Enhanced district data fetching with caching strategies
  const fetchDistrictData = useCallback(
    async (targetDistrictId: string) => {
      try {
        setLoading(true);
        setError(null);

        // Check cache first
        const cached = districtDataCache.get(targetDistrictId);
        const isStale = cached && Date.now() - cached.timestamp > CACHE_TTL;

        // Implement caching strategy
        if (cacheStrategy === 'cache-first' && cached && !isStale) {
          setData(cached.data);
          setLoading(false);
          return;
        }

        if (cacheStrategy === 'stale-while-revalidate' && cached) {
          // Use stale data immediately, then revalidate
          setData(cached.data);
          if (!isStale) {
            setLoading(false);
            return;
          }
        }

        // Fetch from API
        const response = await fetch(`/api/districts/${targetDistrictId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch district data: ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.error?.message || 'Failed to load district data');
        }

        // Enhance the district data with new features
        const enhancedData = await enhanceDistrictData(result.district);

        // Update cache
        districtDataCache.set(targetDistrictId, {
          data: enhancedData,
          timestamp: Date.now(),
        });

        setData(enhancedData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load district data';
        setError(errorMessage);
        setData(null);

        // If we have stale cached data, keep it visible with error indication
        if (cacheStrategy === 'stale-while-revalidate') {
          const cached = districtDataCache.get(targetDistrictId);
          if (cached) {
            setData(cached.data);
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [cacheStrategy]
  );

  // Retry function
  const retry = useCallback(() => {
    if (districtId) {
      fetchDistrictData(districtId);
    }
  }, [districtId, fetchDistrictData]);

  // Main data fetching effect
  useEffect(() => {
    if (!zipCode) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    if (!districtId) {
      // ZIP code provided but no district mapping found
      setData(null);
      setLoading(false);
      setError(
        `ZIP code ${zipCode} could not be mapped to a congressional district. This may be a new or unmapped ZIP code.`
      );
      return;
    }

    fetchDistrictData(districtId);
  }, [zipCode, districtId, fetchDistrictData]);

  // Cache status information
  const cacheStatus = useMemo(() => {
    const cached = districtId ? districtDataCache.get(districtId) : null;
    return {
      hasData: !!cached,
      cacheSize: districtDataCache.size,
      lastUpdated: cached ? new Date(cached.timestamp).toISOString() : undefined,
    };
  }, [districtId]);

  return {
    data,
    loading,
    error,
    retry,
    multiDistrictInfo,
    isMultiDistrict,
    prefetchDistrict,
    cacheStatus,
  };
}

/**
 * Enhance district data with Cook PVI and geographic information
 */
async function enhanceDistrictData(baseData: EnhancedDistrictData): Promise<EnhancedDistrictData> {
  const districtId = `${baseData.state}-${baseData.number}`;

  // Calculate Cook PVI with caching
  let cookPVIData = cookPVICache.get(districtId);
  if (!cookPVIData) {
    cookPVIData = calculateCookPVI(districtId);
    cookPVICache.set(districtId, cookPVIData, CACHE_TTL);
  }

  // Get enhanced geographic data with caching
  let geographicData = geographicCache.get(districtId);
  if (!geographicData) {
    geographicData = getEnhancedGeographicData(baseData.state, baseData.number);
    geographicCache.set(districtId, geographicData, CACHE_TTL);
  }

  return {
    ...baseData,
    political: {
      ...baseData.political,
      cookPVI: cookPVIData.pvi,
      cookPVIConfidence: cookPVIData.confidence,
      cookPVISource: cookPVIData.dataSource,
    },
    geography: {
      ...baseData.geography,
      realCounties: geographicData.realCounties,
      realCities: geographicData.realCities,
      populationDensity: geographicData.populationDensity ?? undefined,
      ruralPercentage: geographicData.ruralPercentage ?? undefined,
      // Use real data if available, fall back to existing
      counties:
        geographicData.realCounties?.length > 0
          ? geographicData.realCounties
          : baseData.geography?.counties || [],
      majorCities:
        geographicData.realCities?.length > 0
          ? geographicData.realCities
          : baseData.geography?.majorCities || [],
    },
  };
}

/**
 * Hook for prefetching district data based on ZIP input
 * Useful for implementing debounced prefetching on ZIP input fields
 */
export function useDistrictPrefetch() {
  const [prefetchStats, setPrefetchStats] = useState({
    prefetched: 0,
    cacheHits: 0,
    cacheMisses: 0,
  });

  const prefetchByZip = useCallback(async (zipCode: string) => {
    const zipMapping = getCongressionalDistrictForZip(zipCode);
    if (!zipMapping) return;

    const districts = Array.isArray(zipMapping) ? zipMapping : [zipMapping];

    for (const district of districts) {
      const districtId = `${district.state}-${district.district}`;
      const cached = districtDataCache.get(districtId);

      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        setPrefetchStats(prev => ({ ...prev, cacheHits: prev.cacheHits + 1 }));
        continue;
      }

      try {
        const response = await fetch(`/api/districts/${districtId}`);
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.district) {
            const enhancedData = await enhanceDistrictData(result.district);
            districtDataCache.set(districtId, {
              data: enhancedData,
              timestamp: Date.now(),
            });
            setPrefetchStats(prev => ({ ...prev, prefetched: prev.prefetched + 1 }));
          }
        }
      } catch {
        setPrefetchStats(prev => ({ ...prev, cacheMisses: prev.cacheMisses + 1 }));
      }
    }
  }, []);

  return { prefetchByZip, prefetchStats };
}

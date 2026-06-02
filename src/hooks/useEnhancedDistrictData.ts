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
// Type-only import — erased at build time, so it adds no runtime weight. The
// ~2MB ZIP->district map behind this module is loaded lazily via dynamic
// import() at the call sites below, keeping it out of the initial client bundle.
import type { LegacyZipDistrictMapping } from '@/lib/data/zip-district-mapping-integrated';

type ZipMappingResult = LegacyZipDistrictMapping | { state: string; district: string } | null;

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

  // Resolve ZIP / district-ID input to a district mapping. District IDs (e.g.
  // "SC-04") resolve synchronously; a ZIP code lazily imports the large
  // ZIP->district map so its ~2MB stays out of the initial client bundle.
  // `mappingResolved` distinguishes "still resolving" from "resolved to null"
  // so the fetch effect below doesn't flash a transient "not found" error.
  const [zipMapping, setZipMapping] = useState<ZipMappingResult>(null);
  const [mappingResolved, setMappingResolved] = useState(false);

  useEffect(() => {
    if (!zipCode) {
      setZipMapping(null);
      setMappingResolved(true);
      return;
    }

    // Check if input is a district ID (e.g., "SC-04")
    const districtIdMatch = zipCode.match(/^([A-Z]{2})-(\d{1,2})$/);
    if (districtIdMatch) {
      const [, state, district] = districtIdMatch;
      setZipMapping({ state: state ?? '', district: district?.padStart(2, '0') || '00' });
      setMappingResolved(true);
      return;
    }

    // Otherwise treat as ZIP code — load the map on demand.
    let cancelled = false;
    setMappingResolved(false);
    void (async () => {
      try {
        const { getCongressionalDistrictForZip } = await import(
          '@/lib/data/zip-district-mapping-integrated'
        );
        if (!cancelled) setZipMapping(getCongressionalDistrictForZip(zipCode));
      } catch {
        if (!cancelled) setZipMapping(null);
      } finally {
        if (!cancelled) setMappingResolved(true);
      }
    })();

    return () => {
      cancelled = true;
    };
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
        // /api/districts/[id] returns { district, metadata } on success (no
        // `success` flag); HTTP errors are already filtered by response.ok above.
        if (!result.district) return;

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

        // Success shape is { district, metadata } — no `success` flag. A
        // non-ok HTTP status was already thrown above; a 200 without a district
        // payload is the only remaining failure case.
        if (!result.district) {
          throw new Error('Failed to load district data');
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

    // ZIP->district resolution still in flight (lazy map import). Keep the UI
    // in a loading state rather than flashing a "not found" error.
    if (!mappingResolved) {
      setLoading(true);
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
  }, [zipCode, districtId, mappingResolved, fetchDistrictData]);

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
    const { getCongressionalDistrictForZip } = await import(
      '@/lib/data/zip-district-mapping-integrated'
    );
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
          if (result.district) {
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

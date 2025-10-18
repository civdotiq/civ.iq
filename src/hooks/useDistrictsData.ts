/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import { useCallback } from 'react';
import logger from '@/lib/logging/simple-logger';

// Types
interface District {
  id: string;
  state: string;
  number: string;
  name: string;
  representative: {
    name: string;
    party: string;
    imageUrl?: string;
  };
  demographics: {
    population: number;
    medianIncome: number;
    medianAge: number;
    diversityIndex: number;
    urbanPercentage: number;
  };
  political: {
    cookPVI: string;
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
  };
}

interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

interface UseDistrictsDataReturn {
  districts: District[];
  apiLoading: boolean;
  error: string | null;
  errorType: 'network' | 'server' | 'rate-limit' | 'timeout' | 'unknown' | null;
  retryCount: number;
  retry: () => void;
  fetchDuration: number | null;
  cacheStatus: 'hit' | 'miss' | 'stale' | 'none';
  circuitState: 'closed' | 'open' | 'half-open';
  pagination?: PaginationInfo;
  loadMore?: () => void;
}

interface CachedData {
  districts: District[];
  timestamp: number;
}

interface ApiResponse {
  districts: District[];
  pagination?: PaginationInfo;
}

// Configuration
const CACHE_KEY = 'districts-data-v1';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes fresh
const STALE_TTL = 24 * 60 * 60 * 1000; // 24 hours stale

// LocalStorage helpers
function getCachedDistricts(): District[] {
  if (typeof window === 'undefined') return [];

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return [];

    const parsed: CachedData = JSON.parse(cached);
    const age = Date.now() - parsed.timestamp;

    // Use stale data if within 24 hours
    if (age < STALE_TTL) {
      logger.info('[Districts] Using cached data', { age: Math.round(age / 1000) + 's' });
      return parsed.districts;
    }

    return [];
  } catch (err) {
    logger.error('[Districts] Cache read error', err as Error);
    return [];
  }
}

function saveCachedDistricts(districts: District[]) {
  if (typeof window === 'undefined') return;

  try {
    const data: CachedData = {
      districts,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    logger.info('[Districts] Saved to cache', { count: districts.length });
  } catch (err) {
    logger.error('[Districts] Cache write error', err as Error);
  }
}

function getCacheAge(): number | null {
  if (typeof window === 'undefined') return null;

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const parsed: CachedData = JSON.parse(cached);
    return Date.now() - parsed.timestamp;
  } catch {
    return null;
  }
}

// Fetcher with timeout and error handling
async function fetcher(url: string): Promise<ApiResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'max-age=300' },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & {
        status: number;
      };
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

export function useDistrictsData(): UseDistrictsDataReturn {
  // SWR with stale-while-revalidate
  const { data, error, isLoading, mutate } = useSWR<ApiResponse>('/api/districts/all', fetcher, {
    refreshInterval: CACHE_TTL,
    revalidateOnFocus: false,
    fallbackData: { districts: getCachedDistricts() },
    onSuccess: data => {
      if (data?.districts?.length > 0) {
        saveCachedDistricts(data.districts);
      }
    },
    shouldRetryOnError: err => {
      // Don't retry on rate limit
      return !err?.message?.includes('429');
    },
  });

  // Determine cache status
  const cacheAge = getCacheAge();
  let cacheStatus: UseDistrictsDataReturn['cacheStatus'] = 'none';
  if (cacheAge !== null) {
    if (cacheAge < CACHE_TTL) {
      cacheStatus = 'hit';
    } else if (cacheAge < STALE_TTL) {
      cacheStatus = 'stale';
    } else {
      cacheStatus = 'miss';
    }
  }

  // Analyze error type
  let errorType: UseDistrictsDataReturn['errorType'] = null;
  let errorMessage: string | null = null;

  if (error) {
    if (error.name === 'AbortError') {
      errorType = 'timeout';
      errorMessage = 'Request timed out. Please check your connection.';
    } else if (error.message?.includes('429')) {
      errorType = 'rate-limit';
      errorMessage = 'Too many requests. Please wait a moment.';
    } else if (error.message?.match(/50[0-3]/)) {
      errorType = 'server';
      errorMessage = 'Server error. The service may be temporarily unavailable.';
    } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
      errorType = 'network';
      errorMessage = 'Network error. Please check your internet connection.';
    } else {
      errorType = 'unknown';
      errorMessage = 'An unexpected error occurred. Please try again.';
    }

    logger.error('[Districts] Fetch error', { error, type: errorType });
  }

  // Manual retry
  const retry = useCallback(() => {
    logger.info('[Districts] Manual retry triggered');
    mutate();
  }, [mutate]);

  return {
    districts: data?.districts || [],
    apiLoading: isLoading,
    error: errorMessage,
    errorType,
    retryCount: 0, // SWR handles retries internally
    retry,
    fetchDuration: null, // Simplified - not tracking granular timing
    cacheStatus,
    circuitState: 'closed', // Removed circuit breaker complexity
    pagination: data?.pagination,
  };
}

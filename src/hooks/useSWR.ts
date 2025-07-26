/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR, { SWRConfiguration, mutate } from 'swr';
import { representativeApi, RepresentativeApiError } from '@/lib/api/representatives';
import { structuredLogger } from '@/lib/logging/universal-logger';
import { RepresentativeProfile } from '@/types/representative';

// Enhanced SWR configuration with intelligent caching and background revalidation
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false, // Don't revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when reconnecting to internet
  refreshInterval: 0, // Disable automatic polling by default
  dedupingInterval: 5000, // Dedupe requests within 5 seconds
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 1000, // Wait 1 second between retries
  shouldRetryOnError: (error: RepresentativeApiError) => {
    // Don't retry on 4xx errors (client errors)
    return error.statusCode >= 500;
  },
  onError: (error: RepresentativeApiError, key: string) => {
    structuredLogger.error('SWR request failed', {
      error,
      key,
      statusCode: error.statusCode,
      endpoint: error.endpoint,
    });
  },
  onSuccess: (data: unknown, key: string) => {
    structuredLogger.info('SWR request succeeded', {
      key,
      dataType: typeof data,
      hasData: !!data,
    });
  },
};

// Fetcher function that uses our existing API client
const fetcher = async (url: string) => {
  // Extract the endpoint from the URL for our API client
  if (url.startsWith('/api/representative/')) {
    const bioguideId = url.split('/')[3];
    const endpoint = url.split('/').slice(4).join('/');

    switch (endpoint) {
      case '':
        return representativeApi.getProfile(bioguideId);
      case 'votes':
        return representativeApi.getVotes(bioguideId);
      case 'bills':
        return representativeApi.getBills(bioguideId);
      case 'finance':
        return representativeApi.getFinance(bioguideId);
      case 'news':
        return representativeApi.getNews(bioguideId);
      case 'party-alignment':
        return representativeApi.getPartyAlignment(bioguideId);
      case 'committees':
        return representativeApi.getCommittees(bioguideId);
      case 'leadership':
        return representativeApi.getLeadership(bioguideId);
      case 'district':
        return representativeApi.getDistrict(bioguideId);
      default:
        throw new Error(`Unknown endpoint: ${endpoint}`);
    }
  }

  if (url.startsWith('/api/representatives')) {
    const urlObj = new URL(url, 'http://localhost');
    const searchParams = Object.fromEntries(urlObj.searchParams.entries());

    if (searchParams.zip) {
      return representativeApi.getByZip(searchParams.zip);
    } else {
      return representativeApi.search(searchParams);
    }
  }

  throw new Error(`Unsupported URL: ${url}`);
};

// Custom hooks for different data types with optimized caching strategies

/**
 * Hook for fetching representative profile with intelligent caching
 */
export function useRepresentativeProfile(bioguideId: string | null) {
  return useSWR(bioguideId ? `/api/representative/${bioguideId}` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    revalidateOnMount: true,
  });
}

/**
 * Hook for fetching voting records with frequent updates
 */
export function useRepresentativeVotes(bioguideId: string | null) {
  return useSWR(bioguideId ? `/api/representative/${bioguideId}/votes` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes for real-time votes
    revalidateOnMount: true,
    revalidateOnFocus: true, // Enable focus revalidation for voting data
  });
}

/**
 * Hook for fetching bills with moderate update frequency
 */
export function useRepresentativeBills(bioguideId: string | null) {
  return useSWR(bioguideId ? `/api/representative/${bioguideId}/bills` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 15 * 60 * 1000, // Refresh every 15 minutes
  });
}

/**
 * Hook for fetching campaign finance data with less frequent updates
 */
export function useRepresentativeFinance(bioguideId: string | null) {
  return useSWR(bioguideId ? `/api/representative/${bioguideId}/finance` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 30 * 60 * 1000, // Refresh every 30 minutes
  });
}

/**
 * Hook for fetching news with high update frequency
 */
export function useRepresentativeNews(bioguideId: string | null) {
  return useSWR(bioguideId ? `/api/representative/${bioguideId}/news` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 3 * 60 * 1000, // Refresh every 3 minutes for news
    revalidateOnFocus: true, // Enable focus revalidation for news
  });
}

/**
 * Hook for fetching party alignment data
 */
export function useRepresentativePartyAlignment(bioguideId: string | null) {
  return useSWR(bioguideId ? `/api/representative/${bioguideId}/party-alignment` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 60 * 60 * 1000, // Refresh every hour
  });
}

/**
 * Hook for searching representatives
 */
export function useRepresentativeSearch(
  params: {
    zip?: string;
    state?: string;
    district?: string;
    party?: string;
    chamber?: string;
    query?: string;
  } | null
) {
  const searchParams = params
    ? new URLSearchParams(Object.entries(params).filter(([_, value]) => value)).toString()
    : null;

  return useSWR(searchParams ? `/api/representatives?${searchParams}` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
  });
}

/**
 * Hook for fetching representatives by ZIP code
 */
export function useRepresentativesByZip(zipCode: string | null) {
  return useSWR(zipCode ? `/api/representatives?zip=${zipCode}` : null, fetcher, {
    ...defaultConfig,
    refreshInterval: 15 * 60 * 1000, // Refresh every 15 minutes
    dedupingInterval: 30000, // ZIP lookups are expensive, dedupe for 30 seconds
  });
}

/**
 * Optimized batch hook for representative data
 * Uses multiple SWR calls with intelligent dependency loading
 */
export function useRepresentativeBatch(
  bioguideId: string | null,
  options: {
    includeVotes?: boolean;
    includeBills?: boolean;
    includeFinance?: boolean;
    includeNews?: boolean;
    includePartyAlignment?: boolean;
  } = {}
) {
  const profile = useRepresentativeProfile(bioguideId);

  // Only fetch additional data if profile is loaded and options are enabled
  const shouldLoadVotes = options.includeVotes && profile.data && !profile.error;
  const shouldLoadBills = options.includeBills && profile.data && !profile.error;
  const shouldLoadFinance = options.includeFinance && profile.data && !profile.error;
  const shouldLoadNews = options.includeNews && profile.data && !profile.error;
  const shouldLoadPartyAlignment = options.includePartyAlignment && profile.data && !profile.error;

  const votes = useRepresentativeVotes(shouldLoadVotes ? bioguideId : null);
  const bills = useRepresentativeBills(shouldLoadBills ? bioguideId : null);
  const finance = useRepresentativeFinance(shouldLoadFinance ? bioguideId : null);
  const news = useRepresentativeNews(shouldLoadNews ? bioguideId : null);
  const partyAlignment = useRepresentativePartyAlignment(
    shouldLoadPartyAlignment ? bioguideId : null
  );

  return {
    profile,
    votes: options.includeVotes ? votes : { data: null, error: null, isLoading: false },
    bills: options.includeBills ? bills : { data: null, error: null, isLoading: false },
    finance: options.includeFinance ? finance : { data: null, error: null, isLoading: false },
    news: options.includeNews ? news : { data: null, error: null, isLoading: false },
    partyAlignment: options.includePartyAlignment
      ? partyAlignment
      : { data: null, error: null, isLoading: false },
    isLoading:
      profile.isLoading ||
      (options.includeVotes && votes.isLoading) ||
      (options.includeBills && bills.isLoading) ||
      (options.includeFinance && finance.isLoading) ||
      (options.includeNews && news.isLoading) ||
      (options.includePartyAlignment && partyAlignment.isLoading),
    error:
      profile.error ||
      votes.error ||
      bills.error ||
      finance.error ||
      news.error ||
      partyAlignment.error,
  };
}

/**
 * Cache management utilities
 */
export const swrCache = {
  /**
   * Manually revalidate a specific representative's data
   */
  revalidateRepresentative: async (bioguideId: string) => {
    const keys = [
      `/api/representative/${bioguideId}`,
      `/api/representative/${bioguideId}/votes`,
      `/api/representative/${bioguideId}/bills`,
      `/api/representative/${bioguideId}/finance`,
      `/api/representative/${bioguideId}/news`,
      `/api/representative/${bioguideId}/party-alignment`,
    ];

    await Promise.all(keys.map(key => mutate(key)));
  },

  /**
   * Clear cache for a specific representative
   */
  clearRepresentative: async (bioguideId: string) => {
    const keys = [
      `/api/representative/${bioguideId}`,
      `/api/representative/${bioguideId}/votes`,
      `/api/representative/${bioguideId}/bills`,
      `/api/representative/${bioguideId}/finance`,
      `/api/representative/${bioguideId}/news`,
      `/api/representative/${bioguideId}/party-alignment`,
    ];

    await Promise.all(keys.map(key => mutate(key, undefined, { revalidate: false })));
  },

  /**
   * Prefetch representative data for faster navigation
   */
  prefetchRepresentative: async (bioguideId: string) => {
    await mutate(`/api/representative/${bioguideId}`, fetcher(`/api/representative/${bioguideId}`));
  },

  /**
   * Update representative data optimistically
   */
  updateRepresentative: async (bioguideId: string, data: Partial<RepresentativeProfile>) => {
    await mutate(
      `/api/representative/${bioguideId}`,
      (current: RepresentativeProfile | undefined) =>
        current ? { ...current, ...data } : undefined,
      { revalidate: false }
    );
  },
};

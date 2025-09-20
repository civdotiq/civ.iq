/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { GDELTArticle, GDELTError, GDELTErrorType, Result } from '@/types/gdelt';
import { BaseRepresentative } from '@/types/representative';

export interface GDELTNewsOptions {
  readonly timespan?: string;
  readonly maxrecords?: number;
  readonly refreshInterval?: number;
  readonly enabled?: boolean;
  readonly dedupingInterval?: number;
  readonly errorRetryCount?: number;
  readonly errorRetryInterval?: number;
}

export interface GDELTNewsResponse {
  readonly data: GDELTArticle[] | undefined;
  readonly error: GDELTError | undefined;
  readonly isLoading: boolean;
  readonly isValidating: boolean;
  readonly mutate: () => Promise<Result<GDELTArticle[], GDELTError> | undefined>;
}

/**
 * SWR-based hook for fetching GDELT news with intelligent caching
 *
 * Features:
 * - Automatic background revalidation every 30 minutes
 * - Deduplication window to prevent redundant requests
 * - Error retry with exponential backoff
 * - Client-side caching with SWR
 * - Type-safe error handling
 */
export function useGDELTNews(
  member: BaseRepresentative | null,
  options: GDELTNewsOptions = {}
): GDELTNewsResponse {
  const {
    timespan = '7days',
    maxrecords = 50,
    refreshInterval = 30 * 60 * 1000, // 30 minutes
    enabled = true,
    dedupingInterval = 5 * 60 * 1000, // 5 minutes - prevent duplicate requests
    errorRetryCount = 3,
    errorRetryInterval = 5000, // 5 seconds base interval
  } = options;

  // Generate cache key
  const cacheKey =
    member && enabled ? `gdelt-member-${member.bioguideId}-${timespan}-${maxrecords}` : null;

  // Fetcher function
  const fetcher = async (_key: string): Promise<Result<GDELTArticle[], GDELTError>> => {
    try {
      const response = await fetch(
        `/api/representative/${member!.bioguideId}/news?timespan=${timespan}&maxrecords=${maxrecords}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // Handle API response structure
      if (result.error) {
        return { error: result.error };
      }

      return { data: result.articles || [] };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  };

  // Configure SWR with optimized settings
  const { data, error, isLoading, isValidating, mutate } = useSWR(cacheKey, fetcher, {
    refreshInterval,
    dedupingInterval,
    errorRetryCount,
    errorRetryInterval,
    revalidateOnFocus: false, // Don't revalidate on window focus
    revalidateOnReconnect: true, // Revalidate when network reconnects
    shouldRetryOnError: (error: Error & { status?: number }) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      return true;
    },
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      // Exponential backoff with jitter
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) + Math.random() * 1000;
      setTimeout(() => revalidate({ retryCount }), delay);
    },
  });

  return {
    data: data?.data,
    error:
      data?.error ||
      (error
        ? {
            type: GDELTErrorType.NETWORK_ERROR,
            message: error.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          }
        : undefined),
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for fetching general GDELT articles (not member-specific)
 */
export function useGDELTQuery(
  query: string | null,
  options: GDELTNewsOptions = {}
): GDELTNewsResponse {
  const {
    timespan = '7days',
    maxrecords = 50,
    refreshInterval = 30 * 60 * 1000,
    enabled = true,
    dedupingInterval = 5 * 60 * 1000,
    errorRetryCount = 3,
    errorRetryInterval = 5000,
  } = options;

  // Generate cache key
  const cacheKey =
    query && enabled ? `gdelt-query-${encodeURIComponent(query)}-${timespan}-${maxrecords}` : null;

  // Fetcher function
  const fetcher = async (_key: string): Promise<Result<GDELTArticle[], GDELTError>> => {
    try {
      const searchParams = new URLSearchParams({
        query: query!,
        timespan,
        maxrecords: maxrecords.toString(),
      });

      const response = await fetch(`/api/gdelt/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        return { error: result.error };
      }

      return { data: result.articles || [] };
    } catch (error) {
      return {
        error: {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(cacheKey, fetcher, {
    refreshInterval,
    dedupingInterval,
    errorRetryCount,
    errorRetryInterval,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    shouldRetryOnError: (error: Error & { status?: number }) => {
      if (error?.status && error.status >= 400 && error.status < 500) {
        return false;
      }
      return true;
    },
    onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 30000) + Math.random() * 1000;
      setTimeout(() => revalidate({ retryCount }), delay);
    },
  });

  return {
    data: data?.data,
    error:
      data?.error ||
      (error
        ? {
            type: GDELTErrorType.NETWORK_ERROR,
            message: error.message || 'Unknown error',
            timestamp: new Date().toISOString(),
          }
        : undefined),
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Hook for bulk fetching GDELT articles for multiple members
 * Uses batch API endpoint for efficiency
 */
export function useGDELTBatchNews(
  members: BaseRepresentative[],
  options: GDELTNewsOptions = {}
): {
  readonly data: Map<string, GDELTArticle[]> | undefined;
  readonly error: GDELTError | undefined;
  readonly isLoading: boolean;
  readonly isValidating: boolean;
  readonly mutate: () => Promise<Map<string, GDELTArticle[]> | undefined>;
} {
  const {
    timespan = '7days',
    maxrecords = 50,
    refreshInterval = 30 * 60 * 1000,
    enabled = true,
    dedupingInterval = 10 * 60 * 1000, // Longer deduping for batch requests
    errorRetryCount = 2, // Fewer retries for batch requests
    errorRetryInterval = 10000,
  } = options;

  // Generate cache key based on all member IDs
  const memberIds = members.map(m => m.bioguideId).sort();
  const cacheKey =
    memberIds.length > 0 && enabled
      ? `gdelt-batch-${memberIds.join(',')}-${timespan}-${maxrecords}`
      : null;

  // Fetcher function for batch requests
  const fetcher = async (_key: string): Promise<Map<string, GDELTArticle[]>> => {
    const response = await fetch('/api/gdelt/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bioguideIds: memberIds,
        timespan,
        maxrecords,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error.message);
    }

    // Convert array response to Map
    const resultMap = new Map<string, GDELTArticle[]>();
    if (result.results) {
      Object.entries(result.results).forEach(([bioguideId, articles]) => {
        resultMap.set(bioguideId, articles as GDELTArticle[]);
      });
    }

    return resultMap;
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(cacheKey, fetcher, {
    refreshInterval,
    dedupingInterval,
    errorRetryCount,
    errorRetryInterval,
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
  });

  return {
    data,
    error: error
      ? {
          type: GDELTErrorType.NETWORK_ERROR,
          message: error.message || 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      : undefined,
    isLoading,
    isValidating,
    mutate,
  };
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { SWRConfig } from 'swr';
import logger from '@/lib/logging/simple-logger';

// Enhanced fetcher with better error handling and performance
const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & {
      statusCode: number;
    };
    error.statusCode = response.status;
    throw error;
  }
  return response.json();
};

// Global SWR configuration for the entire application
const swrConfig = {
  fetcher,

  // Enhanced cache management
  revalidateOnFocus: false, // Don't revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when reconnecting to internet
  refreshInterval: 0, // Disable automatic polling by default (set per hook)
  dedupingInterval: 2000, // Dedupe identical requests within 2 seconds (reduced for better performance)

  // Background revalidation for better UX
  revalidateIfStale: true, // Revalidate stale data in background
  revalidateOnMount: true, // Always revalidate on component mount

  // Error handling and retries
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 1000, // Wait 1 second between retries
  shouldRetryOnError: (error: Error) => {
    // Don't retry on client errors (4xx), only server errors (5xx)
    if ('statusCode' in error) {
      return (error as { statusCode: number }).statusCode >= 500;
    }
    return true;
  },

  // Logging and monitoring
  onError: (error: Error, key: string) => {
    logger.error('SWR request failed', {
      error,
      key,
      component: 'SWRProvider',
    });
  },

  onSuccess: (data: unknown, key: string) => {
    logger.debug('SWR request succeeded', {
      key,
      dataType: typeof data,
      hasData: !!data,
      component: 'SWRProvider',
    });
  },

  onLoadingSlow: (key: string) => {
    logger.warn('SWR request is taking longer than expected', {
      key,
      component: 'SWRProvider',
    });
  },

  // Performance optimizations
  loadingTimeout: 5000, // Consider request slow after 5 seconds
  focusThrottleInterval: 5000, // Throttle focus revalidation

  // Memory management
  keepPreviousData: true, // Keep previous data while fetching new data

  // Cache time-to-live (5 minutes for representative data)
  compare: (a: unknown, b: unknown) => {
    // Custom comparison for representative data to prevent unnecessary re-renders
    if (typeof a === 'object' && typeof b === 'object' && a && b) {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return a === b;
  },
};

interface SWRProviderProps {
  children: React.ReactNode;
}

/**
 * SWR Provider component that wraps the entire application
 * Provides intelligent caching, background revalidation, and error handling
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return <SWRConfig value={swrConfig}>{children}</SWRConfig>;
}

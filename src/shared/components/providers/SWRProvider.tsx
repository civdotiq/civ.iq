/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { SWRConfig } from 'swr';
import { structuredLogger } from '@/lib/logging/universal-logger';

// Global SWR configuration for the entire application
const swrConfig = {
  // Cache management
  revalidateOnFocus: false, // Don't revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when reconnecting to internet
  refreshInterval: 0, // Disable automatic polling by default (set per hook)
  dedupingInterval: 5000, // Dedupe requests within 5 seconds

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
    structuredLogger.error('SWR request failed', {
      error,
      key,
      component: 'SWRProvider',
    });
  },

  onSuccess: (data: unknown, key: string) => {
    structuredLogger.debug('SWR request succeeded', {
      key,
      dataType: typeof data,
      hasData: !!data,
      component: 'SWRProvider',
    });
  },

  onLoadingSlow: (key: string) => {
    structuredLogger.warn('SWR request is taking longer than expected', {
      key,
      component: 'SWRProvider',
    });
  },

  // Performance optimizations
  loadingTimeout: 5000, // Consider request slow after 5 seconds
  focusThrottleInterval: 5000, // Throttle focus revalidation

  // Memory management
  keepPreviousData: true, // Keep previous data while fetching new data
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

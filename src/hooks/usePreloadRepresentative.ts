/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { preload } from 'swr';
import { useCallback } from 'react';

// Enhanced fetcher matching SWRProvider
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

/**
 * Hook for strategic preloading of representative data
 * Improves perceived performance by loading likely-needed data
 */
export function usePreloadRepresentative() {
  const preloadRepresentative = useCallback((bioguideId: string) => {
    // Preload core representative data
    preload(`/api/representative/${bioguideId}`, fetcher);

    // Preload commonly accessed tabs (bills and voting records)
    preload(`/api/representative/${bioguideId}/bills`, fetcher);
    preload(`/api/representative/${bioguideId}/votes-simple`, fetcher);
  }, []);

  const preloadDistrict = useCallback((districtId: string) => {
    // Preload district overview
    preload(`/api/districts/${districtId}`, fetcher);
  }, []);

  return {
    preloadRepresentative,
    preloadDistrict,
  };
}

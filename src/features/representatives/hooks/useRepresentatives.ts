/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import { Representative } from '@/features/representatives/services/congress-api';

import type { BackboneResponse } from '@/types/backbone-response';

// /api/representatives returns a BackboneResponse envelope
type RepresentativesResponse = BackboneResponse<{
  representatives: Representative[];
  lookup: string;
  metadata: {
    dataSource: string;
    freshness?: string;
    timestamp: string;
  };
}> & {
  error?: {
    code: string;
    message: string;
    details?: string;
  };
};

// SWR fetcher function
const fetcher = async (url: string): Promise<RepresentativesResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

/**
 * Hook to fetch representatives by ZIP code with automatic caching
 */
export function useRepresentativesByZip(zipCode: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RepresentativesResponse>(
    zipCode ? `/api/representatives?zip=${zipCode}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    representatives: data?.data?.representatives || [],
    metadata: data?.data?.metadata,
    dataQuality: data?.dataQuality,
    accuracyNote: data?.accuracyNote,
    isLoading,
    error: error || data?.error,
    refetch: mutate,
  };
}

/**
 * Hook to fetch representatives by state and district with automatic caching
 */
export function useRepresentativesByDistrict(state: string | null, district: string | null) {
  const { data, error, isLoading, mutate } = useSWR<RepresentativesResponse>(
    state && district ? `/api/representatives?state=${state}&district=${district}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10 * 60 * 1000, // 10 minutes (longer for district data)
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    representatives: data?.data?.representatives || [],
    metadata: data?.data?.metadata,
    dataQuality: data?.dataQuality,
    accuracyNote: data?.accuracyNote,
    isLoading,
    error: error || data?.error,
    refetch: mutate,
  };
}

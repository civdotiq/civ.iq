/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import { Representative } from '@/features/representatives/services/congress-api';

interface RepresentativesResponse {
  success: boolean;
  representatives: Representative[];
  metadata?: {
    dataQuality?: 'high' | 'medium' | 'low' | 'unavailable';
    dataSource: string;
    freshness?: string;
    validationScore?: number;
    timestamp: string;
    validationStatus?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

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
    representatives: data?.representatives || [],
    metadata: data?.metadata,
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
    representatives: data?.representatives || [],
    metadata: data?.metadata,
    isLoading,
    error: error || data?.error,
    refetch: mutate,
  };
}

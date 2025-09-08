/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR, { SWRConfiguration } from 'swr';
import logger from '@/lib/logging/simple-logger';

// SINGLE batch data fetcher - all hooks share this data
function useBatchData(bioguideId: string | null, config?: SWRConfiguration) {
  return useSWR(
    bioguideId ? `/api/representative/${bioguideId}/batch` : null,
    () =>
      fetch(`/api/representative/${bioguideId}/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoints: ['bills', 'finance', 'committees', 'votes'] })
      }).then(res => res.json()).then(data => {
        // DEBUG: Log the actual response structure
        console.log('[DEBUG] Batch API response:', data);
        return data;
      }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Share cache between all hooks
      ...config
    }
  );
}

// Individual hooks now extract their data from the shared batch response
export function useRepresentativeBills(bioguideId: string | null) {
  const { data: batchData, error, isLoading } = useBatchData(bioguideId);

  return {
    data: batchData?.data?.bills || null,
    error,
    isLoading,
  };
}

export function useRepresentativeFinance(bioguideId: string | null) {
  const { data: batchData, error, isLoading } = useBatchData(bioguideId);

  return {
    data: batchData?.data?.finance || null,
    error,
    isLoading,
  };
}

export function useRepresentativeCommittees(bioguideId: string | null) {
  const { data: batchData, error, isLoading } = useBatchData(bioguideId);

  return {
    data: batchData?.data?.committees || null,
    error,
    isLoading,
  };
}

export function useRepresentativeVotes(bioguideId: string | null) {
  const { data: batchData, error, isLoading } = useBatchData(bioguideId);

  return {
    data: batchData?.data?.votes || null,
    error,
    isLoading,
  };
}

// Keep other hooks that don't use batch API
export function useRepresentativeNews(bioguideId: string | null) {
  return useSWR(
    bioguideId ? `/api/representative/${bioguideId}/news` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      refreshInterval: 3 * 60 * 1000, // Refresh every 3 minutes for news
    }
  );
}

export function useRepresentativePartyAlignment(bioguideId: string | null) {
  return useSWR(
    bioguideId ? `/api/representative/${bioguideId}/party-alignment` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      refreshInterval: 60 * 60 * 1000, // Refresh every hour
    }
  );
}

export function useRepresentativeProfile(bioguideId: string | null) {
  return useSWR(
    bioguideId ? `/api/representative/${bioguideId}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    }
  );
}

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

  return useSWR(
    searchParams ? `/api/representatives?${searchParams}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      refreshInterval: 10 * 60 * 1000, // Refresh every 10 minutes
    }
  );
}

export function useRepresentativesByZip(zipCode: string | null) {
  return useSWR(
    zipCode ? `/api/representatives?zip=${zipCode}` : null,
    (url: string) => fetch(url).then(res => res.json()),
    {
      revalidateOnFocus: false,
      refreshInterval: 15 * 60 * 1000, // Refresh every 15 minutes
      dedupingInterval: 30000, // ZIP lookups are expensive, dedupe for 30 seconds
    }
  );
}

// MIGRATION NOTICE: These hooks now use the batch API for better performance
// The individual endpoints (/bills, /finance, /committees, /votes) can be removed
// after verifying all consumers have been updated

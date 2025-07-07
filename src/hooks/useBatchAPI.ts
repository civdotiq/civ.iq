import { useState, useEffect, useCallback } from 'react';

interface BatchAPIResult {
  data: Record<string, any>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  metadata?: {
    timestamp: string;
    requestedEndpoints: string[];
    successfulEndpoints: string[];
    failedEndpoints: string[];
    totalTime: number;
  };
}

/**
 * Custom hook for using the batch API to fetch multiple endpoints in parallel
 * This optimizes performance by reducing the number of round-trip requests
 */
export function useBatchAPI(
  bioguideId: string,
  endpoints: string[],
  options: {
    enabled?: boolean;
    refetchOnMount?: boolean;
  } = {}
): BatchAPIResult {
  const { enabled = true, refetchOnMount = true } = options;
  
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<BatchAPIResult['metadata']>();

  const fetchBatchData = useCallback(async () => {
    if (!bioguideId || endpoints.length === 0 || !enabled) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/representative/${bioguideId}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoints,
          bioguideId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error('Batch API request failed');
      }

      setData(result.data);
      setMetadata(result.metadata);
      
      // Log any individual endpoint errors
      if (Object.keys(result.errors).length > 0) {
        console.warn('Some endpoints failed:', result.errors);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Batch API error:', err);
    } finally {
      setLoading(false);
    }
  }, [bioguideId, endpoints, enabled]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchBatchData();
    }
  }, [fetchBatchData, refetchOnMount]);

  return {
    data,
    loading,
    error,
    refetch: fetchBatchData,
    metadata
  };
}

/**
 * Specialized hook for representative profile data
 * Pre-configured with the most commonly needed endpoints
 */
export function useRepresentativeProfile(
  bioguideId: string,
  options: {
    includeVotes?: boolean;
    includeBills?: boolean;
    includeFinance?: boolean;
    includeNews?: boolean;
    includePartyAlignment?: boolean;
    enabled?: boolean;
  } = {}
): BatchAPIResult {
  const {
    includeVotes = true,
    includeBills = true,
    includeFinance = true,
    includeNews = true,
    includePartyAlignment = true,
    enabled = true
  } = options;

  const endpoints = ['profile'];
  
  if (includeVotes) endpoints.push('votes');
  if (includeBills) endpoints.push('bills');
  if (includeFinance) endpoints.push('finance');
  if (includeNews) endpoints.push('news');
  if (includePartyAlignment) endpoints.push('party-alignment');
  
  return useBatchAPI(bioguideId, endpoints, { enabled });
}

/**
 * Hook for fetching specific data subsets
 */
export function useRepresentativeData(
  bioguideId: string,
  dataTypes: ('votes' | 'bills' | 'finance' | 'news' | 'committees' | 'party-alignment' | 'leadership')[],
  enabled: boolean = true
): BatchAPIResult {
  return useBatchAPI(bioguideId, ['profile', ...dataTypes], { enabled });
}
/*
 * CIV.IQ - Civic Information Hub
 * Copyright (C) 2025 Mark Sandford
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 *
 * For commercial licensing inquiries: mark@marksandford.dev
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { representativeApi, RepresentativeApiError } from '@/lib/api/representatives';

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
  partialErrors?: Record<string, string>; // Added for better error handling
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
  const [partialErrors, setPartialErrors] = useState<Record<string, string>>({});
  
  // Use ref to track mounted state to prevent memory leaks
  const mountedRef = useRef(true);

  const fetchBatchData = useCallback(async () => {
    if (!bioguideId || endpoints.length === 0 || !enabled) {
      console.log('[CIV.IQ-DEBUG] useBatchAPI: Skipping fetch - invalid params', {
        bioguideId: !!bioguideId,
        endpointsLength: endpoints.length,
        enabled
      });
      return;
    }

    try {
      console.log('[CIV.IQ-DEBUG] useBatchAPI: Starting batch fetch', {
        bioguideId,
        endpoints,
        endpointCount: endpoints.length
      });
      
      setLoading(true);
      setError(null);
      setPartialErrors({});

      // Use the API client instead of direct fetch
      const result = await representativeApi.getProfileBatch(bioguideId, {
        includeVotes: endpoints.includes('votes'),
        includeBills: endpoints.includes('bills'),
        includeFinance: endpoints.includes('finance'),
        includeNews: endpoints.includes('news'),
        includePartyAlignment: endpoints.includes('party-alignment'),
        includeCommittees: endpoints.includes('committees'),
        includeLeadership: endpoints.includes('leadership'),
        includeDistrict: endpoints.includes('district'),
      });

      // Only update state if component is still mounted
      if (!mountedRef.current) {
        console.log('[CIV.IQ-DEBUG] useBatchAPI: Component unmounted, skipping state update');
        return;
      }

      console.log('[CIV.IQ-DEBUG] useBatchAPI: Batch fetch completed', {
        success: result.success,
        dataEndpoints: Object.keys(result.data || {}),
        errorEndpoints: Object.keys(result.errors || {}),
        executionTime: result.executionTime
      });

      setData(result.data || {});
      setMetadata(result.metadata);
      setPartialErrors(result.errors || {});
      
      // Log partial errors for debugging
      if (result.errors && Object.keys(result.errors).length > 0) {
        console.warn('[CIV.IQ-DEBUG] useBatchAPI: Some endpoints failed:', result.errors);
      }
      
    } catch (err) {
      console.error('[CIV.IQ-DEBUG] useBatchAPI: Batch fetch error:', err);
      
      // Only update state if component is still mounted
      if (!mountedRef.current) {
        return;
      }

      if (err instanceof RepresentativeApiError) {
        setError(`${err.message} (${err.statusCode})`);
      } else {
        setError(err instanceof Error ? err.message : 'An error occurred');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [bioguideId, endpoints, enabled]);

  useEffect(() => {
    if (refetchOnMount) {
      fetchBatchData();
    }
  }, [fetchBatchData, refetchOnMount]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchBatchData,
    metadata,
    partialErrors
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
'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import logger from '@/lib/logging/simple-logger';
import type { CampaignFinanceResponse } from '@/types/api/representatives.types';

// API Response wrapper types for standardized parsing
interface ApiResponseWrapper<T> {
  data?: T;
  results?: T;
  items?: T;
  [key: string]: unknown;
}

// Specific response types for each API endpoint
type FinanceApiResponse =
  | CampaignFinanceResponse
  | ApiResponseWrapper<CampaignFinanceResponse['data']>
  | unknown;

// Campaign Finance Data Fetcher
interface CampaignFinanceWrapperProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
  };
  CampaignFinanceVisualizer: React.ComponentType<{
    financeData: unknown;
    representative: { name: string; party: string };
    bioguideId: string;
  }>;
}

export function CampaignFinanceWrapper({
  bioguideId,
  representative,
  CampaignFinanceVisualizer,
}: CampaignFinanceWrapperProps) {
  const url = `/api/representative/${bioguideId}/finance`;
  // eslint-disable-next-line no-console
  console.log('🔵 SWR attempting fetch for', url);
  const {
    data: rawFinanceData,
    error,
    isLoading,
  } = useSWR(
    url,
    async (url: string): Promise<CampaignFinanceResponse['data'] | null> => {
      try {
        logger.info('Finance SWR fetching', { bioguideId, url });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as FinanceApiResponse;
        logger.info('Finance SWR raw response', {
          bioguideId,
          dataType: typeof data,
          hasFinance: data && typeof data === 'object' && 'finance' in data,
          hasData: data && typeof data === 'object' && 'data' in data,
        });

        // Handle different response formats
        let processedData: CampaignFinanceResponse['data'] | null = null;
        if (data && typeof data === 'object') {
          // If response has a finance or data property, use that
          if ('finance' in data) processedData = data.finance as CampaignFinanceResponse['data'];
          else if ('data' in data) processedData = data.data as CampaignFinanceResponse['data'];
          // Otherwise return the response directly
          else processedData = data as CampaignFinanceResponse['data'];
        }

        logger.info('Finance SWR processed data', {
          bioguideId,
          hasProcessedData: !!processedData,
          dataKeys:
            processedData && typeof processedData === 'object' ? Object.keys(processedData) : [],
        });
        return processedData;
      } catch (error) {
        logger.error('Finance SWR error', error, { bioguideId });
        throw new Error(
          `Failed to load campaign finance data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  // Standardize finance data parsing
  const financeData = rawFinanceData && typeof rawFinanceData === 'object' ? rawFinanceData : null;

  // Comprehensive data lifecycle logging
  // eslint-disable-next-line no-console
  console.log('📊 DATA STATE:', {
    url,
    isLoading,
    hasError: !!error,
    dataLength: Array.isArray(rawFinanceData) ? rawFinanceData.length : 'not array',
    firstItem: Array.isArray(rawFinanceData) ? rawFinanceData[0] : rawFinanceData,
    rawData: rawFinanceData,
  });

  // Track SWR states globally
  if (typeof window !== 'undefined') {
    (window as unknown as { SWR_STATES: Record<string, unknown> }).SWR_STATES =
      (window as unknown as { SWR_STATES: Record<string, unknown> }).SWR_STATES || {};
    (window as unknown as { SWR_STATES: Record<string, unknown> }).SWR_STATES['finance'] = {
      loading: isLoading,
      data: !!rawFinanceData,
      error: !!error,
    };
  }

  // Data structure analysis
  // eslint-disable-next-line no-console
  console.log('Data structure:', {
    direct: Array.isArray(rawFinanceData) ? rawFinanceData.length : typeof rawFinanceData,
    wrapped_data:
      rawFinanceData && typeof rawFinanceData === 'object' && 'data' in rawFinanceData
        ? Object.keys((rawFinanceData as { data: unknown }).data as object).length
        : 'no data prop',
    wrapped_items:
      rawFinanceData && typeof rawFinanceData === 'object' && 'items' in rawFinanceData
        ? (rawFinanceData as { items: unknown[] }).items?.length || 0
        : 'no items prop',
  });

  // Render verification logging
  if (financeData && Object.keys(financeData).length > 0) {
    // eslint-disable-next-line no-console
    console.log('✅ RENDERING finance data with', Object.keys(financeData).length, 'properties');
  } else {
    // eslint-disable-next-line no-console
    console.log('❌ NOT RENDERING finance, data:', financeData);
  }

  // Force display test data if real data exists
  if (rawFinanceData) {
    return (
      <div className="bg-green-500 text-white p-4 mb-4">
        FINANCE DATA EXISTS: {JSON.stringify(rawFinanceData).slice(0, 100)}...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-64 bg-gray-200 rounded mb-4"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">Unable to load campaign finance data</p>
        <p className="text-sm text-gray-400">
          {error instanceof Error ? error.message : 'Please try again later'}
        </p>
      </div>
    );
  }

  if (!financeData || Object.keys(financeData).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No campaign finance data available</p>
        <p className="text-sm text-gray-400">Data may not be available for this representative</p>
      </div>
    );
  }

  return (
    <CampaignFinanceVisualizer
      financeData={financeData}
      representative={representative}
      bioguideId={bioguideId}
    />
  );
}

// Bills Data Fetcher
interface BillsTrackerWrapperProps {
  bioguideId: string;
  representative: {
    name: string;
    chamber: string;
  };
  BillsTracker: React.ComponentType<{
    bills: unknown[];
    representative: { name: string; chamber: string };
  }>;
}

export function BillsTrackerWrapper({
  bioguideId,
  representative,
  BillsTracker,
}: BillsTrackerWrapperProps) {
  const url = `/api/representative/${bioguideId}/bills`;
  // eslint-disable-next-line no-console
  console.log('🔵 SWR attempting fetch for', url);
  const {
    data: rawBillsData,
    error,
    isLoading,
  } = useSWR(
    url,
    async (url: string) => {
      try {
        logger.info('Bills SWR fetching', { bioguideId, url });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        logger.info('Bills SWR raw response', {
          bioguideId,
          dataType: typeof data,
          isArray: Array.isArray(data),
        });

        // Handle different response formats
        let processedData: unknown[] = [];
        if (Array.isArray(data)) {
          processedData = data;
        } else if (data && typeof data === 'object') {
          // Check for common response wrapper patterns
          if ('sponsoredLegislation' in data) processedData = data.sponsoredLegislation || [];
          else if ('bills' in data) processedData = data.bills || [];
          else if ('data' in data) processedData = data.data || [];
          else if ('results' in data) processedData = data.results || [];
          else if ('items' in data) processedData = data.items || [];
        }

        logger.info('Bills SWR processed data', { bioguideId, billsCount: processedData.length });
        return processedData;
      } catch (error) {
        logger.error('Bills SWR error', error, { bioguideId });
        throw new Error(
          `Failed to load bills data: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 2000,
    }
  );

  // Standardize bills data parsing
  const bills = Array.isArray(rawBillsData) ? rawBillsData : [];

  // Comprehensive data lifecycle logging
  // eslint-disable-next-line no-console
  console.log('📊 DATA STATE:', {
    url,
    isLoading,
    hasError: !!error,
    dataLength: Array.isArray(rawBillsData) ? rawBillsData.length : 'not array',
    firstItem: Array.isArray(rawBillsData) ? rawBillsData[0] : rawBillsData,
    rawData: rawBillsData,
  });

  // Track SWR states globally
  if (typeof window !== 'undefined') {
    (window as unknown as { SWR_STATES: Record<string, unknown> }).SWR_STATES =
      (window as unknown as { SWR_STATES: Record<string, unknown> }).SWR_STATES || {};
    (window as unknown as { SWR_STATES: Record<string, unknown> }).SWR_STATES['bills'] = {
      loading: isLoading,
      data: !!rawBillsData,
      error: !!error,
    };
  }

  // Data structure analysis
  // eslint-disable-next-line no-console
  console.log('Data structure:', {
    direct: Array.isArray(rawBillsData) ? rawBillsData.length : typeof rawBillsData,
    wrapped_data:
      rawBillsData && typeof rawBillsData === 'object' && 'data' in rawBillsData
        ? Object.keys((rawBillsData as { data: unknown }).data as object).length
        : 'no data prop',
    wrapped_items:
      rawBillsData && typeof rawBillsData === 'object' && 'items' in rawBillsData
        ? (rawBillsData as { items: unknown[] }).items?.length || 0
        : 'no items prop',
  });

  // Render verification logging
  if (bills && bills.length > 0) {
    // eslint-disable-next-line no-console
    console.log('✅ RENDERING bills data with', bills.length, 'items');
  } else {
    // eslint-disable-next-line no-console
    console.log('❌ NOT RENDERING bills, data:', bills);
  }

  // Force display test data if real data exists
  if (rawBillsData) {
    return (
      <div className="bg-green-500 text-white p-4 mb-4">
        BILLS DATA EXISTS: {JSON.stringify(rawBillsData).slice(0, 100)}...
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-100 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">Unable to load bills data</p>
        <p className="text-sm text-gray-400">
          {error instanceof Error ? error.message : 'Please try again later'}
        </p>
      </div>
    );
  }

  if (!bills || bills.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No sponsored legislation found</p>
        <p className="text-sm text-gray-400">
          This representative may not have sponsored any bills recently
        </p>
      </div>
    );
  }

  return <BillsTracker bills={bills} representative={representative} />;
}

// Voting Records Data Fetcher
interface VotingRecordsWrapperProps {
  bioguideId: string;
  chamber: 'House' | 'Senate';
  VotingRecordsTable: React.ComponentType<{
    bioguideId: string;
    chamber: 'House' | 'Senate';
  }>;
}

export function VotingRecordsWrapper({
  bioguideId,
  chamber,
  VotingRecordsTable,
}: VotingRecordsWrapperProps) {
  // Note: VotingRecordsTable component handles its own data fetching internally
  // No need for duplicate SWR call here - removing to prevent cache conflicts and redundant API requests
  // Loading states and error handling are managed by the VotingRecordsTable component itself
  return <VotingRecordsTable bioguideId={bioguideId} chamber={chamber} />;
}

// News Data Fetcher
interface NewsWrapperProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
    state: string;
  };
  EnhancedNewsFeed: React.ComponentType<{
    bioguideId: string;
    representative: {
      name: string;
      party: string;
      state: string;
    };
  }>;
}

export function NewsWrapper({ bioguideId, representative, EnhancedNewsFeed }: NewsWrapperProps) {
  // EnhancedNewsFeed handles its own data fetching via representativeApi.getNews()
  // No need for duplicate SWR logic here
  return <EnhancedNewsFeed bioguideId={bioguideId} representative={representative} />;
}

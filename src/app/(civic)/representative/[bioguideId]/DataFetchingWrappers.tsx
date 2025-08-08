'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import { representativeApi } from '@/lib/api/representatives';
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
  const {
    data: rawFinanceData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/finance`,
    async (): Promise<CampaignFinanceResponse['data'] | null> => {
      try {
        const response = (await representativeApi.getFinance(bioguideId)) as FinanceApiResponse;
        // Handle different response formats
        if (response && typeof response === 'object') {
          // If response has a finance or data property, use that
          if ('finance' in response) return response.finance as CampaignFinanceResponse['data'];
          if ('data' in response) return response.data as CampaignFinanceResponse['data'];
          // Otherwise return the response directly
          return response as CampaignFinanceResponse['data'];
        }
        return null;
      } catch (error) {
        logger.error('Campaign finance API error', error, { bioguideId });
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
  const {
    data: rawBillsData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/bills`,
    async () => {
      try {
        const response = await representativeApi.getBills(bioguideId);
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && typeof response === 'object') {
          // Check for common response wrapper patterns
          if ('bills' in response) return response.bills || [];
          if ('data' in response) return response.data || [];
          if ('results' in response) return response.results || [];
          if ('items' in response) return response.items || [];
        }
        return [];
      } catch (error) {
        logger.error('Bills API error', error, { bioguideId });
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
  const {
    data: rawVotesData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/votes`,
    async () => {
      try {
        const response = await representativeApi.getVotes(bioguideId);
        // Handle different response formats
        if (Array.isArray(response)) {
          return response;
        } else if (response && typeof response === 'object') {
          // Check for common response wrapper patterns
          if ('votes' in response) return response.votes || [];
          if ('data' in response) return response.data || [];
          if ('results' in response) return response.results || [];
          if ('items' in response) return response.items || [];
        }
        return [];
      } catch (error) {
        logger.error('Voting records API error', error, { bioguideId });
        throw new Error(
          `Failed to load voting records: ${error instanceof Error ? error.message : 'Unknown error'}`
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

  // Note: VotingRecordsTable component handles its own data parsing internally
  // This wrapper just needs to ensure the API call succeeds
  // rawVotesData is intentionally unused - VotingRecordsTable fetches data directly
  void rawVotesData; // Explicitly mark as intentionally unused
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-12 bg-gray-200 rounded"></div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded"></div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">Unable to load voting records</p>
        <p className="text-sm text-gray-400">
          {error instanceof Error ? error.message : 'Please try again later'}
        </p>
      </div>
    );
  }

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

'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import { representativeApi } from '@/lib/api/representatives';

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
    data: financeData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/finance`,
    () => representativeApi.getFinance(bioguideId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

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
        <p className="text-sm text-gray-400">Please try again later</p>
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
    data: billsData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/bills`,
    () => representativeApi.getBills(bioguideId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

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
        <p className="text-sm text-gray-400">Please try again later</p>
      </div>
    );
  }

  const bills = Array.isArray(billsData) ? billsData : billsData?.bills || [];

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
    data: _votesData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/votes`,
    () => representativeApi.getVotes(bioguideId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

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
        <p className="text-sm text-gray-400">Please try again later</p>
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
  const {
    data: newsData,
    error,
    isLoading,
  } = useSWR(
    `/api/representative/${bioguideId}/news`,
    () => representativeApi.getNews(bioguideId),
    {
      revalidateOnFocus: false,
      dedupingInterval: 180000, // 3 minutes - news updates frequently
    }
  );

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border rounded-lg p-4">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/2 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">Unable to load news articles</p>
        <p className="text-sm text-gray-400">Please try again later</p>
      </div>
    );
  }

  const articles = Array.isArray(newsData) ? newsData : newsData?.articles || [];

  if (!articles || articles.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No recent news articles found</p>
        <p className="text-sm text-gray-400">
          News coverage may not be available for this representative
        </p>
      </div>
    );
  }

  return <EnhancedNewsFeed bioguideId={bioguideId} representative={representative} />;
}

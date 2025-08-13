'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import useSWR from 'swr';
import logger from '@/lib/logging/simple-logger';

// Import proper types for component props
interface CampaignFinanceData {
  financial_summary: Array<{
    cycle: number;
    total_receipts: number;
    total_disbursements: number;
    cash_on_hand_end_period: number;
    individual_contributions: number;
    pac_contributions: number;
    party_contributions: number;
    candidate_contributions: number;
  }>;
  recent_contributions: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
  recent_expenditures: Array<{
    recipient_name: string;
    disbursement_description: string;
    disbursement_amount: number;
    disbursement_date: string;
  }>;
}

interface SponsoredBill {
  billId: string;
  number: string;
  title: string;
  congress: string;
  introducedDate: string;
  latestAction: {
    date: string;
    text: string;
  };
  type: string;
  chamber: 'House' | 'Senate';
  status: string;
  policyArea?: string;
  cosponsors?: number;
  sponsorshipType?: 'sponsored' | 'cosponsored';
  committees?: string[];
  subjects?: string[];
  url?: string;
}

// API Response types that match actual API responses
interface FinanceApiResponse {
  candidate_info?: unknown;
  financial_summary?: CampaignFinanceData['financial_summary'];
  recent_contributions?: CampaignFinanceData['recent_contributions'];
  recent_expenditures?: CampaignFinanceData['recent_expenditures'];
  [key: string]: unknown;
}

interface BillsApiResponse {
  sponsoredLegislation?: SponsoredBill[];
  [key: string]: unknown;
}

// Campaign Finance Data Fetcher
interface CampaignFinanceWrapperProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
  };
  CampaignFinanceVisualizer: React.ComponentType<{
    financeData: CampaignFinanceData;
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
    async (url: string): Promise<CampaignFinanceData | null> => {
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
          hasFinancialSummary: data && typeof data === 'object' && 'financial_summary' in data,
          hasContributions: data && typeof data === 'object' && 'recent_contributions' in data,
        });

        // Process the finance data - API returns flat object with finance properties
        let processedData: CampaignFinanceData | null = null;
        if (
          data &&
          typeof data === 'object' &&
          ('financial_summary' in data ||
            'recent_contributions' in data ||
            'recent_expenditures' in data)
        ) {
          processedData = {
            financial_summary: data.financial_summary || [],
            recent_contributions: data.recent_contributions || [],
            recent_expenditures: data.recent_expenditures || [],
          };
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

  // Use processed finance data directly
  const financeData = rawFinanceData;

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
  if (
    financeData &&
    (financeData.financial_summary?.length ||
      financeData.recent_contributions?.length ||
      financeData.recent_expenditures?.length)
  ) {
    // eslint-disable-next-line no-console
    console.log(
      '✅ RENDERING finance data with summary:',
      financeData.financial_summary?.length || 0,
      'contributions:',
      financeData.recent_contributions?.length || 0,
      'expenditures:',
      financeData.recent_expenditures?.length || 0
    );
  } else {
    // eslint-disable-next-line no-console
    console.log('❌ NOT RENDERING finance, data:', financeData);
  }

  // Remove debug div - data should flow to component
  // Debug logging already shows data exists

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

  if (
    !financeData ||
    (!financeData.financial_summary?.length &&
      !financeData.recent_contributions?.length &&
      !financeData.recent_expenditures?.length)
  ) {
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
    bills: SponsoredBill[];
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
    async (url: string): Promise<SponsoredBill[]> => {
      try {
        logger.info('Bills SWR fetching', { bioguideId, url });
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        const data = (await response.json()) as BillsApiResponse;
        logger.info('Bills SWR raw response', {
          bioguideId,
          dataType: typeof data,
          hasSponsoredLegislation:
            data && typeof data === 'object' && 'sponsoredLegislation' in data,
          billsCount: data?.sponsoredLegislation?.length || 0,
        });

        // Process the bills data - API returns object with sponsoredLegislation array
        let processedData: SponsoredBill[] = [];
        if (
          data &&
          typeof data === 'object' &&
          'sponsoredLegislation' in data &&
          Array.isArray(data.sponsoredLegislation)
        ) {
          processedData = data.sponsoredLegislation;
        } else if (Array.isArray(data)) {
          // Fallback for direct array response
          processedData = data;
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

  // Use processed bills data directly
  const bills = rawBillsData || [];

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

  // Remove debug div - data should flow to component
  // Debug logging already shows data exists

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

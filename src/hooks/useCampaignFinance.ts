import useSWR from 'swr';

interface CampaignFinanceData {
  summary?: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    totalContributions: number;
  };
  topContributors?: Array<{
    name: string;
    amount: number;
    type: string;
  }>;
  industries?: Array<{
    industry: string;
    amount: number;
    percentage: number;
  }>;
  geographicSources?: Array<{
    state: string;
    amount: number;
    percentage: number;
  }>;
  expenditures?: Array<{
    purpose: string;
    amount: number;
    date: string;
  }>;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

/**
 * Shared SWR hook for campaign finance data
 * Implements deduplication to prevent duplicate API calls across components
 *
 * @param bioguideId - Representative's bioguide ID
 * @returns SWR response with campaign finance data
 *
 * Usage:
 * ```tsx
 * const { data, error, isLoading } = useCampaignFinance('K000367');
 * ```
 */
export function useCampaignFinance(bioguideId: string | undefined) {
  const { data, error, isLoading, mutate } = useSWR<CampaignFinanceData>(
    bioguideId ? `/api/representative/${bioguideId}/finance` : null,
    fetcher,
    {
      // Cache for 5 minutes (300,000 ms)
      dedupingInterval: 300000,
      // Revalidate on focus
      revalidateOnFocus: false,
      // Keep previous data while revalidating
      keepPreviousData: true,
    }
  );

  return {
    data,
    error,
    isLoading,
    mutate,
  };
}

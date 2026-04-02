'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DistrictSpendingResponse } from '@/types/spending';
import SpendingSummaryCards from './SpendingSummaryCards';
import SpendingBreakdownChart from './SpendingBreakdownChart';
import AwardList from './AwardList';

interface FederalSpendingProfileProps {
  districtId: string;
}

export default function FederalSpendingProfile({ districtId }: FederalSpendingProfileProps) {
  const [data, setData] = useState<DistrictSpendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchSpending() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/spending/district/${districtId}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch spending data: ${response.status}`);
        }
        const json: DistrictSpendingResponse = await response.json();
        if (!cancelled) {
          if (json.success) {
            setData(json);
          } else {
            setError(json.error ?? 'Failed to load spending data');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load spending data');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (districtId) {
      fetchSpending();
    }

    return () => {
      cancelled = true;
    };
  }, [districtId]);

  if (loading) {
    return (
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Federal Spending
        </h2>
        <div className="flex items-center gap-3">
          <div className="aicher-loading w-6 h-6" />
          <p className="text-gray-600 dark:text-gray-400">Loading spending data...</p>
        </div>
      </div>
    );
  }

  if (error || !data?.summary) {
    return (
      <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Federal Spending
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          {error ?? 'Spending data unavailable for this district.'}
        </p>
      </div>
    );
  }

  const { summary, recentContracts, recentGrants } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Federal Spending</h2>
        <Link
          href={`/spending?district=${districtId}`}
          className="text-sm text-[#3ea2d4] dark:text-[#5bb8e6] hover:underline"
        >
          View full details &rarr;
        </Link>
      </div>

      <SpendingSummaryCards summary={summary} dataQuality={data.metadata?.dataQuality} />

      <SpendingBreakdownChart
        contractSpending={summary.contractSpending}
        grantSpending={summary.grantSpending}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AwardList awards={recentContracts} title="Top Contracts" maxItems={5} />
        <AwardList awards={recentGrants} title="Top Grants" maxItems={5} />
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">
        Source:{' '}
        <a
          href="https://usaspending.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          USASpending.gov
        </a>{' '}
        &middot; {data.metadata.dataSource}
      </p>
    </div>
  );
}

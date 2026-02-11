'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { DistrictSpendingResponse } from '@/types/spending';
import SpendingSearch from '@/features/spending/components/SpendingSearch';
import SpendingSummaryCards from '@/features/spending/components/SpendingSummaryCards';
import SpendingBreakdownChart from '@/features/spending/components/SpendingBreakdownChart';
import AwardList from '@/features/spending/components/AwardList';

function SpendingPageContent() {
  const searchParams = useSearchParams();
  const initialDistrict = searchParams.get('district');
  const [districtId, setDistrictId] = useState<string | null>(initialDistrict);
  const [data, setData] = useState<DistrictSpendingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSpending = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await fetch(`/api/spending/district/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch spending data: ${response.status}`);
      }
      const json: DistrictSpendingResponse = await response.json();
      if (json.success) {
        setData(json);
      } else {
        setError(json.error ?? 'Failed to load spending data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spending data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialDistrict) {
      fetchSpending(initialDistrict);
    }
  }, [initialDistrict, fetchSpending]);

  const handleDistrictSelected = useCallback(
    (id: string) => {
      setDistrictId(id);
      // Update URL without reload
      window.history.replaceState(null, '', `/spending?district=${id}`);
      fetchSpending(id);
    },
    [fetchSpending]
  );

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          <Link href="/" className="hover:text-[#3ea2d4]">
            Home
          </Link>
          <span className="mx-2">&rsaquo;</span>
          <span className="font-medium text-gray-900 dark:text-gray-100">Federal Spending</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Federal Spending by District
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            See how federal dollars flow to each congressional district through contracts and
            grants. Search by ZIP code or select a state and district.
          </p>
        </div>

        {/* Search */}
        <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6 mb-8">
          <SpendingSearch
            onDistrictSelected={handleDistrictSelected}
            initialDistrict={districtId ?? undefined}
          />
        </div>

        {/* Loading */}
        {loading && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8 text-center">
            <div className="aicher-loading w-8 h-8 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              Loading spending data for {districtId}...
            </p>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="border-l-4 border-[#e11d07] bg-red-50 dark:bg-red-900/20 p-4 mb-8">
            <p className="text-[#e11d07] dark:text-red-400 font-semibold">Error</p>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">{error}</p>
          </div>
        )}

        {/* Results */}
        {data?.summary && !loading && (
          <div className="space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.displayName}
              </h2>
              <Link
                href={`/districts/${data.summary.districtId}`}
                className="text-sm text-[#3ea2d4] dark:text-[#5bb8e6] hover:underline"
              >
                View district profile &rarr;
              </Link>
            </div>

            <SpendingSummaryCards summary={data.summary} />

            <SpendingBreakdownChart
              contractSpending={data.summary.contractSpending}
              grantSpending={data.summary.grantSpending}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AwardList awards={data.recentContracts} title="Top Contracts" maxItems={10} />
              <AwardList awards={data.recentGrants} title="Top Grants" maxItems={10} />
            </div>

            {/* Source attribution */}
            <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
              Source: USASpending.gov &middot; Data reflects federal fiscal year spending. Award
              amounts shown are from the top awards by dollar value and may not sum to district
              totals.
            </p>
          </div>
        )}

        {/* Empty state - no district selected */}
        {!districtId && !loading && !error && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Enter a ZIP code or select a state and district above to view federal spending data.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SpendingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white dark:bg-[#1a1a1e] flex items-center justify-center">
          <div className="aicher-loading w-8 h-8" />
        </div>
      }
    >
      <SpendingPageContent />
    </Suspense>
  );
}

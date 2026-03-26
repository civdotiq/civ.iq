'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Loader2 } from 'lucide-react';
import { SkeletonLoader } from '@/shared/components/ui/SkeletonLoader';
import { EmptyState } from '@/shared/components/ui/EmptyState';
import { BreadcrumbSchema } from '@/components/seo/JsonLd';
import type {
  DistrictSpendingResponse,
  GeographicSpendingResponse,
  GeographicSpendingResult,
} from '@/types/spending';
import SpendingSearch from '@/features/spending/components/SpendingSearch';
import SpendingSummaryCards from '@/features/spending/components/SpendingSummaryCards';
import SpendingBreakdownChart from '@/features/spending/components/SpendingBreakdownChart';
import AwardList from '@/features/spending/components/AwardList';
import { EnablingLegislation } from '@/features/spending/components/EnablingLegislation';
import { AgencyRelatedBills } from '@/features/spending/components/AgencyRelatedBills';

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
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-civiq-blue">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Federal Spending</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Federal Spending by District
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            See how federal dollars flow to each congressional district through contracts and
            grants. Search by address or select a state and district.
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
          <div>
            <p className="text-sm text-gray-500 mb-4">Loading spending data for {districtId}...</p>
            <SkeletonLoader variant="stat" count={3} />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="border-l-4 border-amber-600 bg-amber-50 dark:bg-amber-900/20 p-4 mb-8">
            <p className="text-amber-700 dark:text-amber-400 font-semibold">Error</p>
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

            <EnablingLegislation
              agencySlugs={[
                ...new Set([
                  ...data.recentContracts.map(a => a.agencySlug),
                  ...data.recentGrants.map(a => a.agencySlug),
                ]),
              ].filter(Boolean)}
            />

            {/* Agency Related Bills */}
            {(() => {
              const topSlug =
                data.recentContracts[0]?.agencySlug || data.recentGrants[0]?.agencySlug;
              return topSlug ? <AgencyRelatedBills agencySlug={topSlug} /> : null;
            })()}

            {/* Source attribution */}
            <p className="text-xs text-gray-400 dark:text-gray-500 border-t border-gray-200 dark:border-gray-700 pt-4">
              Source: USASpending.gov &middot; Data reflects federal fiscal year spending. Award
              amounts shown are from the top awards by dollar value and may not sum to district
              totals.
            </p>
          </div>
        )}

        {/* Geographic Spending */}
        <SpendingByGeography />

        {/* Empty state - no district selected */}
        {!districtId && !loading && !error && (
          <EmptyState
            title="Select a district"
            description="Enter your address or select a state and district above to view federal spending data."
          />
        )}
      </main>
    </div>
  );
}

type GeoLayer = 'state' | 'county' | 'district';
type GeoScope = 'place_of_performance' | 'recipient_location';

const GEO_LAYERS: { value: GeoLayer; label: string }[] = [
  { value: 'state', label: 'State' },
  { value: 'county', label: 'County' },
  { value: 'district', label: 'District' },
];

const GEO_SCOPES: { value: GeoScope; label: string }[] = [
  { value: 'place_of_performance', label: 'Where Work Performed' },
  { value: 'recipient_location', label: 'Recipient Location' },
];

function formatAmount(amount: number): string {
  if (Math.abs(amount) >= 1e9) return `$${(amount / 1e9).toFixed(1)}B`;
  if (Math.abs(amount) >= 1e6) return `$${(amount / 1e6).toFixed(1)}M`;
  if (Math.abs(amount) >= 1e3) return `$${(amount / 1e3).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function SpendingByGeography() {
  const currentYear = new Date().getFullYear();
  const [geoLayer, setGeoLayer] = useState<GeoLayer>('state');
  const [scope, setScope] = useState<GeoScope>('place_of_performance');
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [geoData, setGeoData] = useState<GeographicSpendingResponse | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchGeo() {
      setGeoLoading(true);
      setGeoError(null);
      try {
        const params = new URLSearchParams({
          geo_layer: geoLayer,
          scope,
          fiscal_year: String(fiscalYear),
        });
        const res = await fetch(`/api/spending/geography?${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: GeographicSpendingResponse = await res.json();
        if (!cancelled) setGeoData(json);
      } catch (err) {
        if (!cancelled) setGeoError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        if (!cancelled) setGeoLoading(false);
      }
    }
    fetchGeo();
    return () => {
      cancelled = true;
    };
  }, [geoLayer, scope, fiscalYear]);

  const sorted = (geoData?.results ?? [])
    .filter((r: GeographicSpendingResult) => r.aggregatedAmount > 0)
    .sort(
      (a: GeographicSpendingResult, b: GeographicSpendingResult) =>
        b.aggregatedAmount - a.aggregatedAmount
    );
  const maxAmount = sorted[0]?.aggregatedAmount ?? 1;

  return (
    <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6 mt-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#3ea2d4]" />
        Spending by Geography
      </h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex border-2 border-gray-300">
          {GEO_LAYERS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setGeoLayer(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium ${
                geoLayer === opt.value
                  ? 'bg-[#3ea2d4] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="flex border-2 border-gray-300">
          {GEO_SCOPES.map(opt => (
            <button
              key={opt.value}
              onClick={() => setScope(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium ${
                scope === opt.value
                  ? 'bg-[#3ea2d4] text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <select
          value={fiscalYear}
          onChange={e => setFiscalYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border-2 border-gray-300 bg-white"
        >
          {Array.from({ length: 5 }, (_, i) => currentYear - i).map(y => (
            <option key={y} value={y}>
              FY {y}
            </option>
          ))}
        </select>
      </div>

      {/* Results */}
      {geoLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading geographic data...</span>
        </div>
      ) : geoError ? (
        <div className="text-center py-8 text-sm text-[#e11d07]">{geoError}</div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-8 text-sm text-gray-500">
          No geographic spending data available
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((item: GeographicSpendingResult) => (
            <div key={item.shapeCode} className="flex items-center gap-3">
              <div className="w-24 sm:w-32 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {item.displayName}
              </div>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 relative">
                <div
                  className="h-full bg-[#3ea2d4]"
                  style={{ width: `${(item.aggregatedAmount / maxAmount) * 100}%` }}
                />
              </div>
              <div className="w-20 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                {formatAmount(item.aggregatedAmount)}
              </div>
              {item.perCapita != null && (
                <div className="hidden sm:block w-24 text-right text-xs text-gray-500">
                  {formatAmount(item.perCapita)}/cap
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-4">
        Source:{' '}
        <a
          href={`https://usaspending.gov/explorer`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          USASpending.gov
        </a>{' '}
        · FY {fiscalYear}
      </p>
    </div>
  );
}

export default function SpendingPage() {
  return (
    <>
      <BreadcrumbSchema
        items={[
          { name: 'Home', url: 'https://civdotiq.org' },
          { name: 'Federal Spending', url: 'https://civdotiq.org/spending' },
        ]}
      />
      <Suspense
        fallback={
          <div className="min-h-screen bg-white dark:bg-[#1a1a1e] flex items-center justify-center">
            <div className="aicher-loading w-8 h-8" />
          </div>
        }
      >
        <SpendingPageContent />
      </Suspense>
    </>
  );
}

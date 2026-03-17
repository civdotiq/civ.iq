'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SectorLeaderboard } from '@/components/intelligence/SectorLeaderboard';
import { CascadeSection } from '@/components/mesh/CascadeSection';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';

interface SectorBill {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  policyArea: string | null;
  url: string;
}

interface SectorCommittee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

interface IndustryConnectionsResponse {
  sector: string;
  relatedPolicyAreas: string[];
  relatedAgencies: string[];
  committees: SectorCommittee[];
  recentBills: SectorBill[];
  metadata: {
    generatedAt: string;
    dataSources: string[];
    joinType: string;
    dataQuality: 'complete' | 'partial' | 'degraded';
  };
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

const chamberStyles: Record<string, string> = {
  House: 'bg-blue-100 text-blue-800',
  Senate: 'bg-gray-200 text-gray-900',
  Joint: 'bg-gray-100 text-gray-700',
};

function buildProvenanceSources(
  dataSources?: string[],
  quality?: 'complete' | 'partial' | 'degraded'
): DataSource[] {
  const sources = dataSources ?? ['government sources'];
  return sources.map(name => ({
    name,
    status: quality === 'degraded' ? ('unavailable' as const) : ('available' as const),
  }));
}

function formatSectorName(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default function IndustrySectorPage() {
  const params = useParams();
  const sector = params.sector as string;

  const { data, error, isLoading, mutate } = useSWR<IndustryConnectionsResponse>(
    `/api/industry/${encodeURIComponent(sector)}/connections`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  const displayName = data?.sector ?? formatSectorName(sector);

  return (
    <div className="min-h-screen bg-white dark:bg-[#1a1a1e]">
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-blue-600">
            Home
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium text-gray-900">Industry</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {displayName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
            Civic connections for this industry sector: related legislation, congressional
            committees, and federal agencies.
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-1/3 mb-6" />
              <div className="space-y-3">
                <div className="h-16 bg-gray-200 dark:bg-gray-700" />
                <div className="h-16 bg-gray-200 dark:bg-gray-700" />
                <div className="h-16 bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !isLoading && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Failed to load industry connections
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Maps this sector to related bills, committees, and agencies
              </p>
              <button
                onClick={() => mutate()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
                aria-label="Retry loading industry connections"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        {data && !isLoading && (
          <div className="space-y-8">
            {/* Policy Areas */}
            {data.relatedPolicyAreas.length > 0 && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Policy Areas
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.relatedPolicyAreas.map(area => (
                    <span
                      key={area}
                      className="px-3 py-1 text-sm bg-civiq-blue/10 text-civiq-blue border border-civiq-blue/20"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Committees */}
            {data.committees.length > 0 && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Related Committees
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Congressional committees with jurisdiction over this sector.
                </p>

                <div className="space-y-2" role="list" aria-label="Related committees">
                  {data.committees.map(committee => (
                    <Link
                      key={committee.code}
                      href={`/committee/${committee.code}`}
                      role="listitem"
                      className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 hover:border-civiq-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {committee.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium ${chamberStyles[committee.chamber] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {committee.chamber}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bills */}
            <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Recent Legislation
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Bills in related policy areas for this industry sector.
              </p>

              {data.recentBills.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No recent legislation found for this sector.
                </p>
              ) : (
                <div className="space-y-3" role="list" aria-label="Recent bills">
                  {data.recentBills.map(bill => (
                    <Link
                      key={bill.id}
                      href={`/bill/${bill.id}`}
                      role="listitem"
                      aria-label={`${bill.type.toUpperCase()}. ${bill.number}: ${bill.title}`}
                      className="block p-4 border border-gray-200 dark:border-gray-700 hover:border-civiq-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {bill.type.toUpperCase()}. {bill.number}
                            </span>
                            {bill.policyArea && (
                              <span className="px-2 py-0.5 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20">
                                {bill.policyArea}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-300 line-clamp-2">
                            {bill.title}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              <DataProvenance
                sources={buildProvenanceSources(
                  data.metadata?.dataSources,
                  data.metadata?.dataQuality
                )}
                generatedAt={data.metadata?.generatedAt}
                quality={data.metadata?.dataQuality}
                className="mt-4"
              />
            </div>

            {/* Related Agencies */}
            {data.relatedAgencies.length > 0 && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                  Related Federal Agencies
                </h2>
                <div className="flex flex-wrap gap-2">
                  {data.relatedAgencies.map(agency => (
                    <span
                      key={agency}
                      className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                    >
                      {agency}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sector Leaderboard */}
            <SectorLeaderboard initialSector={data?.sector} />

            {/* Funding Impact Simulation */}
            <CascadeSection sector={data?.sector ?? sector} />
          </div>
        )}
      </main>
    </div>
  );
}

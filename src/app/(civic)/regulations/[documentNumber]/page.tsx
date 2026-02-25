'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';

interface Hearing {
  packageId: string;
  title: string;
  congress: number;
  chamber: 'House' | 'Senate' | 'Joint';
  dateIssued: string;
  url: string;
  relevance: 'direct' | 'topical';
}

interface OversightCommittee {
  code: string;
  name: string;
  chamber: 'House' | 'Senate' | 'Joint';
}

interface RegulationHearingsResponse {
  documentNumber: string;
  regulationTitle: string;
  agency: string;
  hearings: Hearing[];
  oversightCommittees: OversightCommittee[];
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

const relevanceStyles: Record<string, string> = {
  direct: 'bg-green-100 text-green-800',
  topical: 'bg-yellow-100 text-yellow-800',
};

const chamberStyles: Record<string, string> = {
  House: 'bg-blue-100 text-blue-800',
  Senate: 'bg-purple-100 text-purple-800',
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

export default function RegulationDetailPage() {
  const params = useParams();
  const documentNumber = params.documentNumber as string;

  const { data, error, isLoading, mutate } = useSWR<RegulationHearingsResponse>(
    `/api/regulations/${encodeURIComponent(documentNumber)}/hearings`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
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
          <span className="font-medium text-gray-900 dark:text-gray-100">Regulation</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {data?.regulationTitle ?? `Regulation ${documentNumber}`}
          </h1>
          {data?.agency && <p className="text-gray-600 dark:text-gray-400">{data.agency}</p>}
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Federal Register Document: {documentNumber}
          </p>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Committee Hearings
            </h2>
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 w-2/3 mb-4" />
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
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Committee Hearings
            </h2>
            <div className="text-center py-6">
              <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
              <p className="text-gray-600 dark:text-gray-400 font-medium">
                Failed to load regulation hearings
              </p>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Links this regulation to related congressional committee hearings
              </p>
              <button
                onClick={() => mutate()}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
                aria-label="Retry loading regulation hearings"
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
            {/* Hearings */}
            <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Related Committee Hearings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Congressional hearings related to this regulation, matched by topic and agency
                oversight.
              </p>

              {data.hearings.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No related committee hearings found for this regulation.
                </p>
              ) : (
                <div className="space-y-3" role="list" aria-label="Related hearings">
                  {data.hearings.map(hearing => (
                    <a
                      key={hearing.packageId}
                      href={hearing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      role="listitem"
                      aria-label={hearing.title}
                      className="block p-4 border border-gray-200 dark:border-gray-700 hover:border-civiq-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium ${chamberStyles[hearing.chamber] || 'bg-gray-100 text-gray-700'}`}
                            >
                              {hearing.chamber}
                            </span>
                            <span
                              className={`px-2 py-0.5 text-xs font-medium ${relevanceStyles[hearing.relevance] || 'bg-gray-100 text-gray-700'}`}
                            >
                              {hearing.relevance}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {hearing.congress}th Congress
                            </span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-300 line-clamp-2">
                            {hearing.title}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {new Date(hearing.dateIssued).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </a>
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

            {/* Oversight Committees */}
            {data.oversightCommittees.length > 0 && (
              <div className="border-2 border-black dark:border-[#333333] bg-white dark:bg-[#222226] p-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Oversight Committees
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Congressional committees with jurisdiction over this regulation&apos;s agency.
                </p>

                <div className="space-y-2" role="list" aria-label="Oversight committees">
                  {data.oversightCommittees.map(committee => (
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
          </div>
        )}
      </main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { DataSource } from '@/shared/components/ui/DataProvenance';

interface EnablingLegislationProps {
  agencySlugs: string[];
}

interface LegislationBill {
  billId: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  policyArea: string | null;
  connectionType: 'authorizing' | 'appropriating' | 'related';
  url: string;
}

interface LegislationResponse {
  enablingLegislation: LegislationBill[];
  relatedCommittees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
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

const connectionStyles: Record<string, string> = {
  authorizing: 'bg-green-100 text-green-800',
  appropriating: 'bg-blue-100 text-blue-800',
  related: 'bg-gray-100 text-gray-700',
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

export function EnablingLegislation({ agencySlugs }: EnablingLegislationProps) {
  const topSlug = agencySlugs[0];
  const { data, error, isLoading, mutate } = useSWR<LegislationResponse>(
    topSlug ? `/api/spending/awards/legislation?agency=${encodeURIComponent(topSlug)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (!topSlug) return null;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Enabling Legislation
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
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Enabling Legislation
        </h2>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 dark:text-gray-400 font-medium">
            Failed to load enabling legislation
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 mb-4">
            Links spending back to the bills that authorized or funded these awards
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading enabling legislation"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.enablingLegislation?.length) {
    return (
      <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Enabling Legislation
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          No enabling legislation identified for these spending awards.
        </p>
      </div>
    );
  }

  const bills = data.enablingLegislation.slice(0, 10);

  return (
    <div className="bg-white dark:bg-[#222226] border-2 border-black dark:border-[#333333] p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
        Enabling Legislation
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Bills that authorized, appropriated, or relate to this agency&apos;s spending.
      </p>

      <div className="space-y-3" role="list" aria-label="Enabling legislation">
        {bills.map(bill => (
          <Link
            key={bill.billId}
            href={`/bill/${bill.billId}`}
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
                  <span
                    className={`px-2 py-0.5 text-xs font-medium ${connectionStyles[bill.connectionType] || 'bg-gray-100 text-gray-700'}`}
                  >
                    {bill.connectionType}
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

      <DataProvenance
        sources={buildProvenanceSources(data.metadata?.dataSources, data.metadata?.dataQuality)}
        generatedAt={data.metadata?.generatedAt}
        quality={data.metadata?.dataQuality}
        className="mt-4"
      />
    </div>
  );
}

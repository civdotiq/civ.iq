'use client';

import useSWR from 'swr';
import { DollarSign, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import type { BillSpendingConnection } from '@/types/joins';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';

interface BillSpendingSectionProps {
  billId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

function formatAgencyName(raw: string): string {
  // "department-of-defense (direct)" -> "Department of Defense"
  const stripped = raw.replace(/\s*\((?:direct|inferred)\)\s*$/, '');
  return stripped
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function BillSpendingSection({ billId }: BillSpendingSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<BillSpendingConnection>(
    `/api/bill/${billId}/spending`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Federal Spending
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-gray-200 w-1/3"></div>
          <div className="h-16 bg-gray-200"></div>
          <div className="h-16 bg-gray-200"></div>
          <div className="h-16 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Federal Spending
        </h3>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load spending data</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Spending connections are derived from bill policy areas and committee assignments
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading spending data"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.spending.awardCount === 0) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Federal Spending
        </h3>
        <div className="text-center py-6">
          <DollarSign className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">No related federal spending data available</p>
          <p className="text-sm text-gray-500 mt-1">
            Spending connections are derived from bill policy areas and committee assignments
          </p>
        </div>
      </div>
    );
  }

  const topAgencies = data.relatedAgencies.slice(0, 3);
  const topAwards = data.spending.awards.slice(0, 5);

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <DollarSign className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Related Federal Spending ({data.spending.awardCount} awards)
      </h3>

      {/* Total Amount */}
      <div className="mb-4">
        <div className="text-2xl font-bold text-gray-900">
          ${data.spending.totalAmount.toLocaleString()}
        </div>
        <p className="text-sm text-gray-500">Total related federal awards</p>
      </div>

      {/* Agency Tags */}
      {topAgencies.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Related agencies">
          {topAgencies.map(agency => (
            <span
              key={agency}
              role="listitem"
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs border border-gray-200"
            >
              {formatAgencyName(agency)}
            </span>
          ))}
        </div>
      )}

      {/* Award List */}
      <div className="space-y-3" role="list" aria-label="Federal awards">
        {topAwards.map(award => (
          <a
            key={award.id}
            href={award.url}
            target="_blank"
            rel="noopener noreferrer"
            role="listitem"
            aria-label={`${award.recipientName} — $${award.amount.toLocaleString()} ${award.type} from ${award.agency}. Opens USASpending.gov`}
            className="block p-4 border border-gray-200 hover:border-civiq-blue hover:bg-blue-50 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{award.recipientName}</p>
                <p className="text-sm text-gray-600 mt-1">
                  ${award.amount.toLocaleString()} &middot; {award.agency}
                </p>
                {award.description && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{award.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                <span
                  className={`px-2 py-1 text-xs font-medium ${
                    award.type === 'grant'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {award.type}
                </span>
                <ExternalLink className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* Data Provenance */}
      <DataProvenance
        sources={
          data?.metadata?.dataSources?.map((name: string) => ({
            name,
            status: 'available' as const,
          })) ?? [{ name: 'USASpending.gov', status: 'available' as const }]
        }
        generatedAt={data?.metadata?.generatedAt}
        quality={data?.metadata?.dataQuality}
        className="mt-4"
      />
    </div>
  );
}

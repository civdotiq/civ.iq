'use client';

import Link from 'next/link';
import useSWR from 'swr';
import {
  Layers,
  AlertCircle,
  RefreshCw,
  FileText,
  BookOpen,
  DollarSign,
  Users,
} from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { PolicyAreaResults } from '@/types/joins';

interface PolicyAreaCrossDomainProps {
  policyArea: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

export function PolicyAreaCrossDomain({ policyArea }: PolicyAreaCrossDomainProps) {
  const { data, error, isLoading, mutate } = useSWR<PolicyAreaResults>(
    `/api/search/policy-area?policyArea=${encodeURIComponent(policyArea)}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Cross-Domain Data
        </h2>
        <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="h-32 bg-gray-200"></div>
          <div className="h-32 bg-gray-200"></div>
          <div className="h-32 bg-gray-200"></div>
          <div className="h-32 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Cross-Domain Data
        </h2>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load cross-domain data</p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading cross-domain data"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasBills = data.bills.length > 0;
  const hasRegulations = data.regulations.length > 0;
  const hasSpending = data.spending.totalAmount > 0;
  const hasCommittees = data.committees.length > 0;

  if (!hasBills && !hasRegulations && !hasSpending && !hasCommittees) {
    return null;
  }

  return (
    <div className="bg-white border-2 border-black p-6 mt-8">
      <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <Layers className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Cross-Domain Data: {data.policyArea}
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Connected data across bills, regulations, spending, and committees
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Related Bills */}
        <div className="border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
            Bills ({data.bills.length})
          </h3>
          {hasBills ? (
            <div className="space-y-2">
              {data.bills.slice(0, 5).map(bill => (
                <Link
                  key={bill.id}
                  href={`/bill/${bill.id}`}
                  className="block text-sm text-gray-700 hover:text-civiq-blue line-clamp-2"
                >
                  {bill.title}
                </Link>
              ))}
              {data.bills.length > 5 && (
                <Link
                  href="/legislation"
                  className="block text-xs text-civiq-blue hover:underline mt-2"
                >
                  View all {data.bills.length} bills
                </Link>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No related bills found</p>
          )}
        </div>

        {/* Active Regulations */}
        <div className="border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
            Regulations ({data.regulations.length})
          </h3>
          {hasRegulations ? (
            <div className="space-y-2">
              {data.regulations.slice(0, 5).map(reg => (
                <a
                  key={reg.id}
                  href={reg.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-sm text-gray-700 hover:text-civiq-blue line-clamp-2"
                >
                  {reg.title}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No active regulations found</p>
          )}
        </div>

        {/* Federal Spending */}
        <div className="border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
            Federal Spending
          </h3>
          {hasSpending ? (
            <div>
              <p className="text-lg font-bold text-gray-900 mb-2">
                ${data.spending.totalAmount.toLocaleString()}
              </p>
              <div className="space-y-1">
                {data.spending.topAgencies.slice(0, 3).map(agency => (
                  <div key={agency.name} className="flex justify-between text-xs text-gray-600">
                    <span className="truncate mr-2">{agency.name}</span>
                    <span className="flex-shrink-0">${agency.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">No spending data available</p>
          )}
        </div>

        {/* Oversight Committees */}
        <div className="border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
            Committees ({data.committees.length})
          </h3>
          {hasCommittees ? (
            <div className="space-y-2">
              {data.committees.slice(0, 5).map(committee => (
                <Link
                  key={committee.code}
                  href={`/committee/${committee.code}`}
                  className="block text-sm text-gray-700 hover:text-civiq-blue"
                >
                  {committee.name}
                  <span className="text-xs text-gray-400 ml-1">({committee.chamber})</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No oversight committees found</p>
          )}
        </div>
      </div>

      <DataProvenance
        sources={data.metadata.dataSources.map(name => ({
          name,
          status: 'available' as const,
        }))}
        generatedAt={data.metadata.generatedAt}
        quality={data.metadata.dataQuality}
        className="mt-4"
      />
    </div>
  );
}

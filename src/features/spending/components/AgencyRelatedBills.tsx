'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { FileText, AlertCircle, RefreshCw } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { JoinMetadata } from '@/types/joins';

interface AgencyBillResult {
  id: string;
  title: string;
  type: string;
  number: string;
  congress: number;
  policyArea: string | null;
  introducedDate: string;
  latestActionDate: string;
  latestActionText: string;
  connectionStrength: 'direct' | 'inferred';
  url: string;
}

interface AgencyBillsResponse {
  agencySlug: string;
  oversightCommittees: Array<{
    code: string;
    name: string;
    chamber: 'House' | 'Senate' | 'Joint';
  }>;
  relatedPolicyAreas: string[];
  bills: AgencyBillResult[];
  metadata: JoinMetadata;
}

interface AgencyRelatedBillsProps {
  agencySlug: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

export function AgencyRelatedBills({ agencySlug }: AgencyRelatedBillsProps) {
  const { data, error, isLoading, mutate } = useSWR<AgencyBillsResponse>(
    agencySlug ? `/api/spending/agency/${agencySlug}/bills` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (!agencySlug) return null;

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Legislation
        </h3>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 w-2/3"></div>
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
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Legislation
        </h3>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load related bills</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Bills are matched by agency oversight committees and policy areas
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading related bills"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.bills?.length) {
    return null;
  }

  const bills = data.bills.slice(0, 8);

  return (
    <div className="bg-white border-2 border-black p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Related Legislation ({data.bills.length})
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Bills connected to this agency through oversight committees and policy areas
      </p>

      <div className="space-y-3" role="list" aria-label="Agency-related bills">
        {bills.map(bill => (
          <Link
            key={bill.id}
            href={`/bill/${bill.id}`}
            role="listitem"
            className="block p-4 border border-gray-200 hover:border-civiq-blue hover:bg-civiq-blue/10 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">
                    {bill.type.toUpperCase()}. {bill.number}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium ${
                      bill.connectionStrength === 'direct'
                        ? 'bg-civiq-green/10 text-civiq-green'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {bill.connectionStrength}
                  </span>
                  {bill.policyArea && (
                    <span className="px-2 py-0.5 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20">
                      {bill.policyArea}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">{bill.title}</p>
                <p className="text-xs text-gray-500 mt-1">{bill.latestActionText}</p>
              </div>
            </div>
          </Link>
        ))}
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

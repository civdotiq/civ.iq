'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';

interface DistrictRelevantBillsProps {
  districtId: string;
}

interface DistrictBill {
  id: string;
  title: string;
  type: string;
  number: string;
  status: 'introduced' | 'committee' | 'floor' | 'passed' | 'enacted' | string;
  policyArea: string | null;
  relevanceScore: number;
  relevanceReasons: string[];
  latestActionText: string;
}

interface DistrictBillsData {
  representativeName: string | null;
  bills: DistrictBill[];
  topAgencies: string[];
  relevantPolicyAreas: string[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

const statusStyles: Record<string, string> = {
  introduced: 'bg-gray-100 text-gray-700',
  committee: 'bg-gray-100 text-gray-600',
  floor: 'bg-civiq-blue/10 text-civiq-blue',
  passed: 'bg-civiq-green/10 text-civiq-green',
  enacted: 'bg-civiq-green/10 text-civiq-green',
};

function RelevanceIndicator({ score }: { score: number }) {
  const filled = Math.min(score, 3);
  return (
    <div className="flex gap-0.5" role="img" aria-label={`Relevance: ${filled} out of 3`}>
      {[1, 2, 3].map(i => (
        <div key={i} className={`w-2 h-2 ${i <= filled ? 'bg-civiq-blue' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

export function DistrictRelevantBills({ districtId }: DistrictRelevantBillsProps) {
  const { data, error, isLoading, mutate } = useSWR<DistrictBillsData>(
    `/api/district/${districtId}/bills`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Relevant Legislation</h2>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 w-2/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200"></div>
            <div className="h-16 bg-gray-200"></div>
            <div className="h-16 bg-gray-200"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Relevant Legislation</h2>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load relevant legislation</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Relevance is based on district spending patterns and committee assignments
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading relevant legislation"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.bills?.length) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Relevant Legislation</h2>
        <p className="text-gray-500">No relevant bills identified for this district.</p>
      </div>
    );
  }

  const bills = data.bills.slice(0, 10);

  return (
    <div className="bg-white border-2 border-black p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Relevant Legislation</h2>
      <p className="text-sm text-gray-600 mb-4">
        Bills relevant to{' '}
        {data.representativeName ? `${data.representativeName}'s district` : 'this district'} based
        on federal spending and committee assignments.
      </p>

      <div className="space-y-3" role="list" aria-label="Relevant bills">
        {bills.map(bill => (
          <Link
            key={bill.id}
            href={`/bill/${bill.id}`}
            role="listitem"
            aria-label={`${bill.type.toUpperCase()}. ${bill.number}: ${bill.title}`}
            className="block p-4 border border-gray-200 hover:border-civiq-blue hover:bg-civiq-blue/10 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">
                    {bill.type.toUpperCase()}. {bill.number}
                  </span>
                  {bill.status && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium ${statusStyles[bill.status] || 'bg-gray-100 text-gray-700'}`}
                    >
                      {bill.status}
                    </span>
                  )}
                  {bill.policyArea && (
                    <span className="px-2 py-0.5 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20">
                      {bill.policyArea}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">{bill.title}</p>
                {bill.latestActionText && (
                  <p className="text-xs text-gray-500 mt-1">{bill.latestActionText}</p>
                )}
                {!bill.latestActionText && bill.relevanceReasons.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{bill.relevanceReasons[0]}</p>
                )}
              </div>
              <RelevanceIndicator score={bill.relevanceScore} />
            </div>
          </Link>
        ))}
      </div>

      {/* Data Provenance */}
      <DataProvenance
        sources={[
          { name: 'USASpending.gov', status: 'available' },
          { name: 'Congress.gov', status: 'available' },
        ]}
        quality="complete"
        className="mt-4"
      />
    </div>
  );
}

'use client';

import Link from 'next/link';
import useSWR from 'swr';

interface DistrictRelevantBillsProps {
  districtId: string;
}

interface DistrictBill {
  id: string;
  title: string;
  type: string;
  number: string;
  status: string;
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

function RelevanceIndicator({ score }: { score: number }) {
  const filled = Math.min(score, 3);
  return (
    <div className="flex gap-0.5" title={`Relevance: ${score}`}>
      {[1, 2, 3].map(i => (
        <div key={i} className={`w-2 h-2 ${i <= filled ? 'bg-civiq-blue' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

export default function DistrictRelevantBills({ districtId }: DistrictRelevantBillsProps) {
  const { data, error, isLoading } = useSWR<DistrictBillsData>(
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
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data?.bills?.length) {
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

      <div className="space-y-3">
        {bills.map(bill => (
          <Link
            key={bill.id}
            href={`/bill/${bill.id}`}
            className="block p-4 border border-gray-200 hover:border-civiq-blue hover:bg-blue-50 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900 text-sm">
                    {bill.type.toUpperCase()}. {bill.number}
                  </span>
                  {bill.policyArea && (
                    <span className="px-2 py-0.5 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20">
                      {bill.policyArea}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800 line-clamp-2">{bill.title}</p>
                {bill.relevanceReasons.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">{bill.relevanceReasons[0]}</p>
                )}
              </div>
              <RelevanceIndicator score={bill.relevanceScore} />
            </div>
          </Link>
        ))}
      </div>

      {/* Source Attribution */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          Relevance based on district spending patterns (USASpending.gov) and representative
          committee assignments (Congress.gov).
        </p>
      </div>
    </div>
  );
}

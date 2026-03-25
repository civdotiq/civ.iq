'use client';

import useSWR from 'swr';
import { Scale, AlertCircle, RefreshCw } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { FinanceJurisdictionOverlap } from '@/types/joins';

interface FinanceJurisdictionSectionProps {
  bioguideId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

export function FinanceJurisdictionSection({ bioguideId }: FinanceJurisdictionSectionProps) {
  const { data, error, isLoading, mutate } = useSWR<FinanceJurisdictionOverlap>(
    `/api/representative/${bioguideId}/finance-jurisdiction`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Money & Oversight
        </h4>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 w-1/2"></div>
          <div className="h-16 bg-gray-200"></div>
          <div className="h-16 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Money & Oversight
        </h4>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load finance-jurisdiction data</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Shows where campaign donors overlap with committee jurisdiction
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading finance jurisdiction data"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const member = data?.members?.[0];
  if (!data || !member || member.topSectors.length === 0) {
    return null;
  }

  const jurisdictionalSectorSet = new Set(data.industrySectors);
  const topSectors = member.topSectors.slice(0, 8);

  return (
    <div className="bg-white border-2 border-black p-6 mt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <Scale className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Money & Oversight
      </h4>
      <p className="text-sm text-gray-600 mb-4">
        Campaign donor sectors compared to {data.committeeName} jurisdiction
      </p>

      {/* Jurisdiction Topics */}
      {data.jurisdictionTopics.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Committee Topics
          </p>
          <div className="flex flex-wrap gap-2" role="list" aria-label="Jurisdiction topics">
            {data.jurisdictionTopics.slice(0, 8).map(topic => (
              <span
                key={topic}
                role="listitem"
                className="px-2 py-1 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Donor Sectors */}
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          Top Donor Sectors
        </p>
        <div className="space-y-2" role="list" aria-label="Donor sectors">
          {topSectors.map(({ sector, amount }) => {
            const overlaps = jurisdictionalSectorSet.has(sector);
            return (
              <div
                key={sector}
                role="listitem"
                className={`flex items-center justify-between p-3 border ${
                  overlaps ? 'border-gray-300 bg-gray-100' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">{sector}</span>
                  {overlaps && (
                    <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
                      overlaps jurisdiction
                    </span>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-700">
                  ${amount.toLocaleString()}
                </span>
              </div>
            );
          })}
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

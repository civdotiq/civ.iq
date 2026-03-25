'use client';

import useSWR from 'swr';
import { FileText, AlertCircle, RefreshCw, ExternalLink, MessageSquare, Clock } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { FederalRegisterItem } from '@/types/federal-register';
import type { JoinMetadata } from '@/types/joins';

interface CommitteeRegulationsData {
  committeeCode: string;
  committeeName: string;
  chamber: 'House' | 'Senate' | 'Joint';
  oversightAgencies: Array<{ name: string; slug: string; abbreviation: string }>;
  activeRulemakings: FederalRegisterItem[];
  openCommentPeriods: FederalRegisterItem[];
  recentFinalRules: FederalRegisterItem[];
  summary: {
    totalDocuments: number;
    openComments: number;
    urgentComments: number;
  };
  metadata: JoinMetadata;
}

interface CommitteeRegulationsProps {
  committeeId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

function DaysUntilCloseBadge({ days }: { days: number | undefined }) {
  if (days === undefined) return null;
  const urgent = days <= 7;
  return (
    <span
      className={`px-2 py-0.5 text-xs font-medium ${
        urgent ? 'bg-civiq-red/10 text-civiq-red' : 'bg-gray-100 text-gray-600'
      }`}
    >
      {days <= 0 ? 'Closing today' : `${days}d left`}
    </span>
  );
}

function RegulationItem({ item }: { item: FederalRegisterItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 border border-gray-200 hover:border-civiq-blue hover:bg-civiq-blue/10 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm line-clamp-2">{item.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{item.agency}</span>
            <span className="text-xs text-gray-400">&middot;</span>
            <span className="text-xs text-gray-500">{item.publishedDate}</span>
            {item.daysUntilClose !== undefined && (
              <DaysUntilCloseBadge days={item.daysUntilClose} />
            )}
          </div>
          {item.summary && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          {item.commentUrl && (
            <MessageSquare className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
          )}
          <ExternalLink className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
        </div>
      </div>
    </a>
  );
}

export function CommitteeRegulations({ committeeId }: CommitteeRegulationsProps) {
  const { data, error, isLoading, mutate } = useSWR<CommitteeRegulationsData>(
    `/api/committee/${committeeId}/regulations`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Regulations & Rulemaking
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 w-1/3"></div>
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
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Regulations & Rulemaking
        </h2>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load regulations data</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Regulations are sourced from the Federal Register based on committee oversight agencies
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading regulations"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.summary.totalDocuments === 0) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Regulations & Rulemaking
        </h2>
        <div className="text-center py-6">
          <FileText className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">No related regulations found</p>
          <p className="text-sm text-gray-500 mt-1">
            No active rulemakings or recent rules from this committee&apos;s oversight agencies
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-black p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <FileText className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Regulations & Rulemaking ({data.summary.totalDocuments})
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Federal Register activity from agencies under this committee&apos;s oversight
      </p>

      {/* Open Comment Periods */}
      {data.openCommentPeriods.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" aria-hidden="true" />
            Open Comment Periods ({data.openCommentPeriods.length})
            {data.summary.urgentComments > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-civiq-red/10 text-civiq-red">
                {data.summary.urgentComments} closing soon
              </span>
            )}
          </h3>
          <div className="space-y-2" role="list" aria-label="Open comment periods">
            {data.openCommentPeriods.slice(0, 5).map(item => (
              <RegulationItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Active Rulemakings */}
      {data.activeRulemakings.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Active Rulemakings ({data.activeRulemakings.length})
          </h3>
          <div className="space-y-2" role="list" aria-label="Active rulemakings">
            {data.activeRulemakings.slice(0, 5).map(item => (
              <RegulationItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Recent Final Rules */}
      {data.recentFinalRules.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Recent Final Rules ({data.recentFinalRules.length})
          </h3>
          <div className="space-y-2" role="list" aria-label="Recent final rules">
            {data.recentFinalRules.slice(0, 5).map(item => (
              <RegulationItem key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

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

export default CommitteeRegulations;

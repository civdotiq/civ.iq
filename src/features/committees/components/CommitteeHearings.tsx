'use client';

import useSWR from 'swr';
import { BookOpen, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { DataProvenance } from '@/shared/components/ui/DataProvenance';
import type { GovInfoDocument } from '@/types/govinfo';
import type { JoinMetadata } from '@/types/joins';

interface HearingConnection extends GovInfoDocument {
  relevanceScore: number;
  matchedTopics: string[];
  connectionType: 'committee' | 'bill' | 'policy-area';
}

interface HearingsConnectionsData {
  filter: {
    committeeId?: string;
    billId?: string;
    policyArea?: string;
  };
  hearings: HearingConnection[];
  summary: {
    totalMatches: number;
    topTopics: string[];
  };
  metadata: JoinMetadata;
}

interface CommitteeHearingsProps {
  committeeId: string;
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
    <div className="flex gap-0.5" role="img" aria-label={`Relevance: ${filled} out of 3`}>
      {[1, 2, 3].map(i => (
        <div key={i} className={`w-2 h-2 ${i <= filled ? 'bg-civiq-blue' : 'bg-gray-200'}`} />
      ))}
    </div>
  );
}

export function CommitteeHearings({ committeeId }: CommitteeHearingsProps) {
  const { data, error, isLoading, mutate } = useSWR<HearingsConnectionsData>(
    `/api/govinfo/hearings/connections?committeeId=${committeeId}`,
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
          <BookOpen className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Hearings
        </h2>
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
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Hearings
        </h2>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load hearings data</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Hearings are sourced from GovInfo based on committee topics
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-civiq-blue focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading hearings"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data?.hearings?.length) {
    return (
      <div className="bg-white border-2 border-black p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          Related Hearings
        </h2>
        <p className="text-gray-500">No recent hearings found for this committee.</p>
      </div>
    );
  }

  const hearings = data.hearings.slice(0, 10);

  return (
    <div className="bg-white border-2 border-black p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        Related Hearings ({data.summary.totalMatches})
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Recent congressional hearings matched by committee topics and jurisdiction
      </p>

      {/* Top Topics */}
      {data.summary.topTopics.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4" role="list" aria-label="Top hearing topics">
          {data.summary.topTopics.map(topic => (
            <span
              key={topic}
              role="listitem"
              className="px-2 py-1 bg-civiq-blue/10 text-civiq-blue text-xs border border-civiq-blue/20"
            >
              {topic}
            </span>
          ))}
        </div>
      )}

      {/* Hearings List */}
      <div className="space-y-3" role="list" aria-label="Congressional hearings">
        {hearings.map(hearing => (
          <a
            key={hearing.id}
            href={hearing.pdfUrl ?? hearing.detailsUrl}
            target="_blank"
            rel="noopener noreferrer"
            role="listitem"
            className="block p-4 border border-gray-200 hover:border-civiq-blue hover:bg-civiq-blue/10 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm line-clamp-2">{hearing.title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs text-gray-500">{hearing.chamber}</span>
                  <span className="text-xs text-gray-400">&middot;</span>
                  <span className="text-xs text-gray-500">
                    {new Date(hearing.dateIssued).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {hearing.matchedTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {hearing.matchedTopics.map(topic => (
                      <span key={topic} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 ml-3 flex-shrink-0">
                <RelevanceIndicator score={hearing.relevanceScore} />
                <ExternalLink className="w-4 h-4 text-civiq-blue" aria-hidden="true" />
              </div>
            </div>
          </a>
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

export default CommitteeHearings;

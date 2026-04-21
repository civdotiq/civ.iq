/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { InsightCard, lobbyingPipelineKeyStats } from './InsightCard';
import { InfluenceChainTable } from './InfluenceChainTable';
import type { LobbyingPipelineInsight } from '@/lib/intelligence/types';

interface CommitteeIntelligenceProps {
  committeeId: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function CommitteeIntelligence({ committeeId }: CommitteeIntelligenceProps) {
  const { data, isLoading } = useSWR<LobbyingPipelineInsight>(
    `/api/intelligence/committee/${committeeId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-gray-50 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/2 mb-4" />
        <div className="h-32 bg-gray-200 border-2 border-gray-300" />
      </div>
    );
  }

  if (!data?.committeeCode) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-gray-900">Intelligence</h2>
        <div className="bg-white border-2 border-black p-6">
          <p className="aicher-heading type-lg text-gray-900 mb-2">
            No lobbying intelligence yet for this committee
          </p>
          <p className="type-sm text-gray-500">
            We haven&apos;t matched lobbying filings or campaign-finance activity to this
            committee&apos;s recent legislation. This usually means the bills in scope are too early
            in the process or too narrow to show a pattern.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Intelligence</h2>
      <InfluenceChainTable insight={data} />
      <InsightCard
        title="Lobbying Pipeline"
        insight={data}
        keyStats={lobbyingPipelineKeyStats(data)}
      />
    </div>
  );
}

export default CommitteeIntelligence;

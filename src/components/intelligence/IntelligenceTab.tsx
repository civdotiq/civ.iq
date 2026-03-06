/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import {
  InsightCard,
  financeJurisdictionKeyStats,
  voteFinanceKeyStats,
  temporalVoteKeyStats,
} from './InsightCard';
import { VoteShiftTimeline } from './VoteShiftTimeline';
import type {
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
  TemporalVoteInsight,
} from '@/lib/intelligence/types';

interface IntelligenceTabProps {
  bioguideId: string;
}

interface InsightsResponse {
  bioguideId: string;
  insights: {
    financeJurisdiction: FinanceJurisdictionInsight | null;
    voteFinance: VoteFinanceInsight | null;
  };
  generatedAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function IntelligenceTab({ bioguideId }: IntelligenceTabProps) {
  const { data, error, isLoading } = useSWR<InsightsResponse>(
    `/api/intelligence/representative/${bioguideId}`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes
    }
  );

  // Temporal insights loaded independently (expensive endpoint)
  const { data: temporalData, isLoading: temporalLoading } = useSWR<TemporalVoteInsight>(
    `/api/intelligence/representative/${bioguideId}/temporal`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return <IntelligenceLoading />;
  }

  if (error) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">
          Unable to load intelligence insights. Please try again later.
        </p>
      </div>
    );
  }

  const { financeJurisdiction, voteFinance } = data?.insights ?? {};
  const temporal = temporalData?.quarters ? temporalData : null;
  const hasInsights = financeJurisdiction || voteFinance || temporal;

  if (!hasInsights && !temporalLoading) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="aicher-heading type-lg text-gray-900 mb-2">No insights available</p>
        <p className="type-sm text-gray-500">
          Insufficient data to generate intelligence insights for this representative. This may be
          because campaign finance or voting data is not yet available.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="type-sm text-gray-500">
        Statistical analysis connecting campaign finance, voting records, and committee
        jurisdictions using public government data.
      </p>

      {financeJurisdiction && (
        <InsightCard
          title="Finance-Jurisdiction Overlap"
          insight={financeJurisdiction}
          keyStats={financeJurisdictionKeyStats(financeJurisdiction)}
        />
      )}

      {voteFinance && (
        <InsightCard
          title="Vote-Finance Correlation"
          insight={voteFinance}
          keyStats={voteFinanceKeyStats(voteFinance)}
        />
      )}

      {temporal && (
        <>
          <VoteShiftTimeline quarters={temporal.quarters} shifts={temporal.shifts} />
          <InsightCard
            title="Voting Pattern Shifts"
            insight={temporal}
            keyStats={temporalVoteKeyStats(temporal)}
          />
        </>
      )}

      {temporalLoading && !temporal && (
        <div className="border-2 border-gray-200 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/2 mb-4" />
          <div className="h-48 bg-gray-200 border-2 border-gray-300" />
        </div>
      )}
    </div>
  );
}

function IntelligenceLoading() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 border-2 border-gray-300 w-3/4 mb-6" />
        {[1, 2].map(i => (
          <div key={i} className="border-2 border-gray-200 p-6 mb-6">
            <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/2 mb-4" />
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 2, 3].map(j => (
                <div key={j} className="border-2 border-gray-200 p-3">
                  <div className="h-8 bg-gray-200 border-2 border-gray-300 mb-1" />
                  <div className="h-3 bg-gray-200 border-2 border-gray-300 w-2/3" />
                </div>
              ))}
            </div>
            <div className="h-4 bg-gray-200 border-2 border-gray-300 mb-2" />
            <div className="h-4 bg-gray-200 border-2 border-gray-300 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}

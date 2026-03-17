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
  lobbyingPipelineKeyStats,
  stockCommitteeKeyStats,
} from './InsightCard';
import { VoteShiftTimeline } from './VoteShiftTimeline';
import { InfluenceChainTable } from './InfluenceChainTable';
import { StockOverlapTable } from './StockOverlapTable';
import { VotePredictionCard } from './VotePredictionCard';
import { InfluenceChainCard } from './InfluenceChainCard';
import { CivicBriefCard } from './CivicBriefCard';
import { InfluenceClusterChart } from './InfluenceClusterChart';
import { CounterfactualSection } from '@/components/mesh/CounterfactualSection';
import type {
  CivicBriefInsight,
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
  TemporalVoteInsight,
  LobbyingPipelineInsight,
  StockCommitteeInsight,
  VotePredictionInsight,
  InfluenceChainInsight,
} from '@/lib/intelligence/types';

interface IntelligenceTabProps {
  bioguideId: string;
  /** Committee codes this representative serves on (e.g., ["SSFI", "SSAS"]). */
  committeeCodes?: string[];
}

const fetcher = (url: string) =>
  fetch(url).then(res => {
    if (!res.ok) throw new Error(`${res.status}`);
    return res.json();
  });

const SWR_OPTIONS = {
  revalidateOnFocus: false,
  dedupingInterval: 300000, // 5 minutes
};

export function IntelligenceTab({ bioguideId, committeeCodes }: IntelligenceTabProps) {
  // All insights load independently — no single request blocks the entire tab
  const {
    data: financeJurisdictionData,
    error: fjError,
    isLoading: fjLoading,
  } = useSWR<FinanceJurisdictionInsight>(
    `/api/intelligence/representative/${bioguideId}/finance-jurisdiction`,
    fetcher,
    SWR_OPTIONS
  );

  const {
    data: voteFinanceData,
    error: vfError,
    isLoading: vfLoading,
  } = useSWR<VoteFinanceInsight>(
    `/api/intelligence/representative/${bioguideId}/vote-finance`,
    fetcher,
    SWR_OPTIONS
  );

  const { data: temporalData, isLoading: temporalLoading } = useSWR<TemporalVoteInsight>(
    `/api/intelligence/representative/${bioguideId}/temporal`,
    fetcher,
    SWR_OPTIONS
  );

  const primaryCommittee = committeeCodes?.[0];
  const { data: lobbyingData, isLoading: lobbyingLoading } = useSWR<LobbyingPipelineInsight>(
    primaryCommittee ? `/api/intelligence/committee/${primaryCommittee}` : null,
    fetcher,
    SWR_OPTIONS
  );

  const { data: stockData, isLoading: stockLoading } = useSWR<StockCommitteeInsight>(
    `/api/intelligence/representative/${bioguideId}/stock-trades`,
    fetcher,
    SWR_OPTIONS
  );

  const { data: votePredictionData, isLoading: votePredictionLoading } =
    useSWR<VotePredictionInsight>(
      `/api/intelligence/representative/${bioguideId}/vote-prediction`,
      fetcher,
      SWR_OPTIONS
    );

  const { data: influenceChainData, isLoading: influenceChainLoading } =
    useSWR<InfluenceChainInsight>(
      `/api/intelligence/representative/${bioguideId}/influence-chain`,
      fetcher,
      SWR_OPTIONS
    );

  const { data: civicBriefData, isLoading: civicBriefLoading } = useSWR<CivicBriefInsight>(
    `/api/intelligence/representative/${bioguideId}/brief`,
    fetcher,
    SWR_OPTIONS
  );

  // Validate responses — only use data with expected shape
  const financeJurisdiction =
    financeJurisdictionData?.overlapScore != null ? financeJurisdictionData : null;
  const voteFinance = voteFinanceData?.overallCorrelation != null ? voteFinanceData : null;
  const temporal = temporalData?.quarters ? temporalData : null;
  const lobbying = lobbyingData?.committeeCode ? lobbyingData : null;
  const stock = stockData?.flaggedTrades ? stockData : null;
  const votePrediction = votePredictionData?.independenceScore ? votePredictionData : null;
  const influenceChain = influenceChainData?.chains ? influenceChainData : null;
  const civicBrief = civicBriefData?.identity ? civicBriefData : null;

  const hasAnyInsight =
    civicBrief ||
    financeJurisdiction ||
    voteFinance ||
    temporal ||
    lobbying ||
    stock ||
    votePrediction ||
    influenceChain;
  const allDoneLoading =
    !civicBriefLoading &&
    !fjLoading &&
    !vfLoading &&
    !temporalLoading &&
    !lobbyingLoading &&
    !stockLoading &&
    !votePredictionLoading &&
    !influenceChainLoading;
  const allErrored =
    fjError &&
    vfError &&
    !temporalData &&
    !lobbyingData &&
    !stockData &&
    !votePredictionData &&
    !influenceChainData;

  // If all primary sources errored out, show error message
  if (allErrored && allDoneLoading) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">
          Unable to load intelligence insights. Please try again later.
        </p>
      </div>
    );
  }

  // If everything finished loading and nothing has data, show empty state
  if (!hasAnyInsight && allDoneLoading) {
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

  // Show initial loading only if nothing has resolved yet
  const nothingYet = !hasAnyInsight && !allDoneLoading;

  return (
    <div className="space-y-6">
      <p className="type-sm text-gray-500">
        Statistical analysis connecting campaign finance, voting records, and committee
        jurisdictions using public government data.
      </p>

      {/* Civic Intelligence Brief */}
      {civicBrief && <CivicBriefCard insight={civicBrief} />}
      {civicBriefLoading && !civicBrief && <InsightSkeleton tall />}

      {/* Finance-Jurisdiction */}
      {financeJurisdiction && (
        <InsightCard
          title="Finance-Jurisdiction Overlap"
          insight={financeJurisdiction}
          keyStats={financeJurisdictionKeyStats(financeJurisdiction)}
        />
      )}
      {fjLoading && !financeJurisdiction && <InsightSkeleton />}

      {/* Vote-Finance */}
      {voteFinance && (
        <InsightCard
          title="Vote-Finance Correlation"
          insight={voteFinance}
          keyStats={voteFinanceKeyStats(voteFinance)}
        />
      )}
      {vfLoading && !voteFinance && <InsightSkeleton />}

      {/* Temporal */}
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
      {temporalLoading && !temporal && <InsightSkeleton tall />}

      {/* Lobbying Pipeline */}
      {lobbying && (
        <>
          <InfluenceChainTable insight={lobbying} />
          <InsightCard
            title="Lobbying Pipeline"
            insight={lobbying}
            keyStats={lobbyingPipelineKeyStats(lobbying)}
          />
        </>
      )}
      {lobbyingLoading && !lobbying && primaryCommittee && <InsightSkeleton />}

      {/* Influence Chain */}
      {influenceChain && <InfluenceChainCard insight={influenceChain} />}
      {influenceChainLoading && !influenceChain && <InsightSkeleton />}

      {/* Vote Prediction */}
      {votePrediction && <VotePredictionCard insight={votePrediction} />}
      {votePredictionLoading && !votePrediction && <InsightSkeleton />}

      {/* Stock Trades */}
      {stock && (
        <>
          <StockOverlapTable insight={stock} />
          <InsightCard
            title="Stock Trade-Committee Overlap"
            insight={stock}
            keyStats={stockCommitteeKeyStats(stock)}
          />
        </>
      )}
      {stockLoading && !stock && <InsightSkeleton />}

      {/* What-If Analysis */}
      <CounterfactualSection bioguideId={bioguideId} />

      {/* Influence Clusters (always loads independently) */}
      <InfluenceClusterChart highlightBioguideId={bioguideId} />

      {/* Initial loading state when nothing has resolved */}
      {nothingYet && (
        <div className="border-2 border-gray-200 p-6 text-center">
          <p className="type-sm text-gray-500">Loading intelligence insights...</p>
        </div>
      )}
    </div>
  );
}

function InsightSkeleton({ tall = false }: { tall?: boolean }) {
  return (
    <div className="border-2 border-gray-200 p-6 animate-pulse">
      <div className="h-6 bg-gray-200 border-2 border-gray-300 w-1/2 mb-4" />
      <div className={`${tall ? 'h-48' : 'h-32'} bg-gray-200 border-2 border-gray-300`} />
    </div>
  );
}

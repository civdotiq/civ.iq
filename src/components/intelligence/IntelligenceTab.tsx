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
import { InfluenceGraphCard } from './InfluenceGraphCard';
import { CivicBriefCard } from './CivicBriefCard';
import { InfluenceClusterChart } from './InfluenceClusterChart';
import { TemporalProximityCard } from './TemporalProximityCard';
import { AnomalyFlagsDisplay } from './AnomalyFlagsDisplay';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import { CounterfactualSection } from '@/components/mesh/CounterfactualSection';
import type { TemporalProximityInsight } from '@/lib/intelligence/analyzers/temporal-proximity-analyzer';
import type {
  CivicBriefInsight,
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
  TemporalVoteInsight,
  LobbyingPipelineInsight,
  StockCommitteeInsight,
  VotePredictionInsight,
  InfluenceChainInsight,
  InfluenceGraphInsight,
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

  // Fetch lobbying data for top 3 committees (fixed hook count for React rules)
  const topCommittees = (committeeCodes ?? []).slice(0, 3);
  const { data: lobbyingData0, isLoading: lobbyingLoading0 } = useSWR<LobbyingPipelineInsight>(
    topCommittees[0] ? `/api/intelligence/committee/${topCommittees[0]}` : null,
    fetcher,
    SWR_OPTIONS
  );
  const { data: lobbyingData1, isLoading: lobbyingLoading1 } = useSWR<LobbyingPipelineInsight>(
    topCommittees[1] ? `/api/intelligence/committee/${topCommittees[1]}` : null,
    fetcher,
    SWR_OPTIONS
  );
  const { data: lobbyingData2, isLoading: lobbyingLoading2 } = useSWR<LobbyingPipelineInsight>(
    topCommittees[2] ? `/api/intelligence/committee/${topCommittees[2]}` : null,
    fetcher,
    SWR_OPTIONS
  );
  const lobbyingLoading = lobbyingLoading0 || lobbyingLoading1 || lobbyingLoading2;

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

  const { data: influenceGraphData, isLoading: influenceGraphLoading } =
    useSWR<InfluenceGraphInsight>(
      `/api/intelligence/representative/${bioguideId}/influence-graph`,
      fetcher,
      { ...SWR_OPTIONS, dedupingInterval: 600000 } // 10 min — expensive endpoint
    );

  const { data: civicBriefData, isLoading: civicBriefLoading } = useSWR<CivicBriefInsight>(
    `/api/intelligence/representative/${bioguideId}/brief`,
    fetcher,
    SWR_OPTIONS
  );

  const { data: temporalProximityData, isLoading: temporalProximityLoading } =
    useSWR<TemporalProximityInsight>(
      `/api/intelligence/temporal-proximity/${bioguideId}`,
      fetcher,
      SWR_OPTIONS
    );

  // Validate responses — only use data with expected shape
  const financeJurisdiction =
    financeJurisdictionData?.overlapScore != null ? financeJurisdictionData : null;
  const voteFinance = voteFinanceData?.overallCorrelation != null ? voteFinanceData : null;
  const temporal = temporalData?.quarters ? temporalData : null;
  const lobbyingResults = [lobbyingData0, lobbyingData1, lobbyingData2].filter(
    (d): d is LobbyingPipelineInsight => d?.committeeCode != null
  );
  const lobbying = lobbyingResults.length > 0 ? lobbyingResults[0]! : null;
  const stock = stockData?.flaggedTrades ? stockData : null;
  const votePrediction = votePredictionData?.independenceScore ? votePredictionData : null;
  const influenceChain = influenceChainData?.chains ? influenceChainData : null;
  const influenceGraph = influenceGraphData?.graphStats ? influenceGraphData : null;
  const civicBrief = civicBriefData?.identity ? civicBriefData : null;
  const temporalProximity = temporalProximityData?.patterns ? temporalProximityData : null;

  const hasAnyInsight =
    civicBrief ||
    financeJurisdiction ||
    voteFinance ||
    temporal ||
    lobbying ||
    stock ||
    votePrediction ||
    influenceChain ||
    influenceGraph ||
    temporalProximity;
  const allDoneLoading =
    !civicBriefLoading &&
    !fjLoading &&
    !vfLoading &&
    !temporalLoading &&
    !lobbyingLoading &&
    !stockLoading &&
    !votePredictionLoading &&
    !influenceChainLoading &&
    !influenceGraphLoading &&
    !temporalProximityLoading;
  const allErrored =
    fjError &&
    vfError &&
    !temporalData &&
    !lobbyingData0 &&
    !stockData &&
    !votePredictionData &&
    !influenceChainData &&
    !influenceGraphData;

  // If all primary sources errored out, show error message
  if (allErrored && allDoneLoading) {
    return (
      <div className="bg-gray-50 p-6 text-center">
        <p className="type-sm text-gray-500">
          Unable to load intelligence insights. Please try again later.
        </p>
      </div>
    );
  }

  // If everything finished loading and nothing has data, show empty state
  if (!hasAnyInsight && allDoneLoading) {
    return (
      <div className="bg-gray-50 p-6 text-center">
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

  // Count available detailed analyses for the summary label
  const detailedCount =
    [
      financeJurisdiction,
      voteFinance,
      temporal,
      influenceChain,
      influenceGraph,
      votePrediction,
      stock,
      temporalProximity,
    ].filter(Boolean).length + lobbyingResults.length;
  // Always-rendered sections (What-If, Clusters) add to the count
  const totalDetailedCount = detailedCount + 2;
  // Always show details section — What-If and Clusters are always available,
  // plus we show it while data is still loading
  const hasDetailedInsights = civicBrief != null || !allDoneLoading;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 mb-grid-3 border-l-2 border-gray-200 pl-grid-2">
        Patterns found in public records. Cannot measure intent, relationships, or private dealings.
      </p>

      {/* Tier 1: Civic Brief — always visible */}
      {civicBrief && <CivicBriefCard insight={civicBrief} />}
      {civicBriefLoading && !civicBrief && <InsightPlaceholder tall />}

      {/* Tier 2: Detailed analysis — collapsed by default */}
      {hasDetailedInsights && (
        <details className="group">
          <summary className="cursor-pointer list-none py-3 bg-gray-50 px-4 sm:px-6 flex items-center justify-between aicher-focus [&::-webkit-details-marker]:hidden">
            <span className="aicher-heading type-sm text-[#3ea2d4]">
              Show detailed analysis
              {allDoneLoading && ` (${totalDetailedCount} sections available)`}
            </span>
            <span
              className="type-sm text-gray-400 group-open:rotate-180 transition-transform"
              aria-hidden="true"
            >
              ▼
            </span>
          </summary>

          <div className="space-y-6 mt-6">
            <p className="type-sm text-gray-500">
              Statistical analysis connecting campaign finance, voting records, and committee
              jurisdictions using public government data.
            </p>

            {/* Finance-Jurisdiction */}
            {financeJurisdiction && (
              <InsightCard
                title="Do donors match committee power?"
                insight={financeJurisdiction}
                keyStats={financeJurisdictionKeyStats(financeJurisdiction)}
              />
            )}
            {fjLoading && !financeJurisdiction && <InsightPlaceholder />}

            {/* Anomaly Flags — plain-language funding outliers */}
            {financeJurisdiction?.peerComparison?.anomalies && (
              <AnomalyFlagsDisplay anomalies={financeJurisdiction.peerComparison.anomalies} />
            )}

            {/* Vote-Finance */}
            {voteFinance && (
              <InsightCard
                title="Do donations align with votes?"
                insight={voteFinance}
                keyStats={voteFinanceKeyStats(voteFinance)}
              />
            )}
            {vfLoading && !voteFinance && <InsightPlaceholder />}

            {/* Vote-Finance Anomalies */}
            {voteFinance?.peerComparison?.anomalies && (
              <AnomalyFlagsDisplay anomalies={voteFinance.peerComparison.anomalies} />
            )}

            {/* Temporal */}
            {temporal && (
              <>
                <VoteShiftTimeline quarters={temporal.quarters} shifts={temporal.shifts} />
                <InsightCard
                  title="Has voting behavior changed?"
                  insight={temporal}
                  keyStats={temporalVoteKeyStats(temporal)}
                />
              </>
            )}
            {temporalLoading && !temporal && <InsightPlaceholder tall />}

            {/* Temporal Anomalies */}
            {temporal?.peerComparison?.anomalies && (
              <AnomalyFlagsDisplay anomalies={temporal.peerComparison.anomalies} />
            )}

            {/* Lobbying Pipeline — top 3 committees */}
            {lobbyingResults.map(lob => (
              <div key={lob.committeeCode}>
                <InfluenceChainTable insight={lob} />
                <InsightCard
                  title={`Who lobbies ${lob.committeeName ?? lob.committeeCode}?`}
                  insight={lob}
                  keyStats={lobbyingPipelineKeyStats(lob)}
                />
              </div>
            ))}
            {lobbyingLoading && lobbyingResults.length === 0 && topCommittees.length > 0 && (
              <InsightPlaceholder />
            )}

            {/* Influence Chain */}
            {influenceChain && <InfluenceChainCard insight={influenceChain} />}
            {influenceChainLoading && !influenceChain && <InsightPlaceholder />}

            {/* Influence Graph — extended chains with regulation, enforcement, outcomes */}
            {influenceGraph && <InfluenceGraphCard insight={influenceGraph} />}
            {influenceGraphLoading && !influenceGraph && <InsightPlaceholder tall />}

            {/* Vote Prediction */}
            {votePrediction && <VotePredictionCard insight={votePrediction} />}
            {votePredictionLoading && !votePrediction && <InsightPlaceholder />}

            {/* Stock Trades */}
            {stock && (
              <>
                <StockOverlapTable insight={stock} />
                <InsightCard
                  title="Stock trades in committee sectors"
                  insight={stock}
                  keyStats={stockCommitteeKeyStats(stock)}
                />
              </>
            )}
            {stockLoading && !stock && <InsightPlaceholder />}

            {/* Timing Patterns */}
            {temporalProximity && <TemporalProximityCard insight={temporalProximity} />}
            {temporalProximityLoading && !temporalProximity && <InsightPlaceholder />}

            {/* What-If Analysis */}
            <CounterfactualSection bioguideId={bioguideId} />

            {/* Influence Clusters */}
            <InfluenceClusterChart highlightBioguideId={bioguideId} />
          </div>
        </details>
      )}

      {/* Initial loading state when nothing has resolved */}
      {nothingYet && (
        <div className="bg-gray-50 p-6 text-center">
          <p className="type-sm text-gray-500">Loading intelligence insights...</p>
        </div>
      )}
    </div>
  );
}

function InsightPlaceholder({ tall = false }: { tall?: boolean }) {
  return (
    <div className={`bg-gray-50 p-6 flex items-center justify-center ${tall ? 'h-60' : 'h-44'}`}>
      <LoadingState message="Loading insight..." />
    </div>
  );
}

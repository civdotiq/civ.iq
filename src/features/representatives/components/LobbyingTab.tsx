/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { MoneyFlowChain } from '@/components/intelligence/MoneyFlowChain';
import { InsightDisclaimer } from '@/components/intelligence/InsightDisclaimer';
import type { InfluenceChainInsight } from '@/lib/intelligence/types';

interface LobbyingTabProps {
  bioguideId: string;
  hasCommittees: boolean;
}

interface LobbyingCompany {
  name: string;
  totalSpending: number;
  committees: string[];
  recentFilings: number;
}

interface CommitteeBreakdownItem {
  committee: string;
  totalSpending: number;
  companyCount: number;
  topIssues: string[];
}

interface LobbyingResponse {
  lobbyingData: {
    totalRelevantSpending: number;
    affectedCommittees: number;
    topCompanies: LobbyingCompany[];
    committeeBreakdown: CommitteeBreakdownItem[];
  };
}

const INITIAL_CHAINS = 3;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function StatBox({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-2 border-gray-200 p-3">
      <div className="aicher-heading type-2xl text-gray-900">{value}</div>
      <div className="type-xs text-gray-500 aicher-heading-wide">{label}</div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="border-2 border-gray-200 p-3">
            <div className="h-8 bg-gray-200 w-16 mb-2" />
            <div className="h-3 bg-gray-100 w-24" />
          </div>
        ))}
      </div>
      <div className="h-4 bg-gray-200 w-48" />
      {[1, 2, 3].map(i => (
        <div key={i} className="border-2 border-gray-200 p-12" />
      ))}
    </div>
  );
}

export function LobbyingTab({ bioguideId, hasCommittees }: LobbyingTabProps) {
  const [showAllChains, setShowAllChains] = useState(false);

  const {
    data: lobbyingData,
    error: lobbyingError,
    isLoading: lobbyingLoading,
  } = useSWR<LobbyingResponse>(`/api/representative/${bioguideId}/lobbying`, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 300000,
  });

  const {
    data: chainData,
    error: chainError,
    isLoading: chainLoading,
  } = useSWR<InfluenceChainInsight>(
    hasCommittees ? `/api/intelligence/representative/${bioguideId}/influence-chain` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const isLoading = lobbyingLoading || chainLoading;

  if (isLoading) return <LoadingSkeleton />;

  if (lobbyingError && chainError) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">Lobbying data temporarily unavailable.</p>
        <p className="type-xs text-gray-400 mt-2">Please try again later.</p>
      </div>
    );
  }

  const lobbying = lobbyingData?.lobbyingData;
  const hasLobbyingData =
    lobbying && ((lobbying.topCompanies?.length ?? 0) > 0 || lobbying.totalRelevantSpending > 0);
  const hasChains = chainData?.chains && chainData.chains.length > 0;

  if (!hasLobbyingData && !hasChains) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">
          No lobbying data found for this representative&#39;s committees.
        </p>
        <p className="type-xs text-gray-400 mt-2">
          Lobbying data requires committee membership to identify relevant corporate influence.
        </p>
      </div>
    );
  }

  const displayedChains = hasChains
    ? showAllChains
      ? chainData.chains
      : chainData.chains.slice(0, INITIAL_CHAINS)
    : [];
  const hasMoreChains = hasChains && chainData.chains.length > INITIAL_CHAINS;

  return (
    <div className="space-y-6">
      {/* Summary stats */}
      {hasLobbyingData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatBox
            value={formatCompact(lobbying.totalRelevantSpending)}
            label="Total lobbying spending"
          />
          <StatBox value={String(lobbying.topCompanies.length)} label="Organizations lobbying" />
          <StatBox value={String(lobbying.affectedCommittees)} label="Committees targeted" />
        </div>
      )}

      {/* Follow the Money section */}
      {hasChains && (
        <div>
          <h3 className="aicher-heading type-lg text-gray-900 mb-4">Follow the Money</h3>
          <div className="space-y-4">
            {displayedChains.map((chain, i) => (
              <MoneyFlowChain
                key={`${chain.organization}-${chain.billId}-${i}`}
                chain={chain}
                className="border-2 border-gray-200 p-3 sm:p-4"
              />
            ))}
          </div>
          {hasMoreChains && (
            <button
              onClick={() => setShowAllChains(prev => !prev)}
              className="type-xs text-[#3ea2d4] aicher-heading-wide mt-3 py-2 min-h-[44px] inline-flex items-center aicher-focus"
              aria-expanded={showAllChains}
            >
              {showAllChains ? 'Show fewer chains' : `Show all ${chainData.chains.length} chains`}
            </button>
          )}
        </div>
      )}

      {/* Top Organizations */}
      {hasLobbyingData && lobbying.topCompanies.length > 0 && (
        <div>
          <h3 className="aicher-heading type-lg text-gray-900 mb-4">Top Organizations</h3>
          <div className="space-y-3">
            {lobbying.topCompanies.map(company => (
              <div key={company.name} className="border-2 border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="type-sm font-medium text-gray-900">{company.name}</span>
                  <span className="type-xs text-gray-500 aicher-heading-wide flex-shrink-0">
                    {formatCompact(company.totalSpending)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                  <span className="type-xs text-gray-500">
                    {company.committees.length} committee
                    {company.committees.length !== 1 ? 's' : ''} lobbied
                  </span>
                  <span className="type-xs text-gray-500">
                    {company.recentFilings} filing{company.recentFilings !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Committee Breakdown */}
      {hasLobbyingData && lobbying.committeeBreakdown.length > 0 && (
        <div>
          <h3 className="aicher-heading type-lg text-gray-900 mb-4">Committee Breakdown</h3>
          <div className="space-y-3">
            {lobbying.committeeBreakdown.map(cb => (
              <div key={cb.committee} className="border-2 border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="type-sm font-medium text-gray-900">{cb.committee}</span>
                  <span className="type-xs text-gray-500 aicher-heading-wide flex-shrink-0">
                    {formatCompact(cb.totalSpending)}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="type-xs text-gray-500">
                    {cb.companyCount} organization{cb.companyCount !== 1 ? 's' : ''}
                  </span>
                  {cb.topIssues.length > 0 && (
                    <span className="type-xs text-gray-400 ml-3">
                      Issues: {cb.topIssues.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Narrative + disclaimer from influence chain insight */}
      {hasChains && (
        <div>
          <p className="type-sm text-gray-700 leading-relaxed">{chainData.narrative}</p>
          <InsightDisclaimer
            disclaimer={chainData.disclaimer}
            methodology={chainData.methodology}
            source={chainData.source}
          />
        </div>
      )}
    </div>
  );
}

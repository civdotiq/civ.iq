/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { MoneyFlowChain } from '@/components/intelligence/MoneyFlowChain';
import { InsightDisclaimer } from '@/components/intelligence/InsightDisclaimer';
import { LoadingState } from '@/components/shared/ui/LoadingState';
import { LobbyLink, SectorLink } from '@/components/shared/links/EntityLinks';
import type { InfluenceChainInsight } from '@/lib/intelligence/types';

interface LobbyingTabProps {
  bioguideId: string;
  hasCommittees: boolean;
}

interface LobbyingCompany {
  name: string;
  registrantId: string | null;
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

interface QuarterlyTrend {
  quarter: string;
  year: number;
  spending: number;
}

interface IndustryBreakdown {
  industry: string;
  filingCount: number;
  percentage: number;
}

interface LobbyingResponse {
  representative?: {
    name: string;
    committees: string[];
  };
  lobbyingData: {
    totalRelevantSpending: number;
    affectedCommittees: number;
    topCompanies: LobbyingCompany[];
    committeeBreakdown: CommitteeBreakdownItem[];
    summary?: {
      quarterlyTrend: QuarterlyTrend[];
      industryBreakdown: IndustryBreakdown[];
    };
  };
  dataQuality?: 'complete' | 'partial' | 'empty' | 'unavailable';
  metadata?: {
    coveragePeriod: string;
    note?: string;
  };
}

const INITIAL_CHAINS = 3;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

function ldaSearchUrl(registrantName: string): string {
  return `https://lda.senate.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(registrantName)}&filing_year=`;
}

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

function LobbyingLoadingState() {
  return <LoadingState message="Loading lobbying data..." />;
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

  if (isLoading) return <LobbyingLoadingState />;

  if (lobbyingError && chainError) {
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">Lobbying data source temporarily unavailable.</p>
        <p className="type-xs text-gray-400 mt-2">
          The Senate LDA API may be experiencing issues. Please try again later.
        </p>
      </div>
    );
  }

  const lobbying = lobbyingData?.lobbyingData;
  const repName = lobbyingData?.representative?.name;
  const coveragePeriod = lobbyingData?.metadata?.coveragePeriod;
  const hasLobbyingData =
    lobbying && ((lobbying.topCompanies?.length ?? 0) > 0 || lobbying.totalRelevantSpending > 0);
  const hasChains = chainData?.chains && chainData.chains.length > 0;

  if (!hasLobbyingData && !hasChains) {
    const note = lobbyingData?.metadata?.note;
    return (
      <div className="border-2 border-gray-200 p-6 text-center">
        <p className="type-sm text-gray-500">
          {note ?? 'No lobbying data found for this representative\u2019s committees.'}
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
      {/* Intro disclaimer — matches FinanceTab, VotingTab, BillsTab pattern */}
      <p className="text-sm text-gray-500 mb-grid-3 border-l-2 border-gray-200 pl-grid-2">
        Shows which organizations filed lobbying disclosures related to
        {repName ? ` ${repName}'s` : " this representative's"} committee assignments
        {coveragePeriod ? ` (${coveragePeriod.toLowerCase()})` : ''}. Filing a disclosure does not
        mean money changed hands or votes were affected.{' '}
        <a
          href="https://lda.senate.gov/filings/public/filing/search/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Search all filings on Senate LDA
        </a>
      </p>

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

      {/* Spending Overview */}
      {hasLobbyingData &&
        lobbying.summary &&
        (() => {
          const { quarterlyTrend, industryBreakdown } = lobbying.summary;
          const hasQuarterly = quarterlyTrend.some(q => q.spending > 0);
          const hasIndustry =
            industryBreakdown.length > 1 ||
            (industryBreakdown.length === 1 && industryBreakdown[0]?.industry !== 'Other');

          if (!hasQuarterly && !hasIndustry) return null;

          const maxQuarterSpending = Math.max(...quarterlyTrend.map(q => q.spending), 1);
          const maxIndustryPct = Math.max(...industryBreakdown.map(i => i.percentage), 1);

          return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hasQuarterly ? (
                <div className="border-2 border-gray-200 p-3">
                  <h4 className="aicher-heading type-sm text-gray-900 mb-3">Quarterly Trend</h4>
                  <div className="flex items-end gap-1" style={{ height: 96 }}>
                    {quarterlyTrend.map((q, i) => (
                      <div
                        key={`${q.quarter}-${q.year}`}
                        className="flex-1 flex flex-col items-center min-w-0"
                      >
                        <div
                          className="w-full flex items-end justify-center"
                          style={{ height: 56 }}
                        >
                          <div
                            className="w-full bg-[#3ea2d4]"
                            style={{
                              height: `${Math.max((q.spending / maxQuarterSpending) * 100, q.spending > 0 ? 4 : 0)}%`,
                              minHeight: q.spending > 0 ? 2 : 0,
                            }}
                          />
                        </div>
                        <span className="type-xs text-gray-400 aicher-heading mt-1">
                          {q.quarter}
                        </span>
                        <span className="type-xs text-gray-500 truncate max-w-full">
                          {formatCompact(q.spending)}
                        </span>
                        <span className="type-xs text-gray-400">
                          {i === 0 || q.quarter === 'Q1' ? String(q.year) : ' '}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div />
              )}
              {hasIndustry && (
                <div className="border-2 border-gray-200 p-3">
                  <h4 className="aicher-heading type-sm text-gray-900 mb-3">Issue Areas</h4>
                  <p className="type-xs text-gray-500 mb-3">
                    By number of filings mentioning each issue
                  </p>
                  <div className="space-y-2">
                    {industryBreakdown.slice(0, 5).map(ind => (
                      <div key={ind.industry}>
                        <div className="flex items-center justify-between mb-1">
                          <SectorLink sector={ind.industry} className="type-xs" />
                          <span className="type-xs text-gray-500 aicher-heading-wide">
                            {ind.filingCount} {ind.filingCount === 1 ? 'filing' : 'filings'} (
                            {ind.percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div
                          className="h-1 bg-[#3ea2d4]"
                          style={{ width: `${(ind.percentage / maxIndustryPct) * 100}%` }}
                          role="presentation"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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
      {hasLobbyingData &&
        lobbying.topCompanies.length > 0 &&
        (() => {
          const withSpending = lobbying.topCompanies.filter(c => c.totalSpending > 0);
          const zeroSpending = lobbying.topCompanies.filter(c => c.totalSpending === 0);
          const maxSpending = withSpending[0]?.totalSpending ?? 1;

          return (
            <div>
              <h3 className="aicher-heading type-lg text-gray-900 mb-4">Top Organizations</h3>
              {withSpending.length > 0 && (
                <div className="space-y-3">
                  {withSpending.map((company, i) => (
                    <div key={company.name} className="border-2 border-gray-200 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <span className="type-xs text-gray-400 aicher-heading flex-shrink-0">
                            #{i + 1}
                          </span>
                          <LobbyLink
                            registrantId={company.registrantId}
                            name={company.name}
                            className="type-sm font-medium break-words"
                          />
                        </div>
                        <span className="type-sm font-medium text-gray-900 aicher-heading-wide flex-shrink-0">
                          {formatCompact(company.totalSpending)}
                        </span>
                      </div>
                      <div
                        className="h-1 bg-[#3ea2d4] mt-2"
                        style={{ width: `${(company.totalSpending / maxSpending) * 100}%` }}
                        role="presentation"
                      />
                      <div className="flex flex-wrap gap-1 mt-2">
                        {company.committees.map(committee => (
                          <span
                            key={committee}
                            className="border-2 border-gray-300 px-2 py-0.5 type-xs aicher-heading text-gray-600"
                          >
                            {committee}
                          </span>
                        ))}
                        <a
                          href={ldaSearchUrl(company.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="type-xs text-[#3ea2d4] hover:underline self-center ml-1"
                        >
                          {company.recentFilings} filing{company.recentFilings !== 1 ? 's' : ''}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {zeroSpending.length > 0 && (
                <details className="mt-3 border-2 border-gray-200">
                  <summary className="p-3 type-xs text-gray-500 aicher-heading-wide cursor-pointer min-h-[44px] flex items-center">
                    {zeroSpending.length} organization{zeroSpending.length !== 1 ? 's' : ''} with
                    filing-only activity
                  </summary>
                  <div className="px-3 pb-3">
                    <p className="type-xs text-gray-400 mb-2">
                      Lobbying registrations without reported income. Spending may be reported on a
                      different filing or below the reporting threshold.
                    </p>
                    <div className="space-y-1">
                      {zeroSpending.map(company => (
                        <div
                          key={company.name}
                          className="flex items-center justify-between py-1 border-t border-gray-100"
                        >
                          <LobbyLink
                            registrantId={company.registrantId}
                            name={company.name}
                            className="type-xs"
                          />
                          <a
                            href={ldaSearchUrl(company.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="type-xs text-[#3ea2d4] hover:underline"
                          >
                            {company.recentFilings} filing{company.recentFilings !== 1 ? 's' : ''}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          );
        })()}

      {/* Committee Breakdown */}
      {hasLobbyingData &&
        lobbying.committeeBreakdown.length > 0 &&
        (() => {
          const maxCommitteeSpending = lobbying.committeeBreakdown[0]?.totalSpending ?? 1;

          return (
            <div>
              <h3 className="aicher-heading type-lg text-gray-900 mb-4">Committee Breakdown</h3>
              <div className="space-y-3">
                {lobbying.committeeBreakdown.map(cb => (
                  <div key={cb.committee} className="border-2 border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="type-sm font-medium text-gray-900">{cb.committee}</span>
                        <span className="type-xs text-gray-400 ml-2">
                          {cb.companyCount} org{cb.companyCount !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <span className="type-sm font-medium text-gray-900 aicher-heading-wide flex-shrink-0">
                        {formatCompact(cb.totalSpending)}
                      </span>
                    </div>
                    {cb.totalSpending > 0 && (
                      <div
                        className="h-1 bg-[#3ea2d4] mt-2"
                        style={{ width: `${(cb.totalSpending / maxCommitteeSpending) * 100}%` }}
                        role="presentation"
                      />
                    )}
                    {cb.topIssues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cb.topIssues.map(issue => (
                          <span
                            key={issue}
                            className="border-2 border-gray-200 px-2 py-0.5 type-xs aicher-heading text-gray-600"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

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

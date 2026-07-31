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
  companyCount: number;
  topIssues: string[];
}

interface IndustryBreakdown {
  industry: string;
  filingCount: number;
  percentage: number;
}

// totalRelevantSpending and quarterlyTrend exist in the API response but are
// intentionally not rendered: they aggregate a ~0.1% sample of LDA filings,
// so the dollar totals are misleading. Restore only when corpus-backed
// (PLAN-lobbying-corpus-2026-07.md Phase 2).
interface LobbyingResponse {
  representative?: {
    name: string;
    committees: string[];
  };
  lobbyingData: {
    affectedCommittees: number;
    topCompanies: LobbyingCompany[];
    committeeBreakdown: CommitteeBreakdownItem[];
    summary?: {
      industryBreakdown: IndustryBreakdown[];
    };
  };
  corpusLobbying?: {
    quarters: string[];
    generatedAt: string;
    committees: Array<{
      committeeCode: string;
      committeeName: string;
      windowTotal: number;
      quarterly: Array<{ quarter: string; total: number }>;
      peer: { medianTotal: number; ratioToMedian: number };
      topIssues: Array<{ code: string; label: string; count: number }>;
      topOrgs: Array<{
        name: string;
        registrantId: string | null;
        amount: number;
        filings: number;
      }>;
    }>;
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
  return `https://lda.gov/filings/public/filing/search/?registrant_name=${encodeURIComponent(registrantName)}&filing_year=`;
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

function shortQuarter(q: string): string {
  const [year, quarter] = q.split('-');
  return `${quarter} '${year?.slice(2) ?? ''}`;
}

type CorpusLobbying = NonNullable<LobbyingResponse['corpusLobbying']>;

/**
 * Corpus-backed per-committee totals from the complete Senate LDA corpus (not
 * the ~0.1% live sample). Totals only — top-orgs stay in the sample section
 * below until entity resolution lands. Totals are per committee, never summed
 * across committees (a filing naming several committees counts toward each).
 */
function CorpusLobbyingSection({ corpus }: { corpus: CorpusLobbying }) {
  const firstQuarter = corpus.quarters[0];
  const lastQuarter = corpus.quarters[corpus.quarters.length - 1];

  return (
    <div>
      <h3 className="aicher-heading type-lg text-gray-900 mb-1">Lobbying spending by committee</h3>
      <p className="type-xs text-gray-500 mb-4">
        Total reported spending on Senate LDA filings that disclose each committee, across the
        complete corpus{firstQuarter && lastQuarter ? ` (${firstQuarter} to ${lastQuarter})` : ''}.
        A filing naming several committees counts toward each, so totals are not summed across
        committees.
      </p>
      <div className="space-y-3">
        {corpus.committees.map(c => {
          const maxQuarter = Math.max(...c.quarterly.map(q => q.total), 1);
          const pctOfMedian = c.peer.ratioToMedian;
          return (
            <div key={c.committeeCode} className="border-2 border-gray-200 p-3">
              <div className="flex items-start justify-between gap-3">
                <span className="type-sm font-medium text-gray-900">{c.committeeName}</span>
                <span className="type-lg font-semibold text-gray-900 aicher-heading-wide flex-shrink-0">
                  {formatCompact(c.windowTotal)}
                </span>
              </div>
              <p className="type-xs text-gray-500 mt-0.5">
                {pctOfMedian >= 1
                  ? `${pctOfMedian.toFixed(1)}× the median committee (${formatCompact(c.peer.medianTotal)})`
                  : `${Math.round(pctOfMedian * 100)}% of the median committee (${formatCompact(c.peer.medianTotal)})`}
              </p>
              {c.quarterly.length > 0 && (
                <div className="flex items-end gap-1 mt-3" style={{ height: 64 }}>
                  {c.quarterly.map(q => (
                    <div key={q.quarter} className="flex-1 flex flex-col items-center min-w-0">
                      <div className="w-full flex items-end justify-center" style={{ height: 40 }}>
                        <div
                          className="w-full bg-[#3ea2d4]"
                          style={{
                            height: `${Math.max((q.total / maxQuarter) * 100, q.total > 0 ? 4 : 0)}%`,
                          }}
                        />
                      </div>
                      <span className="type-xs text-gray-400 aicher-heading mt-1 truncate max-w-full">
                        {shortQuarter(q.quarter)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              {c.topIssues.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {c.topIssues.slice(0, 5).map(issue => (
                    <span
                      key={issue.code}
                      className="border-2 border-gray-200 px-2 py-0.5 type-xs aicher-heading text-gray-600"
                    >
                      {issue.label}
                    </span>
                  ))}
                </div>
              )}
              {(c.topOrgs?.length ?? 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="type-xs text-gray-400 aicher-heading-wide mb-2">
                    Top organizations
                  </p>
                  <div className="space-y-1">
                    {c.topOrgs.slice(0, 5).map(org => (
                      <div
                        key={org.name}
                        className="flex items-baseline justify-between gap-3 type-xs"
                      >
                        <LobbyLink
                          registrantId={org.registrantId}
                          name={org.name}
                          className="text-gray-700 break-words min-w-0"
                        />
                        <span className="text-gray-500 aicher-heading-wide flex-shrink-0">
                          {formatCompact(org.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
  const corpus = lobbyingData?.corpusLobbying;
  const hasCorpus = (corpus?.committees.length ?? 0) > 0;
  const hasLobbyingData = lobbying && (lobbying.topCompanies?.length ?? 0) > 0;
  const hasChains = chainData?.chains && chainData.chains.length > 0;

  if (!hasLobbyingData && !hasChains && !hasCorpus) {
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
      {/* Corpus-backed per-committee totals (complete corpus) come first as the
          primary, accurate figures; the sample sections below are clearly scoped. */}
      {hasCorpus && corpus && <CorpusLobbyingSection corpus={corpus} />}

      {/* Intro disclaimer — scopes the sample-based sections that follow */}
      <p className="text-sm text-gray-500 mb-grid-3 border-l-2 border-gray-200 pl-grid-2">
        Organizations from recent lobbying filings related to
        {repName ? ` ${repName}'s` : " this representative's"} committee assignments
        {coveragePeriod ? ` (${coveragePeriod.toLowerCase()})` : ''}. This is a sample of recent
        filings, not a complete tally of all lobbying. Filing a disclosure does not mean money
        changed hands or votes were affected.{' '}
        <a
          href="https://lda.gov/filings/public/filing/search/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Search all filings on Senate LDA
        </a>
      </p>

      {/* Summary stats — counts only; sample-based dollar totals are withheld */}
      {hasLobbyingData && (
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            value={String(lobbying.topCompanies.length)}
            label="Organizations in recent filings"
          />
          <StatBox value={String(lobbying.affectedCommittees)} label="Committees targeted" />
        </div>
      )}

      {/* Issue Areas — filing counts, not dollars. The quarterly dollar trend was
          removed along with the total: both aggregated a ~0.1% filing sample. */}
      {hasLobbyingData &&
        lobbying.summary &&
        (() => {
          const { industryBreakdown } = lobbying.summary;
          const hasIndustry =
            industryBreakdown.length > 1 ||
            (industryBreakdown.length === 1 && industryBreakdown[0]?.industry !== 'Other');

          if (!hasIndustry) return null;

          const maxIndustryPct = Math.max(...industryBreakdown.map(i => i.percentage), 1);

          return (
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

      {/* Committee Breakdown — org counts and issues only; per-committee dollar
          totals are withheld for the same sample-coverage reason as the overall total */}
      {hasLobbyingData && lobbying.committeeBreakdown.length > 0 && (
        <div>
          <h3 className="aicher-heading type-lg text-gray-900 mb-4">Committee Breakdown</h3>
          <div className="space-y-3">
            {lobbying.committeeBreakdown.map(cb => (
              <div key={cb.committee} className="border-2 border-gray-200 p-3">
                <div className="min-w-0">
                  <span className="type-sm font-medium text-gray-900">{cb.committee}</span>
                  <span className="type-xs text-gray-400 ml-2">
                    {cb.companyCount} org{cb.companyCount !== 1 ? 's' : ''}
                  </span>
                </div>
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

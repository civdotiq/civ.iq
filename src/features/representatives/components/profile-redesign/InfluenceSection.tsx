/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import React from 'react';
import useSWR from 'swr';
import { LobbyLink } from '@/components/shared/links/EntityLinks';
import type { InfluenceChainInsight } from '@/lib/intelligence/types';
import { SectionBlock, SectionEmptyState, SectionSkeleton } from './SectionBlock';
import { formatMoney } from './types';

interface InfluenceSectionProps {
  bioguideId: string;
  /** Opens the lobbying drill-down section. */
  onExploreLobbying: () => void;
  /** Opens the full intelligence drill-down; undefined when analyzers lack data. */
  onExploreIntelligence?: () => void;
}

/**
 * Insights below this confidence are hidden per intelligence-layer rules.
 *
 * Must not exceed 0.5: when the narrative falls back to the statistical
 * template (no AI text), every analyzer in the codebase caps the reported
 * confidence at 0.5. A gate above that silently discarded every fallback
 * insight, so the section rendered empty even when the analysis succeeded.
 */
const MIN_CONFIDENCE = 0.5;

async function fetchInsight(url: string): Promise<InfluenceChainInsight | null> {
  const response = await fetch(url);
  if (response.status === 404) return null; // analysis unavailable for this member
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

export function InfluenceSection({
  bioguideId,
  onExploreLobbying,
  onExploreIntelligence,
}: InfluenceSectionProps) {
  const { data, error, isLoading } = useSWR<InfluenceChainInsight | null>(
    `/api/intelligence/representative/${bioguideId}/influence-chain`,
    fetchInsight,
    { revalidateOnFocus: false, dedupingInterval: 300000, shouldRetryOnError: false }
  );

  const insight = data && data.confidence >= MIN_CONFIDENCE ? data : null;
  const topChains = insight?.chains.slice(0, 3) ?? [];
  const confidencePct = insight ? Math.round(insight.confidence * 100) : 0;
  const dataAsOf = insight
    ? new Date(insight.dataAsOf).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  return (
    <SectionBlock
      id="influence"
      title="Lobbying & influence"
      action={
        <button
          type="button"
          onClick={onExploreLobbying}
          className="text-civiq-blue hover:underline"
        >
          Full lobbying details →
        </button>
      }
      source="Sources: Senate LDA filings, FEC.gov, Congress.gov roll-call votes"
    >
      {isLoading ? (
        <SectionSkeleton rows={4} />
      ) : !insight ? (
        <SectionEmptyState
          message={
            error
              ? 'Influence analysis is temporarily unavailable.'
              : 'No influence-chain analysis is available for this member — there is not enough overlapping lobbying, contribution, and voting data to meet the minimum sample size.'
          }
        />
      ) : (
        <div className="border-l-[3px] border-civiq-blue pl-4">
          <p className="text-[15px] font-medium text-gray-900">{insight.narrative}</p>

          {topChains.length > 0 && (
            <div className="mt-4 space-y-1">
              {topChains.map(chain => (
                <p key={`${chain.organization}-${chain.billId}`} className="text-sm text-gray-700">
                  <LobbyLink registrantId={chain.registrantId} name={chain.organization} /> —{' '}
                  {formatMoney(chain.lobbyingSpending) ?? '$0'} lobbying
                  {chain.hasContributionEvidence && chain.contributionAmount > 0
                    ? ` · ${formatMoney(chain.contributionAmount)} contributed`
                    : ''}
                </p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 text-xs text-gray-700">
            <span className="inline-flex items-center gap-2">
              Confidence
              <span className="inline-block w-24 h-2 bg-gray-100 border border-gray-300 align-middle">
                <span
                  className="block h-full bg-civiq-blue"
                  style={{ width: `${confidencePct}%` }}
                />
              </span>
              {insight.confidence.toFixed(2)}
            </span>
            <span>
              {insight.chains.length} chain{insight.chains.length === 1 ? '' : 's'} detected
            </span>
            {dataAsOf && <span>Data as of {dataAsOf}</span>}
            {onExploreIntelligence && (
              <button
                type="button"
                onClick={onExploreIntelligence}
                className="text-civiq-blue hover:underline"
              >
                Full analysis & methodology →
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-3">{insight.disclaimer}</p>
        </div>
      )}
    </SectionBlock>
  );
}

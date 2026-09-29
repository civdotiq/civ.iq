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

type InfluenceChain = InfluenceChainInsight['chains'][number];

/** Collapse per-bill chains to one entry per organization, preserving order. */
export function groupChainsByOrganization(chains: InfluenceChain[]): InfluenceChain[] {
  const byOrg = new Map<string, InfluenceChain>();
  for (const chain of chains) {
    if (!byOrg.has(chain.organization)) byOrg.set(chain.organization, chain);
  }
  return [...byOrg.values()];
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
  // Chains are one-per-bill, so one organization can fill every slot. Show
  // each organization once. (No per-org vote count: the analyzer caps the
  // chain list, so a count here would be the cap, not the total.)
  const topOrgs = groupChainsByOrganization(insight?.chains ?? []).slice(0, 3);
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
        <div>
          <p className="text-base leading-relaxed text-gray-900">{insight.narrative}</p>

          {topOrgs.length > 0 && (
            <div className="mt-4 space-y-1">
              {topOrgs.map(chain => (
                <p key={chain.organization} className="text-sm text-gray-700">
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
                  className="block h-full bg-civiq-blue-dark"
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

          {/* Amber = data caveat (design system). Correlation-not-causation
              framing stays visible, not fine print. */}
          <div
            role="note"
            className="flex gap-3 items-start mt-5 px-4 py-3 bg-civiq-amber/10 border border-civiq-amber/40 text-[13px] leading-relaxed text-amber-900"
          >
            <svg
              aria-hidden="true"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="flex-shrink-0 mt-0.5 text-civiq-amber"
            >
              <path d="M12 3 2 21h20L12 3z" />
              <line x1="12" y1="10" x2="12" y2="14" />
              <line x1="12" y1="17.5" x2="12" y2="17.6" />
            </svg>
            <span>{insight.disclaimer}</span>
          </div>
        </div>
      )}
    </SectionBlock>
  );
}

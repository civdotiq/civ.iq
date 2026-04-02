/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SignalBadge } from './SignalBadge';
import { SourceCitation } from './SourceCitation';
import { InsightDisclaimer } from './InsightDisclaimer';
import { BillLink, LobbyLink } from '@/components/shared/links/EntityLinks';
import type { InfluenceChainInsight, InfluenceChain } from '@/lib/intelligence/types';

interface InfluenceChainCardProps {
  insight: InfluenceChainInsight;
  className?: string;
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toFixed(0)}`;
}

const INITIAL_DISPLAY_COUNT = 5;

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8 ? 'bg-civiq-green' : confidence >= 0.6 ? 'bg-amber-500' : 'bg-civiq-red';

  return (
    <span
      className={`inline-block w-2 h-2 ${color} flex-shrink-0`}
      title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
      aria-hidden="true"
    />
  );
}

function VoteBadge({ vote }: { vote: 'yea' | 'nay' | 'not_voting' }) {
  const styles: Record<string, string> = {
    yea: 'border-[#0a9338] text-[#0a9338]',
    nay: 'border-[#e11d07] text-[#e11d07]',
    not_voting: 'border-gray-400 text-gray-400',
  };
  const labels: Record<string, string> = {
    yea: 'YEA',
    nay: 'NAY',
    not_voting: 'NOT VOTING',
  };

  return (
    <span className={`inline-flex px-2 py-0.5 border-2 aicher-heading type-xs ${styles[vote]}`}>
      {labels[vote]}
    </span>
  );
}

function ChainItem({ chain }: { chain: InfluenceChain }) {
  const truncatedTitle =
    chain.billTitle.length > 80 ? chain.billTitle.slice(0, 80) + '...' : chain.billTitle;

  return (
    <div className="bg-gray-50 p-3 mb-3">
      {/* Chain header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <LobbyLink
          registrantId={chain.registrantId}
          name={chain.organization}
          className="type-sm font-medium"
        />
        <span className="type-xs text-gray-500 aicher-heading-wide flex-shrink-0">
          {formatCompact(chain.lobbyingSpending)}
        </span>
      </div>

      {/* Vertical step list */}
      <div className="border-l-2 border-gray-300 ml-3 pl-4">
        {chain.links.map((link, i) => (
          <div key={i} className="flex items-start gap-2 pb-3 last:pb-0">
            <ConfidenceDot confidence={link.confidence} />
            <div>
              <span className="type-xs text-gray-500 aicher-heading-wide">
                {link.type.replace('_', ' ')}
              </span>
              <span className="type-xs text-gray-700 ml-2">{link.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Chain footer */}
      <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t-2 border-gray-100">
        <BillLink billId={chain.billId} title={truncatedTitle} className="type-xs" />
        <VoteBadge vote={chain.vote} />
        {chain.textSimilarity !== null && (
          <span className="type-xs text-gray-500">
            {(chain.textSimilarity * 100).toFixed(0)}% text similarity
          </span>
        )}
      </div>
    </div>
  );
}

export function InfluenceChainCard({ insight, className = '' }: InfluenceChainCardProps) {
  const [showAll, setShowAll] = useState(false);

  const avgConfidence =
    insight.chains.length > 0
      ? insight.chains.reduce((sum, c) => sum + c.chainConfidence, 0) / insight.chains.length
      : 0;

  const displayedChains = showAll ? insight.chains : insight.chains.slice(0, INITIAL_DISPLAY_COUNT);

  const hasMore = insight.chains.length > INITIAL_DISPLAY_COUNT;

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 min-w-0 mb-2">
        <SignalBadge signal={insight.signal ?? 'pattern'} />
        <h3 className="aicher-heading type-lg text-gray-900 truncate">Influence Chains</h3>
      </div>
      <div className="mb-4">
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      {/* Key stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-3">
          <div className="aicher-heading type-2xl text-gray-900">{insight.totalChainsDetected}</div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Chains detected</div>
        </div>
        <div className="bg-gray-50 p-3">
          <div className="aicher-heading type-2xl text-gray-900">
            {(avgConfidence * 100).toFixed(0)}%
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Avg chain confidence</div>
        </div>
        {insight.peerComparison.percentileRank > 0 && (
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {insight.peerComparison.percentileRank.toFixed(0)}th
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Peer percentile</div>
          </div>
        )}
      </div>

      {/* Chains list */}
      {displayedChains.map((chain, i) => (
        <ChainItem key={`${chain.organization}-${chain.billId}-${i}`} chain={chain} />
      ))}

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="type-xs text-[#3ea2d4] aicher-heading-wide mt-1 mb-4 py-2 min-h-[44px] inline-flex items-center aicher-focus"
          aria-expanded={showAll}
        >
          {showAll ? 'Show fewer chains' : `Show all ${insight.chains.length} chains`}
        </button>
      )}

      {/* Narrative */}
      <p className="type-sm text-gray-700 leading-relaxed mb-4">{insight.narrative}</p>

      {/* Footer */}
      {insight.chainsDropped > 0 && (
        <p className="type-xs text-gray-400 mb-1">
          {insight.chainsDropped} low-confidence chains omitted
        </p>
      )}
      <SourceCitation sources={insight.sources ?? []} dataAsOf={insight.dataAsOf} />

      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />

      {/* Investigate network link */}
      <a
        href={`/investigate?node=rep:${insight.bioguideId}`}
        className="block mt-4 px-3 py-2 border-2 border-[#3ea2d4] text-[#3ea2d4] type-sm text-center font-bold hover:bg-[#3ea2d4] hover:text-white transition-colors"
      >
        Visualize network
      </a>
    </div>
  );
}

/**
 * Builds key stats array for use with the generic InsightCard if needed.
 */
export function influenceChainKeyStats(
  insight: InfluenceChainInsight
): Array<{ label: string; value: string }> {
  const avgConfidence =
    insight.chains.length > 0
      ? insight.chains.reduce((sum, c) => sum + c.chainConfidence, 0) / insight.chains.length
      : 0;

  return [
    {
      label: 'Chains detected',
      value: String(insight.totalChainsDetected),
    },
    {
      label: 'Avg confidence',
      value: `${(avgConfidence * 100).toFixed(0)}%`,
    },
    {
      label: 'Peer percentile',
      value: `${insight.peerComparison.percentileRank.toFixed(0)}th`,
    },
  ];
}

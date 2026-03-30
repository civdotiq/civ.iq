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
import type {
  InfluenceGraphInsight,
  InfluenceGraphChain,
  RegulationNode,
  EnforcementAction,
  OutcomeSignal,
} from '@/lib/intelligence/types';

interface InfluenceGraphCardProps {
  insight: InfluenceGraphInsight;
  className?: string;
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(1)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  const color =
    confidence >= 0.8 ? 'bg-civiq-green' : confidence >= 0.6 ? 'bg-amber-500' : 'bg-gray-400';
  return (
    <span
      className={`inline-block w-2 h-2 ${color} flex-shrink-0 mt-1.5`}
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
  const labels: Record<string, string> = { yea: 'YEA', nay: 'NAY', not_voting: 'NOT VOTING' };
  return (
    <span className={`inline-flex px-2 py-0.5 border-2 aicher-heading type-xs ${styles[vote]}`}>
      {labels[vote]}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = ['proposed', 'comment_period', 'effective', 'open'].includes(status);
  const color = isActive ? 'border-[#3ea2d4] text-[#3ea2d4]' : 'border-gray-400 text-gray-400';
  return (
    <span className={`inline-flex px-2 py-0.5 border-2 aicher-heading type-xs ${color}`}>
      {status.replace(/_/g, ' ').toUpperCase()}
    </span>
  );
}

// ── Pipeline Step Components ─────────────────────────────────────────

function LobbyingStep({ chain }: { chain: InfluenceGraphChain }) {
  return (
    <div className="flex items-start gap-2">
      <ConfidenceDot confidence={chain.chainConfidence} />
      <div className="min-w-0 flex-1">
        <div className="type-xs text-gray-500 aicher-heading-wide">LOBBYING</div>
        <div className="type-sm text-gray-900 dark:text-gray-100">
          <LobbyLink
            registrantId={chain.registrantId}
            name={chain.organization}
            className="font-medium"
          />{' '}
          lobbied — {formatCompact(chain.lobbyingSpending)} spent
        </div>
        {chain.contributionAmount > 0 && (
          <div className="type-xs text-gray-500 mt-0.5">
            {formatCompact(chain.contributionAmount)} in campaign contributions
          </div>
        )}
      </div>
    </div>
  );
}

function VoteStep({ chain }: { chain: InfluenceGraphChain }) {
  const truncTitle =
    chain.billTitle.length > 70 ? chain.billTitle.slice(0, 70) + '...' : chain.billTitle;
  return (
    <div className="flex items-start gap-2">
      <ConfidenceDot confidence={chain.chainConfidence} />
      <div className="min-w-0 flex-1">
        <div className="type-xs text-gray-500 aicher-heading-wide">VOTE</div>
        <div className="type-sm text-gray-900 dark:text-gray-100">
          <BillLink billId={chain.billId} title={truncTitle} className="font-medium" />
        </div>
        <div className="flex items-center flex-wrap gap-2 mt-1">
          <VoteBadge vote={chain.vote} />
          {chain.textSimilarity !== null && (
            <span className="type-xs text-gray-500">
              {(chain.textSimilarity * 100).toFixed(0)}% text match
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function RegulationStep({ node }: { node: RegulationNode }) {
  return (
    <div className="flex items-start gap-2">
      <ConfidenceDot confidence={node.linkConfidence} />
      <div className="min-w-0 flex-1">
        <div className="type-xs text-gray-500 aicher-heading-wide">REGULATION</div>
        <div className="type-sm text-gray-900 dark:text-gray-100 font-medium">{node.agency}</div>
        <div className="type-xs text-gray-700 dark:text-gray-300 mt-0.5">
          {node.title.length > 80 ? node.title.slice(0, 80) + '...' : node.title}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <StatusBadge status={node.status} />
          {node.commentCount > 0 && (
            <span className="type-xs text-gray-500">
              {node.commentCount.toLocaleString()} comments
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EnforcementStep({ actions }: { actions: EnforcementAction[] }) {
  const totalPenalty = actions.reduce((sum, a) => sum + a.penaltyAmount, 0);
  const agencies = [...new Set(actions.map(a => a.agency))].join(', ');
  return (
    <div className="flex items-start gap-2">
      <ConfidenceDot confidence={0.8} />
      <div className="min-w-0 flex-1">
        <div className="type-xs text-gray-500 aicher-heading-wide">ENFORCEMENT</div>
        <div className="type-sm text-gray-900 dark:text-gray-100">
          {agencies} — {actions.length} action{actions.length !== 1 ? 's' : ''}
          {totalPenalty > 0 && `, ${formatCompact(totalPenalty)} in penalties`}
        </div>
        {actions.length <= 3 &&
          actions.map((a, i) => (
            <div key={i} className="type-xs text-gray-500 mt-0.5">
              {a.agency}: {a.actionType} — {a.organization}
              {a.penaltyAmount > 0 && ` (${formatCompact(a.penaltyAmount)})`}
            </div>
          ))}
      </div>
    </div>
  );
}

function CourtStep({
  cases,
}: {
  cases: Array<{ caseName: string; court: string; dateFiled: string; status: string }>;
}) {
  return (
    <div className="flex items-start gap-2">
      <ConfidenceDot confidence={0.7} />
      <div className="min-w-0 flex-1">
        <div className="type-xs text-gray-500 aicher-heading-wide">COURT</div>
        {cases.map((c, i) => (
          <div key={i} className="type-sm text-gray-900 dark:text-gray-100">
            <span className="font-medium">{c.caseName}</span>
            <span className="type-xs text-gray-500 ml-2">
              {c.court} — <StatusBadge status={c.status} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutcomeStep({ signals }: { signals: OutcomeSignal[] }) {
  return (
    <div className="flex items-start gap-2">
      <ConfidenceDot confidence={0.6} />
      <div className="min-w-0 flex-1">
        <div className="type-xs text-gray-500 aicher-heading-wide">OUTCOME</div>
        {signals.map((s, i) => {
          const arrow = s.direction === 'positive' ? '+' : s.direction === 'negative' ? '' : '';
          const changeStr = `${arrow}${(s.change * 100).toFixed(1)}%`;
          return (
            <div key={i} className="type-sm text-gray-900 dark:text-gray-100">
              {s.metric}: <span className="font-medium">{changeStr}</span>
              <span className="type-xs text-gray-500 ml-2">
                vs {s.baseline.label} ({s.baseline.value.toFixed(1)})
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Chain Pipeline ───────────────────────────────────────────────────

function ChainPipeline({ chain }: { chain: InfluenceGraphChain }) {
  const stepCount =
    2 +
    (chain.regulationNode ? 1 : 0) +
    (chain.enforcementActions.length > 0 ? 1 : 0) +
    (chain.courtCases.length > 0 ? 1 : 0) +
    (chain.outcomeSignals.length > 0 ? 1 : 0);

  return (
    <div className="border-2 border-gray-200 dark:border-[#444] p-4 mb-3">
      {/* Chain header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="type-xs text-gray-500 aicher-heading-wide">{stepCount}-step chain</span>
        <span className="type-xs text-gray-400">
          confidence: {(chain.chainConfidence * 100).toFixed(0)}%
        </span>
      </div>

      {/* Vertical pipeline */}
      <div className="border-l-2 border-gray-300 dark:border-gray-600 ml-1 pl-4 space-y-4">
        <LobbyingStep chain={chain} />
        <VoteStep chain={chain} />
        {chain.regulationNode && <RegulationStep node={chain.regulationNode} />}
        {chain.enforcementActions.length > 0 && (
          <EnforcementStep actions={chain.enforcementActions} />
        )}
        {chain.courtCases.length > 0 && <CourtStep cases={chain.courtCases} />}
        {chain.outcomeSignals.length > 0 && <OutcomeStep signals={chain.outcomeSignals} />}
      </div>
    </div>
  );
}

// ── Main Card ────────────────────────────────────────────────────────

const INITIAL_DISPLAY_COUNT = 3;

export function InfluenceGraphCard({ insight, className = '' }: InfluenceGraphCardProps) {
  const [showAll, setShowAll] = useState(false);

  const displayedChains = showAll ? insight.chains : insight.chains.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = insight.chains.length > INITIAL_DISPLAY_COUNT;

  return (
    <div
      className={`bg-white dark:bg-[#222226] border-2 border-gray-900 dark:border-[#444] p-4 sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <SignalBadge signal={insight.signal ?? 'pattern'} />
          <h3 className="aicher-heading type-lg text-gray-900 dark:text-gray-100">
            Influence Graph
          </h3>
        </div>
        <ConfidenceBadge confidence={insight.confidence} className="shrink-0" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="border-2 border-gray-200 dark:border-[#444] p-3">
          <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">
            {insight.totalChainsDetected}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Chains traced</div>
        </div>
        <div className="border-2 border-gray-200 dark:border-[#444] p-3">
          <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">
            {insight.graphStats.regulationLinks}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Regulation links</div>
        </div>
        <div className="border-2 border-gray-200 dark:border-[#444] p-3">
          <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">
            {insight.graphStats.enforcementLinks}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Enforcement links</div>
        </div>
      </div>

      {/* Peer comparison */}
      {insight.peerComparison.percentileRank > 0 && (
        <div className="border-2 border-gray-200 dark:border-[#444] p-3 mb-4">
          <span className="type-xs text-gray-500 aicher-heading-wide">Peer percentile</span>
          <span className="type-sm font-medium text-gray-900 dark:text-gray-100 ml-2">
            {insight.peerComparison.percentileRank.toFixed(0)}th
          </span>
          <span className="type-xs text-gray-400 ml-2">
            among {insight.peerComparison.peerGroupLabel} ({insight.peerComparison.peerCount} peers)
          </span>
        </div>
      )}

      {/* Chain pipelines */}
      {insight.chains.length === 0 ? (
        <div className="border-2 border-gray-200 p-4">
          <p className="type-sm text-gray-500">
            No influence chains with extended graph data found for this representative.
          </p>
        </div>
      ) : (
        displayedChains.map((chain, i) => (
          <ChainPipeline key={`${chain.organization}-${chain.billId}-${i}`} chain={chain} />
        ))
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="type-xs text-[#3ea2d4] aicher-heading-wide mt-1 mb-4 py-2 min-h-[44px] inline-flex items-center aicher-focus"
          aria-expanded={showAll}
        >
          {showAll ? 'Show fewer chains' : `Show all ${insight.chains.length} chains`}
        </button>
      )}

      {/* Dropped chains transparency */}
      {insight.chainsDropped > 0 && (
        <p className="type-xs text-gray-400 mb-2">
          {insight.chainsDropped} low-confidence chains omitted
        </p>
      )}

      {/* Narrative */}
      <p className="type-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4">
        {insight.narrative}
      </p>

      {/* Footer */}
      <SourceCitation sources={insight.sources ?? []} dataAsOf={insight.dataAsOf} />
      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />
    </div>
  );
}

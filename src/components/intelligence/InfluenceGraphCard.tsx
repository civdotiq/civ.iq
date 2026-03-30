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

function VoteBadge({ vote }: { vote: 'yea' | 'nay' | 'not_voting' }) {
  const styles: Record<string, string> = {
    yea: 'border-[#0a9338] text-[#0a9338]',
    nay: 'border-[#e11d07] text-[#e11d07]',
    not_voting: 'border-gray-400 text-gray-400',
  };
  const labels: Record<string, string> = { yea: 'YEA', nay: 'NAY', not_voting: 'DID NOT VOTE' };
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

/** Build a plain-language one-sentence summary of a chain. */
function chainSummary(chain: InfluenceGraphChain): string {
  const org = chain.organization;
  const spent = formatCompact(chain.lobbyingSpending);
  const voteWord =
    chain.vote === 'yea'
      ? 'voted in favor of'
      : chain.vote === 'nay'
        ? 'voted against'
        : 'did not vote on';
  const billShort =
    chain.billTitle.length > 50 ? chain.billTitle.slice(0, 50) + '...' : chain.billTitle;

  let suffix = '';
  if (chain.regulationNode) {
    suffix += `, then ${chain.regulationNode.agency} wrote a regulation`;
  }
  if (chain.enforcementActions.length > 0) {
    const agencies = [...new Set(chain.enforcementActions.map(a => a.agency))].join('/');
    suffix += `, ${agencies} took enforcement action`;
  }

  return `${org} spent ${spent} lobbying, this representative ${voteWord} ${billShort}${suffix}.`;
}

// ── Pipeline Step Components ─────────────────────────────────────────

function LobbyingStep({ chain }: { chain: InfluenceGraphChain }) {
  return (
    <div className="pb-4">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">Who spent money?</div>
      <div className="type-sm text-gray-900 dark:text-gray-100">
        <LobbyLink
          registrantId={chain.registrantId}
          name={chain.organization}
          className="font-medium"
        />{' '}
        spent {formatCompact(chain.lobbyingSpending)} on lobbying
      </div>
      {chain.contributionAmount > 0 && (
        <div className="type-xs text-gray-600 dark:text-gray-400 mt-0.5">
          Also gave {formatCompact(chain.contributionAmount)} in campaign contributions
        </div>
      )}
    </div>
  );
}

function VoteStep({ chain }: { chain: InfluenceGraphChain }) {
  const truncTitle =
    chain.billTitle.length > 70 ? chain.billTitle.slice(0, 70) + '...' : chain.billTitle;
  return (
    <div className="pb-4">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">What was voted on?</div>
      <div className="type-sm text-gray-900 dark:text-gray-100">
        <BillLink billId={chain.billId} title={truncTitle} className="font-medium" />
      </div>
      <div className="flex items-center flex-wrap gap-2 mt-1">
        <VoteBadge vote={chain.vote} />
      </div>
    </div>
  );
}

function RegulationStep({ node }: { node: RegulationNode }) {
  return (
    <div className="pb-4">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">Did regulators act?</div>
      <div className="type-sm text-gray-900 dark:text-gray-100">
        {node.agency} {node.type === 'proposed_rule' ? 'proposed' : 'finalized'} a rule
      </div>
      <div className="type-xs text-gray-700 dark:text-gray-300 mt-0.5">
        {node.title.length > 90 ? node.title.slice(0, 90) + '...' : node.title}
      </div>
      <div className="flex items-center gap-2 mt-1">
        <StatusBadge status={node.status} />
        {node.commentCount > 0 && (
          <span className="type-xs text-gray-500">
            {node.commentCount.toLocaleString()} public comments
          </span>
        )}
      </div>
    </div>
  );
}

function EnforcementStep({ actions }: { actions: EnforcementAction[] }) {
  const totalPenalty = actions.reduce((sum, a) => sum + a.penaltyAmount, 0);
  const agencies = [...new Set(actions.map(a => a.agency))].join(', ');
  return (
    <div className="pb-4">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">Was anyone penalized?</div>
      <div className="type-sm text-gray-900 dark:text-gray-100">
        {agencies} took {actions.length} enforcement action{actions.length !== 1 ? 's' : ''}
        {totalPenalty > 0 && <> totaling {formatCompact(totalPenalty)} in penalties</>}
      </div>
      {actions.length <= 3 &&
        actions.map((a, i) => (
          <div key={i} className="type-xs text-gray-600 dark:text-gray-400 mt-0.5">
            {a.actionType} against {a.organization}
            {a.penaltyAmount > 0 && ` — ${formatCompact(a.penaltyAmount)}`}
          </div>
        ))}
    </div>
  );
}

function CourtStep({
  cases,
}: {
  cases: Array<{ caseName: string; court: string; dateFiled: string; status: string }>;
}) {
  return (
    <div className="pb-4">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">Any court cases?</div>
      {cases.map((c, i) => (
        <div key={i} className="type-sm text-gray-900 dark:text-gray-100">
          <span className="font-medium">{c.caseName}</span>
          <span className="type-xs text-gray-500 ml-2">
            in {c.court} — <StatusBadge status={c.status} />
          </span>
        </div>
      ))}
    </div>
  );
}

function OutcomeStep({ signals }: { signals: OutcomeSignal[] }) {
  return (
    <div className="pb-4">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">What changed?</div>
      {signals.map((s, i) => {
        const arrow = s.direction === 'positive' ? '+' : s.direction === 'negative' ? '' : '';
        const changeStr = `${arrow}${(s.change * 100).toFixed(1)}%`;
        return (
          <div key={i} className="type-sm text-gray-900 dark:text-gray-100">
            {s.metric} moved <span className="font-medium">{changeStr}</span>
            <span className="type-xs text-gray-500 ml-1">compared to {s.baseline.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Chain Pipeline ───────────────────────────────────────────────────

function ChainPipeline({
  chain,
  showMethodology,
}: {
  chain: InfluenceGraphChain;
  showMethodology: boolean;
}) {
  return (
    <div className="border-2 border-gray-200 dark:border-[#444] p-4 mb-3">
      {/* Plain-language story summary */}
      <p className="type-sm text-gray-800 dark:text-gray-200 mb-3 leading-relaxed">
        {chainSummary(chain)}
      </p>

      {/* Vertical pipeline */}
      <div className="border-l-2 border-gray-300 dark:border-gray-600 ml-1 pl-4">
        <LobbyingStep chain={chain} />
        <VoteStep chain={chain} />
        {chain.regulationNode && <RegulationStep node={chain.regulationNode} />}
        {chain.enforcementActions.length > 0 && (
          <EnforcementStep actions={chain.enforcementActions} />
        )}
        {chain.courtCases.length > 0 && <CourtStep cases={chain.courtCases} />}
        {chain.outcomeSignals.length > 0 && <OutcomeStep signals={chain.outcomeSignals} />}
      </div>

      {/* Methodology detail — hidden by default */}
      {showMethodology && (
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <div className="type-xs text-gray-400 space-y-0.5">
            <div>Chain confidence: {(chain.chainConfidence * 100).toFixed(0)}%</div>
            {chain.textSimilarity !== null && (
              <div>
                Lobbying text / bill text similarity: {(chain.textSimilarity * 100).toFixed(0)}%
              </div>
            )}
            {chain.regulationNode && (
              <div>
                Regulation linked via {chain.regulationNode.linkMethod.replace(/_/g, ' ')} (
                {(chain.regulationNode.linkConfidence * 100).toFixed(0)}% confidence)
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Card ────────────────────────────────────────────────────────

const INITIAL_DISPLAY_COUNT = 3;

export function InfluenceGraphCard({ insight, className = '' }: InfluenceGraphCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);

  const displayedChains = showAll ? insight.chains : insight.chains.slice(0, INITIAL_DISPLAY_COUNT);
  const hasMore = insight.chains.length > INITIAL_DISPLAY_COUNT;

  return (
    <div
      className={`bg-white dark:bg-[#222226] border-2 border-gray-900 dark:border-[#444] p-4 sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <SignalBadge signal={insight.signal ?? 'pattern'} />
          <h3 className="aicher-heading type-lg text-gray-900 dark:text-gray-100">
            How lobbying money becomes policy
          </h3>
        </div>
        <ConfidenceBadge confidence={insight.confidence} className="shrink-0" />
      </div>

      {/* Narrative — leads the card */}
      <p className="type-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 border-l-2 border-gray-300 pl-3">
        {insight.narrative}
      </p>

      {/* Stats row — plain language */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        <div className="border-2 border-gray-200 dark:border-[#444] p-3">
          <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">
            {insight.totalChainsDetected}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">
            Paths from money to policy
          </div>
        </div>
        <div className="border-2 border-gray-200 dark:border-[#444] p-3">
          <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">
            {insight.graphStats.regulationLinks}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Connected regulations</div>
        </div>
        <div className="border-2 border-gray-200 dark:border-[#444] p-3">
          <div className="aicher-heading type-2xl text-gray-900 dark:text-gray-100">
            {insight.graphStats.enforcementLinks}
          </div>
          <div className="type-xs text-gray-500 aicher-heading-wide">Enforcement actions</div>
        </div>
      </div>

      {/* Peer comparison — citizen framing */}
      {insight.peerComparison.percentileRank > 0 && (
        <p className="type-xs text-gray-600 dark:text-gray-400 mb-4">
          More money-to-policy connections than{' '}
          <span className="font-medium">{insight.peerComparison.percentileRank.toFixed(0)}%</span>{' '}
          of {insight.peerComparison.peerGroupLabel}
          {insight.peerComparison.peerCount > 0 && (
            <span className="text-gray-400"> ({insight.peerComparison.peerCount} compared)</span>
          )}
        </p>
      )}

      {/* Chain pipelines */}
      {insight.chains.length === 0 ? (
        <div className="border-2 border-gray-200 p-4">
          <p className="type-sm text-gray-500">
            No traceable paths from lobbying spending to legislation found for this representative.
          </p>
        </div>
      ) : (
        <>
          <p className="type-xs text-gray-500 mb-3">
            Each path below traces public records from lobbying disclosure to legislative vote
            {insight.graphStats.regulationLinks > 0 && ', regulation'}
            {insight.graphStats.enforcementLinks > 0 && ', and enforcement'}.
          </p>
          {displayedChains.map((chain, i) => (
            <ChainPipeline
              key={`${chain.organization}-${chain.billId}-${i}`}
              chain={chain}
              showMethodology={showMethodology}
            />
          ))}
        </>
      )}

      {/* Show more / fewer */}
      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="type-xs text-[#3ea2d4] aicher-heading-wide mt-1 mb-3 py-2 min-h-[44px] inline-flex items-center aicher-focus"
          aria-expanded={showAll}
        >
          {showAll ? 'Show fewer' : `Show all ${insight.chains.length} paths`}
        </button>
      )}

      {/* Methodology toggle */}
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={() => setShowMethodology(prev => !prev)}
          className="type-xs text-gray-400 hover:text-[#3ea2d4] aicher-heading-wide py-1 min-h-[44px] inline-flex items-center aicher-focus transition-colors"
          aria-expanded={showMethodology}
        >
          {showMethodology ? 'Hide technical detail' : 'Show confidence scores and methodology'}
        </button>
      </div>

      {/* Transparency: dropped chains */}
      {insight.chainsDropped > 0 && (
        <p className="type-xs text-gray-400 mb-2">
          {insight.chainsDropped} additional path{insight.chainsDropped !== 1 ? 's' : ''} found but
          excluded because confidence was below threshold
        </p>
      )}

      {/* Citations and disclaimer */}
      <SourceCitation sources={insight.sources ?? []} dataAsOf={insight.dataAsOf} />
      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />
    </div>
  );
}

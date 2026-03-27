/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { BillLink } from '@/components/shared/links/EntityLinks';
import type { InfluenceChain } from '@/lib/intelligence/types';

interface MoneyFlowChainProps {
  chain: InfluenceChain;
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

/** Horizontal connector arrow (desktop) */
function HorizontalEdge({ label }: { label?: string }) {
  return (
    <div className="hidden md:flex flex-col items-center justify-center px-1 min-w-[48px]">
      {label && (
        <span className="type-xs text-gray-500 aicher-heading-wide mb-1 whitespace-nowrap">
          {label}
        </span>
      )}
      <div className="w-full border-t-2 border-gray-300 relative">
        <span className="absolute right-0 -top-[5px] text-gray-300">&#9654;</span>
      </div>
    </div>
  );
}

/** Vertical connector arrow (mobile) */
function VerticalEdge({ label }: { label?: string }) {
  return (
    <div className="flex md:hidden items-center gap-2 pl-4 py-1">
      <div className="border-l-2 border-gray-300 h-6 relative">
        <span className="absolute -bottom-[2px] -left-[5px] text-gray-300 text-[8px]">&#9660;</span>
      </div>
      {label && (
        <span className="type-xs text-gray-500 aicher-heading-wide whitespace-nowrap">{label}</span>
      )}
    </div>
  );
}

function FlowNode({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`border-2 border-gray-900 bg-white p-2 sm:p-3 flex-shrink-0 md:flex-shrink md:min-w-0 ${className}`}
    >
      {children}
    </div>
  );
}

/** Find the committee label from the chain links */
function getCommitteeLabel(chain: InfluenceChain): string {
  const committeeLink = chain.links.find(l => l.type === 'committee');
  return committeeLink?.label ?? 'Committee';
}

export function MoneyFlowChain({ chain, className = '' }: MoneyFlowChainProps) {
  const truncatedTitle =
    chain.billTitle.length > 60 ? chain.billTitle.slice(0, 60) + '...' : chain.billTitle;

  const committeeLabel = getCommitteeLabel(chain);

  return (
    <div
      className={`flex md:flex-row flex-col items-stretch md:items-center ${className}`}
      role="group"
      aria-label={`Influence chain: ${chain.organization}`}
    >
      {/* Organization node */}
      <FlowNode>
        <div className="flex items-center gap-2">
          <ConfidenceDot confidence={chain.chainConfidence} />
          <div>
            <div className="type-sm font-medium text-gray-900">{chain.organization}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">
              {formatCompact(chain.lobbyingSpending)} lobbying
            </div>
          </div>
        </div>
      </FlowNode>

      {/* Edge: contribution amount */}
      <HorizontalEdge label={formatCompact(chain.contributionAmount)} />
      <VerticalEdge label={formatCompact(chain.contributionAmount)} />

      {/* Committee node */}
      <FlowNode>
        <div className="type-xs text-gray-500 aicher-heading-wide">Committee</div>
        <div className="type-sm text-gray-900">{committeeLabel}</div>
      </FlowNode>

      {/* Edge */}
      <HorizontalEdge />
      <VerticalEdge />

      {/* Bill node */}
      <FlowNode className="md:max-w-[220px]">
        <div className="type-xs text-gray-500 aicher-heading-wide">Bill</div>
        <BillLink billId={chain.billId} title={truncatedTitle} className="type-sm" />
        {chain.textSimilarity !== null && (
          <div className="type-xs text-gray-400">
            {(chain.textSimilarity * 100).toFixed(0)}% text match
          </div>
        )}
      </FlowNode>

      {/* Edge */}
      <HorizontalEdge />
      <VerticalEdge />

      {/* Vote node */}
      <FlowNode>
        <div className="type-xs text-gray-500 aicher-heading-wide mb-1">Vote</div>
        <VoteBadge vote={chain.vote} />
      </FlowNode>
    </div>
  );
}

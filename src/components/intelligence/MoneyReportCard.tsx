/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SignalBadge } from './SignalBadge';
import { SourceCitation } from './SourceCitation';
import { InsightDisclaimer } from './InsightDisclaimer';
import type {
  MoneyReportCardInsight,
  RepMoneyMetrics,
  MetricStatus,
} from '@/lib/intelligence/types';

interface MoneyReportCardProps {
  insight: MoneyReportCardInsight;
  className?: string;
}

function pct(value: number | null): string {
  if (value === null) return '\u2014';
  return `${(value * 100).toFixed(0)}%`;
}

function partyColor(party: string): string {
  if (party === 'R') return 'text-[#e11d07]';
  if (party === 'D') return 'text-[#0a9338]';
  return 'text-gray-600';
}

function partyBorderColor(party: string): string {
  if (party === 'R') return 'border-[#e11d07]';
  if (party === 'D') return 'border-[#0a9338]';
  return 'border-gray-400';
}

function PercentageBar({ status, label }: { status: MetricStatus; label: string }) {
  if (status.state === 'ready') {
    const widthPct = Math.min(Math.max(status.value * 100, 0), 100);
    return (
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="type-xs text-gray-600">{label}</span>
          <span className="type-xs text-gray-900 font-medium">{pct(status.value)}</span>
        </div>
        <div className="h-2 bg-gray-100 border border-gray-200">
          <div className="h-full bg-gray-700" style={{ width: `${widthPct}%` }} />
        </div>
      </div>
    );
  }

  if (status.state === 'computing') {
    return (
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="type-xs text-gray-600">{label}</span>
          <span className="type-xs text-gray-500">Warming analysis…</span>
        </div>
        <div className="h-2 bg-gray-100 border border-gray-200" aria-busy="true" />
      </div>
    );
  }

  if (status.state === 'insufficient-data') {
    return (
      <div className="mb-2">
        <div className="flex justify-between mb-1">
          <span className="type-xs text-gray-600">{label}</span>
          <span className="type-xs text-gray-500" title={status.reason}>
            Not enough data yet
          </span>
        </div>
        <div className="h-2 bg-gray-100 border border-gray-200" />
      </div>
    );
  }

  // unavailable
  return (
    <div className="mb-2">
      <div className="flex justify-between mb-1">
        <span className="type-xs text-gray-600">{label}</span>
        <span className="type-xs text-amber-600" title={status.reason}>
          Unavailable
        </span>
      </div>
      <div className="h-2 bg-gray-100 border border-gray-200" />
    </div>
  );
}

function RepCard({ rep }: { rep: RepMoneyMetrics }) {
  return (
    <div className={`bg-gray-50 dark:bg-[#2a2a2e] border-l-4 ${partyBorderColor(rep.party)} p-4`}>
      {/* Rep header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="min-w-0">
          <Link
            href={`/representative/${rep.bioguideId}`}
            className="type-sm font-medium text-gray-900 hover:text-[#3ea2d4] transition-colors"
          >
            {rep.name}
          </Link>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`type-xs font-medium ${partyColor(rep.party)}`}>{rep.party}</span>
            <span className="type-xs text-gray-400">{rep.chamber}</span>
          </div>
        </div>
        {rep.influenceChainCount > 0 && (
          <div className="bg-gray-50 dark:bg-[#2a2a2e] px-2 py-1 text-center flex-shrink-0">
            <div className="aicher-heading type-lg text-gray-900">{rep.influenceChainCount}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Chains</div>
          </div>
        )}
      </div>

      {/* Metrics */}
      <PercentageBar status={rep.voteFinance} label="Votes align with top donor industries" />
      <PercentageBar
        status={rep.financeJurisdiction}
        label="Campaign money from industries they oversee"
      />
      <PercentageBar status={rep.independence} label="Votes independently of party + donors" />
    </div>
  );
}

function AggregateStat({
  label,
  entry,
}: {
  label: string;
  entry: { name: string; value: number } | null;
}) {
  if (!entry) return null;
  return (
    <div className="bg-gray-50 dark:bg-[#2a2a2e] p-3">
      <div className="type-xs text-gray-500 aicher-heading-wide mb-1">{label}</div>
      <div className="type-sm font-medium text-gray-900 truncate" title={entry.name}>
        {entry.name}
      </div>
      <div className="type-xs text-gray-600">{pct(entry.value)}</div>
    </div>
  );
}

export function MoneyReportCard({ insight, className = '' }: MoneyReportCardProps) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 3;

  const displayedReps = showAll
    ? insight.representatives
    : insight.representatives.slice(0, INITIAL_COUNT);
  const hasMore = insight.representatives.length > INITIAL_COUNT;

  const hasAggregates =
    insight.aggregates.highestOverlap ||
    insight.aggregates.lowestOverlap ||
    insight.aggregates.mostIndependent ||
    insight.aggregates.leastIndependent;

  return (
    <div
      className={`bg-white dark:bg-[#222226] border-2 border-gray-900 dark:border-[#444] p-4 sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 min-w-0 mb-2">
        <SignalBadge signal={insight.signal ?? 'pattern'} />
        <h3 className="aicher-heading type-lg text-gray-900 dark:text-gray-100">
          Money Report Card
        </h3>
      </div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <ConfidenceBadge confidence={insight.confidence} />
        <SourceCitation sources={insight.sources ?? []} dataAsOf={insight.dataAsOf} />
      </div>

      {/* District context */}
      <div className="type-xs text-gray-500 aicher-heading-wide mb-4">
        {insight.state} District {insight.district}
        {insight.multiDistrict && ' (multiple districts — showing primary)'}
        {' \u2014 '}
        {insight.representatives.length} representative
        {insight.representatives.length !== 1 ? 's' : ''}
      </div>

      {/* Narrative */}
      <p className="type-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-4 border-l-2 border-gray-300 pl-3">
        {insight.narrative}
      </p>

      {/* Aggregates banner */}
      {hasAggregates && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <AggregateStat label="Highest overlap" entry={insight.aggregates.highestOverlap} />
          <AggregateStat label="Lowest overlap" entry={insight.aggregates.lowestOverlap} />
          <AggregateStat label="Most independent" entry={insight.aggregates.mostIndependent} />
          <AggregateStat label="Least independent" entry={insight.aggregates.leastIndependent} />
        </div>
      )}

      {/* Average correlation */}
      {insight.aggregates.averageCorrelation !== null && (
        <div className="bg-gray-50 dark:bg-[#2a2a2e] p-3 mb-4">
          <span className="type-xs text-gray-500 aicher-heading-wide">
            Avg vote-finance correlation
          </span>
          <span className="type-sm font-medium text-gray-900 ml-2">
            {pct(insight.aggregates.averageCorrelation)}
          </span>
        </div>
      )}

      {/* Per-rep cards */}
      {insight.representatives.length === 0 ? (
        <div className="bg-gray-50 dark:bg-[#2a2a2e] p-4">
          <p className="type-sm text-gray-500">
            No representatives found for this district. This may be a data gap.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedReps.map(rep => (
            <RepCard key={rep.bioguideId} rep={rep} />
          ))}
        </div>
      )}

      {hasMore && (
        <button
          onClick={() => setShowAll(prev => !prev)}
          className="type-xs text-[#3ea2d4] aicher-heading-wide mt-2 mb-4 py-2 min-h-[44px] inline-flex items-center aicher-focus"
          aria-expanded={showAll}
        >
          {showAll ? 'Show fewer' : `Show all ${insight.representatives.length} representatives`}
        </button>
      )}

      {/* Footer */}
      <div className="mt-4">
        <InsightDisclaimer
          disclaimer={insight.disclaimer}
          methodology={insight.methodology}
          source={insight.source}
        />
      </div>
    </div>
  );
}

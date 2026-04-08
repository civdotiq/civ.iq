/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

/**
 * Temporal Proximity Card
 *
 * Shows timing patterns between money events (donations, lobbying)
 * and legislative events (votes, contracts). Helps citizens see
 * whether money and votes tend to happen close together in time.
 *
 * Never claims causation. Always uses "pattern", "correlation", "association".
 */

import { useState } from 'react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { SourceCitation } from './SourceCitation';
import { InsightDisclaimer } from './InsightDisclaimer';
import type {
  TemporalProximityInsight,
  TemporalPattern,
} from '@/lib/intelligence/analyzers/temporal-proximity-analyzer';

interface TemporalProximityCardProps {
  insight: TemporalProximityInsight;
  className?: string;
}

const PATTERN_LABELS: Record<TemporalPattern['type'], string> = {
  contribution_vote: 'Donations near votes',
  lobbying_bill: 'Lobbying near votes',
  committee_contract: 'Committee work near contracts',
};

const PATTERN_EXPLANATIONS: Record<TemporalPattern['type'], string> = {
  contribution_vote: 'Campaign donations that were recorded within 90 days before a related vote.',
  lobbying_bill: 'Lobbying filings that appeared within 180 days before a related vote.',
  committee_contract:
    'Committee activity that occurred within a year before a related government contract.',
};

const SIGNIFICANCE_COLORS: Record<TemporalPattern['significance'], string> = {
  high: '#e11d07',
  medium: '#b45309',
  low: '#999',
};

const SIGNIFICANCE_LABELS: Record<TemporalPattern['significance'], string> = {
  high: 'Strong pattern',
  medium: 'Moderate pattern',
  low: 'Weak pattern',
};

export function TemporalProximityCard({ insight, className = '' }: TemporalProximityCardProps) {
  if (insight.patterns.length === 0) return null;

  return (
    <div className={`border-2 border-black p-4 sm:p-6 bg-white ${className}`}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="aicher-heading type-base text-gray-900">Timing Patterns: Money and Votes</h3>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      <p className="type-xs text-gray-500 mb-1">
        Do donations or lobbying happen close in time to related votes? This section checks for
        timing patterns in public records. Proximity does not mean one caused the other.
      </p>
      <SourceCitation
        sources={insight.sources ?? []}
        dataAsOf={insight.dataAsOf}
        className="mb-4"
      />

      {/* Narrative */}
      <p className="type-sm text-gray-700 leading-relaxed mb-4">{insight.narrative}</p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <StatCell label="Timing patterns found" value={insight.totalPatternsDetected.toString()} />
        {insight.patterns.map(p => (
          <StatCell
            key={p.type}
            label={PATTERN_LABELS[p.type]}
            value={`${p.avgDaysBetween} days avg`}
          />
        ))}
      </div>

      {/* Pattern details */}
      <div className="space-y-3">
        {insight.patterns.map(pattern => (
          <PatternRow key={pattern.type} pattern={pattern} />
        ))}
      </div>

      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="type-xs text-gray-500">{label}</div>
      <div className="type-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function PatternRow({ pattern }: { pattern: TemporalPattern }) {
  const [expanded, setExpanded] = useState(false);
  const sigColor = SIGNIFICANCE_COLORS[pattern.significance];

  // Find the largest dollar amount
  const amounts = pattern.edgePairs
    .map(p => p.amountInvolved)
    .filter((a): a is number => a !== undefined && a > 0);
  const largestAmount = amounts.length > 0 ? Math.max(...amounts) : null;

  return (
    <div className="bg-gray-50 p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="type-sm font-medium text-gray-900">{PATTERN_LABELS[pattern.type]}</span>
        <span className="type-xs font-medium" style={{ color: sigColor }}>
          {SIGNIFICANCE_LABELS[pattern.significance]}
        </span>
      </div>

      <p className="type-xs text-gray-500 mb-2">{PATTERN_EXPLANATIONS[pattern.type]}</p>

      <div className="flex flex-wrap gap-4 type-xs text-gray-600">
        <span>
          <strong>{pattern.instanceCount}</strong> instances
        </span>
        <span>
          <strong>{pattern.avgDaysBetween}</strong> days average gap
        </span>
        {largestAmount !== null && (
          <span>
            Largest: <strong>{formatCompact(largestAmount)}</strong>
          </span>
        )}
        <span>
          Proximity: <strong>{(pattern.proximityScore * 100).toFixed(0)}%</strong>
        </span>
      </div>

      {/* Expandable detail rows */}
      {pattern.edgePairs.length > 0 && (
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="type-xs text-[#3ea2d4] mt-2 py-1 min-h-[44px] inline-flex items-center aicher-focus"
          aria-expanded={expanded}
        >
          {expanded
            ? 'Hide details'
            : `Show ${pattern.edgePairs.length} individual ${pattern.edgePairs.length === 1 ? 'case' : 'cases'}`}
        </button>
      )}

      {expanded && (
        <div className="mt-2 space-y-1">
          {pattern.edgePairs.slice(0, 10).map((pair, i) => (
            <div
              key={i}
              className="flex items-center gap-2 type-xs text-gray-500 py-1 border-b border-gray-100"
            >
              <span className="truncate flex-1">{pair.cause.label}</span>
              <span className="text-gray-400 flex-shrink-0">{pair.daysBetween}d before</span>
              <span className="truncate flex-1 text-right">{pair.effect.label}</span>
              {pair.amountInvolved != null && pair.amountInvolved > 0 && (
                <span className="text-gray-400 flex-shrink-0">
                  {formatCompact(pair.amountInvolved)}
                </span>
              )}
            </div>
          ))}
          {pattern.edgePairs.length > 10 && (
            <p className="type-xs text-gray-400 pt-1">
              ...and {pattern.edgePairs.length - 10} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { ConfidenceBadge } from './ConfidenceBadge';
import { InsightDisclaimer } from './InsightDisclaimer';
import type {
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
  TemporalVoteInsight,
  LobbyingPipelineInsight,
  PACVoteInsight,
} from '@/lib/intelligence/types';

/**
 * InsightCard — renders a single intelligence insight.
 *
 * Progressive disclosure:
 * 1. Title + key stat callout
 * 2. AI narrative paragraph
 * 3. Confidence badge + data date
 * 4. Collapsible disclaimer + methodology
 */

interface InsightCardProps {
  title: string;
  insight:
    | FinanceJurisdictionInsight
    | VoteFinanceInsight
    | TemporalVoteInsight
    | LobbyingPipelineInsight
    | PACVoteInsight;
  keyStats: Array<{ label: string; value: string }>;
  className?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function InsightCard({ title, insight, keyStats, className = '' }: InsightCardProps) {
  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header: title + confidence */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <h3 className="aicher-heading type-lg text-gray-900">{title}</h3>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      {/* Key stat callouts */}
      {keyStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {keyStats.map(stat => (
            <div key={stat.label} className="border-2 border-gray-200 p-3">
              <div className="aicher-heading type-2xl text-gray-900">{stat.value}</div>
              <div className="type-xs text-gray-500 aicher-heading-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Narrative */}
      <p className="type-sm text-gray-700 leading-relaxed">{insight.narrative}</p>

      {/* Data date */}
      <p className="type-xs text-gray-400 mt-3">
        Analysis based on data through {formatDate(insight.dataAsOf)}
      </p>

      {/* Disclaimer + methodology */}
      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />
    </div>
  );
}

/**
 * Builds key stats array for a FinanceJurisdictionInsight.
 */
export function financeJurisdictionKeyStats(
  insight: FinanceJurisdictionInsight
): Array<{ label: string; value: string }> {
  const stats: Array<{ label: string; value: string }> = [
    {
      label: 'Overlap score',
      value: `${(insight.overlapScore * 100).toFixed(1)}%`,
    },
    {
      label: 'Committees analyzed',
      value: String(insight.committees.length),
    },
  ];

  if (insight.peerComparison.peerCount > 0) {
    stats.push({
      label: 'Peer average',
      value: `${(insight.peerComparison.peerAverage * 100).toFixed(1)}%`,
    });
  }

  return stats;
}

/**
 * Builds key stats array for a VoteFinanceInsight.
 */
export function voteFinanceKeyStats(
  insight: VoteFinanceInsight
): Array<{ label: string; value: string }> {
  const sectorsAnalyzed = insight.correlations.filter(c => c.meetsSampleSize).length;

  const stats: Array<{ label: string; value: string }> = [
    {
      label: 'Sectors analyzed',
      value: String(sectorsAnalyzed),
    },
  ];

  if (insight.overallCorrelation !== null) {
    stats.push({
      label: 'Correlation',
      value: insight.overallCorrelation.toFixed(3),
    });
  }

  if (insight.peerComparison.peerCount > 0) {
    stats.push({
      label: 'Peer average',
      value: `${(insight.peerComparison.peerAverage * 100).toFixed(1)}%`,
    });
  }

  return stats;
}

/**
 * Builds key stats array for a TemporalVoteInsight.
 */
export function temporalVoteKeyStats(
  insight: TemporalVoteInsight
): Array<{ label: string; value: string }> {
  const avgAlignment =
    insight.quarters.reduce((sum, q) => sum + q.alignmentScore, 0) / insight.quarters.length;

  const stats: Array<{ label: string; value: string }> = [
    {
      label: 'Avg alignment',
      value: `${(avgAlignment * 100).toFixed(1)}%`,
    },
    {
      label: 'Quarters analyzed',
      value: String(insight.quarters.length),
    },
    {
      label: 'Shifts detected',
      value: String(insight.shifts.length),
    },
  ];

  return stats;
}

/**
 * Builds key stats array for a LobbyingPipelineInsight.
 */
export function lobbyingPipelineKeyStats(
  insight: LobbyingPipelineInsight
): Array<{ label: string; value: string }> {
  const formattedSpending =
    insight.totalSpending >= 1_000_000
      ? `$${(insight.totalSpending / 1_000_000).toFixed(1)}M`
      : `$${(insight.totalSpending / 1_000).toFixed(0)}K`;

  const stats: Array<{ label: string; value: string }> = [
    {
      label: 'Total lobbying',
      value: formattedSpending,
    },
    {
      label: 'Organizations',
      value: String(insight.organizationCount),
    },
    {
      label: 'Matched bills',
      value: String(insight.matchedBillCount),
    },
  ];

  return stats;
}

/**
 * Builds key stats array for a PACVoteInsight.
 */
export function pacVoteKeyStats(insight: PACVoteInsight): Array<{ label: string; value: string }> {
  const formattedDisbursed =
    insight.totalDisbursed >= 1_000_000
      ? `$${(insight.totalDisbursed / 1_000_000).toFixed(1)}M`
      : `$${(insight.totalDisbursed / 1_000).toFixed(0)}K`;

  return [
    {
      label: 'To legislators',
      value: formattedDisbursed,
    },
    {
      label: 'Recipients analyzed',
      value: String(insight.recipientCount),
    },
    {
      label: 'Relevant votes',
      value: String(insight.relevantBillCount),
    },
  ];
}

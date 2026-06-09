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
import type {
  FinanceJurisdictionInsight,
  VoteFinanceInsight,
  TemporalVoteInsight,
  LobbyingPipelineInsight,
  PACVoteInsight,
  StockCommitteeInsight,
  BillIntelligenceInsight,
  InfluenceChainInsight,
  InsightSignal,
} from '@/lib/intelligence/types';

/**
 * InsightCard — renders a single intelligence insight.
 *
 * Narrative-first progressive disclosure:
 * 1. Signal badge + title + confidence
 * 2. AI narrative paragraph (primary content)
 * 3. Source citation line
 * 4. Collapsible key stats + disclaimer + methodology
 */

interface InsightCardProps {
  title: string;
  insight:
    | FinanceJurisdictionInsight
    | VoteFinanceInsight
    | TemporalVoteInsight
    | LobbyingPipelineInsight
    | PACVoteInsight
    | StockCommitteeInsight
    | BillIntelligenceInsight
    | InfluenceChainInsight;
  keyStats: KeyStat[];
  className?: string;
  /** Optional bioguide ID to enable "Explore connections" link */
  bioguideId?: string;
}

/** A key stat with optional temporal delta. */
export interface KeyStat {
  label: string;
  value: string;
  /** Temporal change indicator, e.g., { change: '+12%', period: 'since Q3' } */
  delta?: { change: string; period: string };
}

/** Left border color per signal type */
const SIGNAL_BORDER: Record<InsightSignal, string> = {
  alert: 'border-l-amber-500',
  pattern: 'border-l-[#3ea2d4]',
  tracking: 'border-l-gray-400',
  baseline: 'border-l-gray-300',
};

export function InsightCard({
  title,
  insight,
  keyStats,
  className = '',
  bioguideId,
}: InsightCardProps) {
  const [statsOpen, setStatsOpen] = useState(false);
  const signal = insight.signal ?? 'pattern';
  const borderClass = SIGNAL_BORDER[signal];

  return (
    <div
      className={`bg-white border-2 border-gray-900 border-l-4 ${borderClass} p-4 sm:p-6 ${className}`}
    >
      {/* Header: signal badge + title */}
      <div className="flex items-center gap-2 min-w-0 mb-3">
        <SignalBadge signal={signal} />
        <h3 className="aicher-heading type-lg text-gray-900 truncate">{title}</h3>
      </div>

      {/* Confidence + source — in primary reading flow */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <ConfidenceBadge confidence={insight.confidence} />
        <SourceCitation sources={insight.sources ?? []} dataAsOf={insight.dataAsOf} />
      </div>

      {/* Narrative — primary content */}
      <p className="type-sm text-gray-700 leading-relaxed mb-3">{insight.narrative}</p>

      {/* Collapsible key stats */}
      {keyStats.length > 0 && (
        <div className="border-t-2 border-gray-200 pt-3">
          <button
            onClick={() => setStatsOpen(prev => !prev)}
            className="type-xs text-[#3ea2d4] aicher-heading-wide py-2 min-h-[44px] inline-flex items-center aicher-focus"
            aria-expanded={statsOpen}
          >
            {statsOpen ? 'Hide details' : `View details (${keyStats.length})`}
          </button>

          {statsOpen && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
              {keyStats.map(stat => (
                <div key={stat.label} className="bg-gray-50 p-3">
                  <div className="aicher-heading type-2xl text-gray-900">
                    {stat.value}
                    {stat.delta && (
                      <span
                        className={`type-xs ml-1 ${
                          stat.delta.change.startsWith('+')
                            ? 'text-gray-600'
                            : stat.delta.change.startsWith('-')
                              ? 'text-amber-600'
                              : 'text-gray-500'
                        }`}
                      >
                        {stat.delta.change}
                      </span>
                    )}
                  </div>
                  <div className="type-xs text-gray-500 aicher-heading-wide">
                    {stat.label}
                    {stat.delta && <span className="text-gray-400 ml-1">{stat.delta.period}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Disclaimer + methodology */}
      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />

      {bioguideId && (
        <a
          href={`/investigate?node=rep:${bioguideId}`}
          className="block mt-3 type-xs text-[#3ea2d4] hover:underline"
        >
          Explore connections
        </a>
      )}
    </div>
  );
}

/**
 * Builds key stats array for a FinanceJurisdictionInsight.
 */
export function financeJurisdictionKeyStats(insight: FinanceJurisdictionInsight): KeyStat[] {
  const peer = insight.peerComparison;
  const overlapPct = insight.overlapScore * 100;
  const peerPct = peer.peerAverage * 100;

  // Delta vs peer average
  let delta: KeyStat['delta'];
  if (peer.peerCount > 0) {
    const diff = overlapPct - peerPct;
    if (Math.abs(diff) >= 1) {
      delta = {
        change: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`,
        period: 'vs peers',
      };
    }
  }

  const stats: KeyStat[] = [
    {
      label: 'Overlap score',
      value: `${overlapPct.toFixed(1)}%`,
      delta,
    },
    {
      label: 'Committees analyzed',
      value: String(insight.committees.length),
    },
  ];

  if (peer.peerCount > 0) {
    stats.push({
      label: 'Peer average',
      value: `${peerPct.toFixed(1)}%`,
    });
  }

  return stats;
}

/**
 * Builds key stats array for a VoteFinanceInsight.
 */
export function voteFinanceKeyStats(insight: VoteFinanceInsight): KeyStat[] {
  const sectorsAnalyzed = insight.correlations.filter(c => c.meetsSampleSize).length;
  const peer = insight.peerComparison;

  const stats: KeyStat[] = [
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

  if (peer && peer.peerCount > 0) {
    stats.push({
      label: 'Peer average yea-rate',
      value: `${(peer.peerAverage * 100).toFixed(1)}%`,
    });
  }

  return stats;
}

/**
 * Builds key stats array for a TemporalVoteInsight.
 */
export function temporalVoteKeyStats(insight: TemporalVoteInsight): KeyStat[] {
  const avgAlignment =
    insight.quarters.reduce((sum, q) => sum + q.alignmentScore, 0) / insight.quarters.length;

  // Compute delta from most recent quarter vs prior quarter
  const quarters = insight.quarters;
  let delta: KeyStat['delta'];
  if (quarters.length >= 2) {
    const latest = quarters[quarters.length - 1]!;
    const prior = quarters[quarters.length - 2]!;
    const diff = (latest.alignmentScore - prior.alignmentScore) * 100;
    if (Math.abs(diff) >= 0.5) {
      delta = {
        change: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`,
        period: `since ${prior.quarter}`,
      };
    }
  }

  return [
    {
      label: 'Latest quarter rate',
      value:
        quarters.length > 0
          ? `${(quarters[quarters.length - 1]!.alignmentScore * 100).toFixed(1)}%`
          : `${(avgAlignment * 100).toFixed(1)}%`,
      delta,
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
}

/**
 * Builds key stats array for a LobbyingPipelineInsight.
 */
export function lobbyingPipelineKeyStats(insight: LobbyingPipelineInsight): KeyStat[] {
  const formattedSpending =
    insight.totalSpending >= 1_000_000
      ? `$${(insight.totalSpending / 1_000_000).toFixed(1)}M`
      : `$${(insight.totalSpending / 1_000).toFixed(0)}K`;

  // Delta vs peer spending
  const peer = insight.peerComparison;
  let delta: KeyStat['delta'];
  if (peer.peerCount > 0 && peer.peerAverage > 0) {
    const pctDiff = ((insight.totalSpending - peer.peerAverage) / peer.peerAverage) * 100;
    if (Math.abs(pctDiff) >= 5) {
      delta = {
        change: `${pctDiff >= 0 ? '+' : ''}${pctDiff.toFixed(0)}%`,
        period: 'vs peer cmtes',
      };
    }
  }

  return [
    {
      label: 'Total lobbying',
      value: formattedSpending,
      delta,
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
}

/**
 * Builds key stats array for a PACVoteInsight.
 */
export function pacVoteKeyStats(insight: PACVoteInsight): KeyStat[] {
  const formattedDisbursed =
    insight.totalDisbursed >= 1_000_000
      ? `$${(insight.totalDisbursed / 1_000_000).toFixed(1)}M`
      : `$${(insight.totalDisbursed / 1_000).toFixed(0)}K`;

  // Yea rate delta vs baseline (omitted when no baseline could be computed)
  let yeaDelta: KeyStat['delta'];
  if (insight.aggregateBaselineYeaRate !== null) {
    const diff = (insight.aggregateYeaRate - insight.aggregateBaselineYeaRate) * 100;
    if (Math.abs(diff) >= 1) {
      yeaDelta = {
        change: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`,
        period: 'vs baseline',
      };
    }
  }

  return [
    {
      label: 'To legislators',
      value: formattedDisbursed,
    },
    {
      label: 'Recipient yea rate',
      value: `${(insight.aggregateYeaRate * 100).toFixed(1)}%`,
      delta: yeaDelta,
    },
    {
      label: 'Relevant votes',
      value: String(insight.relevantBillCount),
    },
  ];
}

/**
 * Builds key stats array for a StockCommitteeInsight.
 */
export function stockCommitteeKeyStats(insight: StockCommitteeInsight): KeyStat[] {
  const committeesWithOverlap = insight.committees.filter(c => c.flaggedTradeCount > 0).length;

  // Delta vs expected overlap rate
  const overlapPct = insight.overlapRate * 100;
  const expectedPct = insight.expectedOverlapRate * 100;
  let delta: KeyStat['delta'];
  if (expectedPct > 0) {
    const diff = overlapPct - expectedPct;
    if (Math.abs(diff) >= 1) {
      delta = {
        change: `${diff >= 0 ? '+' : ''}${diff.toFixed(1)}pp`,
        period: 'vs expected',
      };
    }
  }

  return [
    {
      label: 'Flagged trades',
      value: String(insight.flaggedTradeCount),
    },
    {
      label: 'Overlap rate',
      value: `${overlapPct.toFixed(1)}%`,
      delta,
    },
    {
      label: 'Committees',
      value: String(committeesWithOverlap),
    },
  ];
}

/**
 * Builds key stats array for a BillIntelligenceInsight.
 * Max 3 cards, prioritized by notability.
 */
export function billIntelligenceKeyStats(insight: BillIntelligenceInsight): KeyStat[] {
  const candidates: Array<{
    label: string;
    value: string;
    delta?: KeyStat['delta'];
    priority: number;
  }> = [];

  // Vote result — highest priority when available
  if (insight.voteOutcome) {
    const v = insight.voteOutcome;
    const tag = v.partyLine ? ' (party-line)' : v.bipartisan ? ' (bipartisan)' : '';
    candidates.push({
      label: `${v.chamber} vote`,
      value: `${v.yea}-${v.nay}${tag}`,
      priority: 10,
    });
  }

  // Sponsor sector funding
  if (insight.sponsorAnalysis) {
    const totalCtx = insight.sponsorFundingContext
      ? ` of ${formatCompact(insight.sponsorFundingContext.totalRaised)}`
      : '';
    candidates.push({
      label: `Sponsor industry funding${totalCtx}`,
      value: `${insight.sponsorAnalysis.sectorDonationPercentage.toFixed(1)}%`,
      priority: 8,
    });
  }

  // Lobbying spending
  if (insight.relatedLobbyingSpending > 0) {
    candidates.push({
      label: 'Committee lobbying',
      value: formatCompact(insight.relatedLobbyingSpending),
      priority: 7,
    });
  }

  // Sponsor on committee
  if (insight.sponsorCommitteeConnection?.connected) {
    candidates.push({
      label: 'Sponsor on committee',
      value: 'Yes',
      priority: 6,
    });
  }

  // Bill status
  if (insight.billProgress) {
    const status = insight.billProgress.status.replace(/_/g, ' ');
    candidates.push({
      label: 'Status',
      value: status.charAt(0).toUpperCase() + status.slice(1),
      priority: 3,
    });
  }

  // Affected sectors as fallback
  candidates.push({
    label: 'Related sectors',
    value: String(insight.affectedSectors.length),
    priority: 1,
  });

  return candidates
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3)
    .map(({ label, value, delta }) => ({ label, value, delta }));
}

function formatCompact(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`;
  return `$${amount.toLocaleString()}`;
}

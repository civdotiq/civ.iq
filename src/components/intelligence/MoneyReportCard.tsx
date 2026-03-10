/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import { ConfidenceBadge } from './ConfidenceBadge';
import { InsightDisclaimer } from './InsightDisclaimer';
import Link from 'next/link';
import type { MoneyReportCardInsight } from '@/lib/intelligence/types';

interface MoneyReportCardProps {
  insight: MoneyReportCardInsight;
  className?: string;
}

function formatPct(value: number | null): string {
  if (value === null) return 'N/A';
  return `${(value * 100).toFixed(0)}%`;
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

/**
 * Color coding for correlation/overlap metrics.
 * Green < 30%, amber 30-60%, red > 60%.
 */
function metricColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  const pct = value * 100;
  if (pct < 30) return 'text-[#0a9338]';
  if (pct <= 60) return 'text-amber-600';
  return 'text-[#e11d07]';
}

/**
 * Color coding for independence score (inverted).
 * Green > 60%, amber 30-60%, red < 30%.
 */
function independenceColor(value: number | null): string {
  if (value === null) return 'text-gray-400';
  const pct = value * 100;
  if (pct > 60) return 'text-[#0a9338]';
  if (pct >= 30) return 'text-amber-600';
  return 'text-[#e11d07]';
}

function partyDotColor(party: string): string {
  if (party === 'D' || party === 'Democrat') return 'bg-[#0a9338]';
  if (party === 'R' || party === 'Republican') return 'bg-[#e11d07]';
  return 'bg-gray-500';
}

function partyLabel(party: string): string {
  if (party === 'D' || party === 'Democrat') return 'D';
  if (party === 'R' || party === 'Republican') return 'R';
  if (party === 'I' || party === 'Independent') return 'I';
  return party;
}

export function MoneyReportCard({ insight, className = '' }: MoneyReportCardProps) {
  const { representatives, aggregates, multiDistrict } = insight;

  return (
    <div className={`bg-white border-2 border-gray-900 p-4 sm:p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="aicher-heading type-lg text-gray-900">Money Report Card</h3>
          <p className="type-xs text-gray-500 mt-1">
            {insight.state} District {insight.district}
          </p>
        </div>
        <ConfidenceBadge confidence={insight.confidence} />
      </div>

      {/* Multi-district warning */}
      {multiDistrict && (
        <div className="border-2 border-amber-500 bg-amber-50 p-3 mb-4">
          <p className="type-sm text-amber-800">
            This ZIP code spans multiple congressional districts. Enter your full address for exact
            district matching.
          </p>
        </div>
      )}

      {/* Per-representative cards */}
      {representatives.map(rep => (
        <div key={rep.bioguideId} className="border-2 border-gray-200 p-4 mb-3">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            {/* Left: name, party, chamber */}
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 flex-shrink-0 ${partyDotColor(rep.party)}`}
                aria-label={`Party: ${partyLabel(rep.party)}`}
              />
              <div>
                <Link
                  href={`/representative/${rep.bioguideId}?tab=intelligence`}
                  className="type-sm font-medium text-[#3ea2d4] aicher-focus"
                >
                  {rep.name}
                </Link>
                <span className="type-xs text-gray-500 ml-2">
                  ({partyLabel(rep.party)}) {rep.chamber}
                </span>
              </div>
            </div>

            {/* Right: 3 metric cells */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div className="text-center">
                <div
                  className={`aicher-heading type-lg ${metricColor(rep.voteFinanceCorrelation)}`}
                >
                  {formatPct(rep.voteFinanceCorrelation)}
                </div>
                <div className="type-xs text-gray-500 aicher-heading-wide">
                  Vote-Finance Correlation
                </div>
              </div>
              <div className="text-center">
                <div
                  className={`aicher-heading type-lg ${metricColor(rep.financeJurisdictionOverlap)}`}
                >
                  {formatPct(rep.financeJurisdictionOverlap)}
                </div>
                <div className="type-xs text-gray-500 aicher-heading-wide">
                  Committee-Donor Overlap
                </div>
              </div>
              <div className="text-center">
                <div
                  className={`aicher-heading type-lg ${independenceColor(rep.independenceScore)}`}
                >
                  {formatPct(rep.independenceScore)}
                </div>
                <div className="type-xs text-gray-500 aicher-heading-wide">Independence Score</div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* District Summary */}
      <div className="mb-4">
        <h4 className="aicher-heading type-sm text-gray-900 mb-2">District Summary</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {formatPct(aggregates.averageCorrelation)}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Avg correlation</div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            {aggregates.highestOverlap ? (
              <>
                <div className="aicher-heading type-2xl text-gray-900">
                  {formatPct(aggregates.highestOverlap.value)}
                </div>
                <div className="type-xs text-gray-500 aicher-heading-wide">
                  Highest overlap ({aggregates.highestOverlap.name})
                </div>
              </>
            ) : (
              <>
                <div className="aicher-heading type-2xl text-gray-400">N/A</div>
                <div className="type-xs text-gray-500 aicher-heading-wide">Highest overlap</div>
              </>
            )}
          </div>
          <div className="border-2 border-gray-200 p-3">
            {aggregates.mostIndependent ? (
              <>
                <div className="aicher-heading type-2xl text-gray-900">
                  {formatPct(aggregates.mostIndependent.value)}
                </div>
                <div className="type-xs text-gray-500 aicher-heading-wide">
                  Most independent ({aggregates.mostIndependent.name})
                </div>
              </>
            ) : (
              <>
                <div className="aicher-heading type-2xl text-gray-400">N/A</div>
                <div className="type-xs text-gray-500 aicher-heading-wide">Most independent</div>
              </>
            )}
          </div>
          <div className="border-2 border-gray-200 p-3">
            {aggregates.leastIndependent ? (
              <>
                <div className="aicher-heading type-2xl text-gray-900">
                  {formatPct(aggregates.leastIndependent.value)}
                </div>
                <div className="type-xs text-gray-500 aicher-heading-wide">
                  Least independent ({aggregates.leastIndependent.name})
                </div>
              </>
            ) : (
              <>
                <div className="aicher-heading type-2xl text-gray-400">N/A</div>
                <div className="type-xs text-gray-500 aicher-heading-wide">Least independent</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Narrative */}
      <p className="type-sm text-gray-700 leading-relaxed mb-4">{insight.narrative}</p>

      {/* Footer */}
      <p className="type-xs text-gray-400">
        Analysis based on data through {formatDate(insight.dataAsOf)}
      </p>

      <InsightDisclaimer
        disclaimer={insight.disclaimer}
        methodology={insight.methodology}
        source={insight.source}
      />
    </div>
  );
}

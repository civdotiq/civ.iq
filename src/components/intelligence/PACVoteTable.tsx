/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import Link from 'next/link';
import { displaySector } from '@/lib/mesh/sector-display';
import type { PACVoteInsight, PACRecipientVoteRecord } from '@/lib/intelligence/types';

/**
 * PACVoteTable — structured table showing PAC → legislator vote patterns.
 *
 * Two sections:
 * 1. Summary: PAC sector, total disbursed, aggregate yea rate vs baseline
 * 2. Recipient table: name (linked), party, state, amount, votes, yea rate, baseline, diff
 *
 * Aicher design: border-2, no shadows, no rounded corners.
 */

interface PACVoteTableProps {
  insight: PACVoteInsight;
  className?: string;
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatPct(value: number | null): string {
  if (value === null) return '—';
  return `${(value * 100).toFixed(1)}%`;
}

function formatDiff(value: number | null): string {
  if (value === null) return '—';
  const pct = (value * 100).toFixed(1);
  return `${value > 0 ? `+${pct}` : pct}pp`;
}

function getDiffColor(diff: number | null): string {
  if (diff === null || Math.abs(diff) < 0.03) return 'text-gray-700';
  // Amber for notable divergence in either direction — green/red are
  // reserved for party identification, not metric direction.
  return 'text-[#d97706]';
}

function getPartyBadgeClass(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return 'bg-party-dem text-white';
  if (party === 'Republican') return 'bg-[#e11d07] text-white';
  return 'bg-gray-500 text-white';
}

function getPartyAbbrev(party: string): string {
  if (party === 'Democratic' || party === 'Democrat') return 'D';
  if (party === 'Republican') return 'R';
  return 'I';
}

export function PACVoteTable({ insight, className = '' }: PACVoteTableProps) {
  const diff =
    insight.aggregateBaselineYeaRate !== null
      ? insight.aggregateYeaRate - insight.aggregateBaselineYeaRate
      : null;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          PAC Vote Tracing: {insight.committeeName}
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {formatCurrency(insight.totalDisbursed)}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">To legislators</div>
          </div>
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">{insight.recipientCount}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Recipients</div>
          </div>
          <div className="bg-gray-50 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {formatPct(insight.aggregateYeaRate)}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Yea rate</div>
          </div>
          <div className="bg-gray-50 p-3">
            <div className={`aicher-heading type-2xl ${getDiffColor(diff)}`}>
              {formatDiff(diff)}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">vs. party baseline</div>
          </div>
        </div>

        <div className="type-xs text-gray-500">Sector: {displaySector(insight.sector)}</div>
      </div>

      {/* Recipient Table */}
      {insight.recipientVotes.length > 0 && (
        <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
          <h4 className="aicher-heading type-base text-gray-900 mb-3">Recipient Voting Records</h4>
          <div className="overflow-x-auto">
            <table className="w-full type-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 pr-3 aicher-heading-wide type-xs text-gray-500">
                    Legislator
                  </th>
                  <th className="text-center py-2 pr-3 aicher-heading-wide type-xs text-gray-500">
                    Party
                  </th>
                  <th className="text-left py-2 pr-3 aicher-heading-wide type-xs text-gray-500 hidden sm:table-cell">
                    State
                  </th>
                  <th className="text-right py-2 pr-3 aicher-heading-wide type-xs text-gray-500">
                    Received
                  </th>
                  <th className="text-right py-2 pr-3 aicher-heading-wide type-xs text-gray-500">
                    Votes
                  </th>
                  <th className="text-right py-2 pr-3 aicher-heading-wide type-xs text-gray-500">
                    Yea rate
                  </th>
                  <th className="text-right py-2 pr-3 aicher-heading-wide type-xs text-gray-500 hidden sm:table-cell">
                    Baseline
                  </th>
                  <th className="text-right py-2 aicher-heading-wide type-xs text-gray-500">
                    Diff
                  </th>
                </tr>
              </thead>
              <tbody>
                {insight.recipientVotes.map((r: PACRecipientVoteRecord) => (
                  <tr key={r.bioguideId} className="border-b border-gray-200">
                    <td className="py-2 pr-3 text-gray-900">
                      <Link
                        href={`/representative/${r.bioguideId}`}
                        className="text-[#3ea2d4] hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 text-xs font-bold ${getPartyBadgeClass(r.party)}`}
                      >
                        {getPartyAbbrev(r.party)}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-gray-700 hidden sm:table-cell">{r.state}</td>
                    <td className="py-2 pr-3 text-right text-gray-700 font-mono">
                      {formatCurrency(r.amountReceived)}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-700">{r.relevantVoteCount}</td>
                    <td className="py-2 pr-3 text-right text-gray-900 font-mono">
                      {formatPct(r.yeaRate)}
                    </td>
                    <td className="py-2 pr-3 text-right text-gray-500 font-mono hidden sm:table-cell">
                      {formatPct(r.partyBaselineYeaRate)}
                    </td>
                    <td
                      className={`py-2 text-right font-mono font-bold ${getDiffColor(r.differenceFromBaseline)}`}
                    >
                      {formatDiff(r.differenceFromBaseline)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

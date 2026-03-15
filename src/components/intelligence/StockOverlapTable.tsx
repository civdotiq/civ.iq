/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type {
  StockCommitteeInsight,
  FlaggedTrade,
  CommitteeTradeOverlap,
} from '@/lib/intelligence/types';

/**
 * StockOverlapTable -- structured table showing stock trade-committee jurisdiction overlap.
 *
 * Three sections:
 * 1. Summary stats grid: total / resolvable / flagged / overlap rate / expected rate
 * 2. Per-committee breakdown: name, jurisdiction sectors, flagged count
 * 3. Flagged trades table: date, ticker, type, amount, sector, committee, owner
 *
 * Aicher design: border-2, no shadows, no rounded corners.
 */

interface StockOverlapTableProps {
  insight: StockCommitteeInsight;
  className?: string;
}

export function StockOverlapTable({ insight, className = '' }: StockOverlapTableProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Summary */}
      <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
        <h3 className="aicher-heading type-lg text-gray-900 mb-4">
          Stock Trade-Committee Jurisdiction
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-4">
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">{insight.totalTrades}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Total trades</div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {insight.totalResolvableTrades}
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Resolvable</div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">{insight.flaggedTradeCount}</div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Flagged</div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {(insight.overlapRate * 100).toFixed(1)}%
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Overlap rate</div>
          </div>
          <div className="border-2 border-gray-200 p-3">
            <div className="aicher-heading type-2xl text-gray-900">
              {(insight.expectedOverlapRate * 100).toFixed(1)}%
            </div>
            <div className="type-xs text-gray-500 aicher-heading-wide">Expected rate</div>
          </div>
        </div>
      </div>

      {/* Per-committee breakdown */}
      {insight.committees.some((c: CommitteeTradeOverlap) => c.flaggedTradeCount > 0) && (
        <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
          <h4 className="aicher-heading type-base text-gray-900 mb-3">Committee Breakdown</h4>
          <div className="space-y-3">
            {insight.committees
              .filter((c: CommitteeTradeOverlap) => c.flaggedTradeCount > 0)
              .sort(
                (a: CommitteeTradeOverlap, b: CommitteeTradeOverlap) =>
                  b.flaggedTradeCount - a.flaggedTradeCount
              )
              .map((c: CommitteeTradeOverlap) => (
                <div key={c.committeeCode} className="border-2 border-gray-200 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="aicher-heading type-sm text-gray-900">{c.committeeName}</span>
                    <span className="type-sm text-gray-700 whitespace-nowrap">
                      {c.flaggedTradeCount} trade{c.flaggedTradeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {c.jurisdictionSectors.map((sector: string) => (
                      <span
                        key={sector}
                        className="type-xs text-gray-500 border border-gray-300 px-1.5 py-0.5"
                      >
                        {sector}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Flagged trades table */}
      {insight.flaggedTrades.length > 0 && (
        <div className="bg-white border-2 border-gray-900 p-4 sm:p-6">
          <h4 className="aicher-heading type-base text-gray-900 mb-3">Flagged Trades</h4>
          <div className="overflow-x-auto">
            <table className="w-full type-sm">
              <thead>
                <tr className="border-b-2 border-gray-900">
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500">
                    Date
                  </th>
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500">
                    Asset
                  </th>
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500 hidden sm:table-cell">
                    Type
                  </th>
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500">
                    Amount
                  </th>
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500 hidden md:table-cell">
                    Sector
                  </th>
                  <th className="text-left py-2 pr-4 aicher-heading-wide type-xs text-gray-500 hidden lg:table-cell">
                    Committee
                  </th>
                  <th className="text-left py-2 aicher-heading-wide type-xs text-gray-500 hidden lg:table-cell">
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody>
                {insight.flaggedTrades.map((trade: FlaggedTrade, i: number) => (
                  <tr
                    key={`${trade.ticker}-${trade.transactionDate}-${i}`}
                    className="border-b border-gray-200"
                  >
                    <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">
                      {formatDate(trade.transactionDate)}
                    </td>
                    <td className="py-2 pr-4 text-gray-900">
                      <a
                        href={trade.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3ea2d4] hover:underline"
                      >
                        {trade.ticker}
                      </a>
                    </td>
                    <td className="py-2 pr-4 text-gray-700 hidden sm:table-cell">
                      {trade.transactionType}
                    </td>
                    <td className="py-2 pr-4 text-gray-700 whitespace-nowrap">{trade.amount}</td>
                    <td className="py-2 pr-4 text-gray-500 hidden md:table-cell">{trade.sector}</td>
                    <td className="py-2 pr-4 text-gray-500 hidden lg:table-cell">
                      {trade.committeeName}
                    </td>
                    <td className="py-2 text-gray-500 hidden lg:table-cell">{trade.owner}</td>
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

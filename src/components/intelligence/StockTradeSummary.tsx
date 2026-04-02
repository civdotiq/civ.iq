/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import type { StockTrade } from '@/types/stock-trades';
import { ASSET_TYPE_CODES } from '@/types/stock-trades';

interface StockTradeSummaryProps {
  trades: StockTrade[];
  totalFilings: number;
}

/** Midpoints for House Clerk amount ranges */
const AMOUNT_MIDPOINTS: Record<string, number> = {
  '$1,001 - $15,000': 8000,
  '$15,001 - $50,000': 32500,
  '$50,001 - $100,000': 75000,
  '$100,001 - $250,000': 175000,
  '$250,001 - $500,000': 375000,
  '$500,001 - $1,000,000': 750000,
  '$1,000,001 - $5,000,000': 3000000,
  '$5,000,001 - $25,000,000': 15000000,
  '$25,000,001 - $50,000,000': 37500000,
  '$50,000,001 - ': 50000000,
  '$0 - $0': 0,
};

function getMidpoint(amount: string): number {
  return AMOUNT_MIDPOINTS[amount] ?? 0;
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

interface TickerCount {
  ticker: string;
  count: number;
}

function computeTopTickers(trades: StockTrade[], limit: number): TickerCount[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    if (t.ticker) {
      counts.set(t.ticker, (counts.get(t.ticker) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([ticker, count]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

interface AssetMix {
  label: string;
  count: number;
  pct: number;
}

function computeAssetMix(trades: StockTrade[]): AssetMix[] {
  const counts = new Map<string, number>();
  for (const t of trades) {
    const label = ASSET_TYPE_CODES[t.assetType] ?? t.assetType;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const total = trades.length;
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count, pct: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

function computeFrequency(trades: StockTrade[]): string {
  if (trades.length < 2) return '--';
  const dates = trades
    .map(t => new Date(t.transactionDate + 'T00:00:00').getTime())
    .filter(d => !isNaN(d))
    .sort((a, b) => a - b);
  if (dates.length < 2) return '--';
  const spanMonths = (dates[dates.length - 1]! - dates[0]!) / (1000 * 60 * 60 * 24 * 30.44);
  if (spanMonths < 1) return `${trades.length}/mo`;
  const perMonth = trades.length / spanMonths;
  return `${perMonth.toFixed(1)}/mo`;
}

/**
 * Trading summary card — answers "How much is this rep trading?" at a glance.
 * Renders above the trade table with key aggregate stats.
 */
export function StockTradeSummary({ trades, totalFilings }: StockTradeSummaryProps) {
  const activeTrades = trades.filter(t => !t.isPaperFiling);
  if (activeTrades.length === 0) return null;

  const estimatedValue = activeTrades.reduce((sum, t) => sum + getMidpoint(t.amount), 0);
  const topTickers = computeTopTickers(activeTrades, 5);
  const assetMix = computeAssetMix(activeTrades);
  const frequency = computeFrequency(activeTrades);
  const lateCount = activeTrades.filter(t => t.isLateFiling).length;

  return (
    <div className="border-2 border-black bg-white p-4 mb-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total transactions */}
        <StatCell
          label="Transactions"
          value={String(activeTrades.length)}
          sub={`${totalFilings} filing${totalFilings !== 1 ? 's' : ''}`}
        />

        {/* Estimated value */}
        <StatCell
          label="Est. value"
          value={formatCurrency(estimatedValue)}
          sub="midpoint of ranges"
        />

        {/* Frequency */}
        <StatCell label="Frequency" value={frequency} />

        {/* Late filings */}
        <StatCell
          label="Late filings"
          value={String(lateCount)}
          isAlert={lateCount > 0}
          sub={lateCount > 0 ? `>${'\u00A0'}45 days to disclose` : 'within 45-day window'}
        />
      </div>

      {/* Top tickers */}
      {topTickers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Most traded
          </p>
          <div className="flex flex-wrap gap-2">
            {topTickers.map(({ ticker, count }) => (
              <span
                key={ticker}
                className="inline-flex items-center gap-1 bg-gray-100 px-2 py-1 text-sm font-mono"
              >
                {ticker}
                <span className="text-xs text-gray-400">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Asset mix */}
      {assetMix.length > 1 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            Asset mix
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {assetMix.slice(0, 6).map(({ label, pct }) => (
              <span key={label} className="text-sm text-gray-700">
                {label} <span className="text-gray-400">{pct.toFixed(0)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCell({
  label,
  value,
  sub,
  isAlert = false,
}: {
  label: string;
  value: string;
  sub?: string;
  isAlert?: boolean;
}) {
  return (
    <div className="bg-gray-50 p-3">
      <div className={`text-2xl font-semibold ${isAlert ? 'text-[#e11d07]' : 'text-gray-900'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

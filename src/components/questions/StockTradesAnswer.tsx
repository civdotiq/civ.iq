/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * StockTradesAnswer — pod renderer for the stock-trades question.
 *
 * Pods: Trade summary, Most traded, Recent trades, Sources.
 * Server component. Shows 119th-Congress periodic transaction reports as
 * filed — dates, assets, owners and value ranges — with no inference about
 * why a trade was made.
 */

import Link from 'next/link';
import type { StockTrade } from '@/types/stock-trades';

interface StockTradesAnswerProps {
  trades: StockTrade[];
  unavailable: boolean;
  name: string;
  chamber: 'House' | 'Senate';
}

const RECENT_LIMIT = 50;
const TOP_ASSETS_LIMIT = 5;

function formatDate(isoDate: string): string {
  if (!isoDate) return 'Unknown';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function assetLabel(trade: StockTrade): string {
  return trade.ticker ? `${trade.ticker} · ${trade.assetDescription}` : trade.assetDescription;
}

function isSale(trade: StockTrade): boolean {
  return trade.transactionType.startsWith('Sale');
}

function sourceName(chamber: 'House' | 'Senate'): string {
  return chamber === 'Senate' ? 'Senate eFD' : 'House Clerk';
}

function RecentTradesPod({ trades, unavailable, name, chamber }: Readonly<StockTradesAnswerProps>) {
  if (unavailable) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">Recent trades</h2>
        <p className="type-sm text-gray-500">
          Data unavailable. The financial disclosure source could not be reached. Try again later.
        </p>
      </div>
    );
  }

  if (!trades.length) {
    return (
      <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
        <h2 className="type-sm font-semibold text-black mb-3">
          No stock trades reported in the 119th Congress
        </h2>
        <p className="type-sm text-gray-700">
          We found no periodic transaction reports from {name} for trades made since January 3,
          2025, in filings from the {sourceName(chamber)}.
        </p>
        <p className="type-sm text-gray-500 mt-2">
          Members report a trade only when they, a spouse or a dependent child buys or sells a
          stock, bond or similar asset worth more than $1,000. Holdings that were not traded do not
          appear here; they are listed in each member&apos;s annual financial disclosure.
        </p>
      </div>
    );
  }

  const recent = trades.slice(0, RECENT_LIMIT);

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6 lg:col-span-2">
      <h2 className="type-sm font-semibold text-black mb-3">Recent trades</h2>
      <ul className="divide-y divide-gray-200">
        {recent.map((trade, i) => (
          <li
            key={`${trade.filingId}-${trade.transactionDate}-${i}`}
            className="py-2 first:pt-0 last:pb-0"
          >
            <div className="flex justify-between items-start gap-3">
              <p className="type-sm text-black min-w-0 flex-1 line-clamp-1">{assetLabel(trade)}</p>
              <span className="type-xs font-medium text-gray-700 shrink-0">{trade.amount}</span>
            </div>
            <p className="type-xs text-gray-500 mt-0.5">
              <span className="font-medium text-gray-700">{trade.transactionType}</span>
              <span className="mx-1">·</span>
              {trade.owner}
              <span className="mx-1">·</span>
              Traded {formatDate(trade.transactionDate)}
              {trade.filingDate && (
                <>
                  <span className="mx-1">·</span>
                  Filed {formatDate(trade.filingDate)}
                </>
              )}
              {trade.sourceUrl && (
                <>
                  <span className="mx-1">·</span>
                  <a
                    href={trade.sourceUrl}
                    className="text-[#3ea2d4] hover:underline"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    View filing
                  </a>
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
      {trades.length > RECENT_LIMIT && (
        <p className="type-xs text-gray-500 mt-3">
          Showing the {RECENT_LIMIT} most recent of {trades.length.toLocaleString()} trades.
        </p>
      )}
    </div>
  );
}

function TradeSummaryPod({ trades }: Readonly<{ trades: StockTrade[] }>) {
  if (!trades.length) return null;

  const purchases = trades.filter(t => t.transactionType === 'Purchase').length;
  const sales = trades.filter(isSale).length;
  const filings = new Set(trades.map(t => t.filingId)).size;
  const latest = trades[0]?.transactionDate ?? '';

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Trade summary</h2>
      <dl className="space-y-3">
        <div>
          <dt className="type-xs text-gray-500">Trades reported, 119th Congress</dt>
          <dd className="type-xl font-semibold text-black">{trades.length.toLocaleString()}</dd>
        </div>
        <div className="flex gap-grid-3">
          <div>
            <dt className="type-xs text-gray-500">Purchases</dt>
            <dd className="type-lg font-semibold text-black">{purchases.toLocaleString()}</dd>
          </div>
          <div>
            <dt className="type-xs text-gray-500">Sales</dt>
            <dd className="type-lg font-semibold text-black">{sales.toLocaleString()}</dd>
          </div>
        </div>
        <div>
          <dt className="type-xs text-gray-500">Filings</dt>
          <dd className="type-sm text-black">{filings.toLocaleString()} reports</dd>
        </div>
        <div>
          <dt className="type-xs text-gray-500">Most recent trade</dt>
          <dd className="type-sm text-black">{formatDate(latest)}</dd>
        </div>
      </dl>
    </div>
  );
}

function MostTradedPod({ trades }: Readonly<{ trades: StockTrade[] }>) {
  if (!trades.length) return null;

  const counts = new Map<string, { label: string; count: number }>();
  for (const trade of trades) {
    const key = trade.ticker ?? trade.assetDescription;
    const entry = counts.get(key) ?? { label: assetLabel(trade), count: 0 };
    entry.count++;
    counts.set(key, entry);
  }
  const top = [...counts.values()].sort((a, b) => b.count - a.count).slice(0, TOP_ASSETS_LIMIT);

  return (
    <div className="border-2 border-black bg-white p-4 sm:p-6">
      <h2 className="type-sm font-semibold text-black mb-3">Most traded</h2>
      <ul className="divide-y divide-gray-200">
        {top.map(asset => (
          <li
            key={asset.label}
            className="py-2 first:pt-0 last:pb-0 flex justify-between items-baseline gap-3"
          >
            <span className="type-sm text-gray-900 truncate">{asset.label}</span>
            <span className="type-xs font-medium text-gray-600 shrink-0">
              {asset.count} {asset.count === 1 ? 'trade' : 'trades'}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SourcesPod({ chamber }: Readonly<{ chamber: 'House' | 'Senate' }>) {
  const official =
    chamber === 'Senate'
      ? { href: 'https://efdsearch.senate.gov', label: 'Senate eFD' }
      : { href: 'https://disclosures-clerk.house.gov', label: 'House Clerk' };

  return (
    <div className="border-2 border-gray-300 bg-white p-4 sm:p-6 lg:col-span-2">
      <p className="type-xs text-gray-500">
        Under the STOCK Act of 2012, members of Congress must report trades worth more than $1,000
        within 45 days. Reports give a value range, not an exact amount. Filings from the{' '}
        <a href={official.href} className="text-[#3ea2d4] hover:underline">
          {official.label}
        </a>
        , compiled by{' '}
        <a
          href="https://github.com/kadoa-org/congress-trading-monitor"
          className="text-[#3ea2d4] hover:underline"
        >
          Congress Trading Monitor
        </a>
        .{' '}
        <Link href="/glossary/stock-act" className="text-[#3ea2d4] hover:underline">
          What is the STOCK Act?
        </Link>{' '}
        <Link href="/methodology" className="text-[#3ea2d4] hover:underline">
          Full methodology
        </Link>
      </p>
    </div>
  );
}

export function StockTradesAnswer(props: Readonly<StockTradesAnswerProps>) {
  return (
    <>
      <TradeSummaryPod trades={props.trades} />
      <MostTradedPod trades={props.trades} />
      <RecentTradesPod {...props} />
      <SourcesPod chamber={props.chamber} />
    </>
  );
}

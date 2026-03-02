/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { TrendingUp, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { DataSourceAttribution, DATA_SOURCES } from '@/components/shared/ui/DataSourceAttribution';
import type { StockTradeResponse, StockTrade } from '@/types/stock-trades';
import { useState } from 'react';

interface StockTradesSectionProps {
  bioguideId: string;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status}`);
  }
  return res.json();
};

const SHOW_INITIALLY = 10;

/**
 * STOCK Act Disclosures Section
 *
 * Displays congressional stock trades from Periodic Transaction Reports
 * filed with the U.S. House Office of the Clerk. SWR-fetched independently.
 */
export function StockTradesSection({ bioguideId }: StockTradesSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const { data, error, isLoading, mutate } = useSWR<StockTradeResponse>(
    `/api/representative/${bioguideId}/stock-trades`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  if (isLoading) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          STOCK Act Disclosures
        </h4>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 w-1/2"></div>
          <div className="h-16 bg-gray-200"></div>
          <div className="h-16 bg-gray-200"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-2 border-black p-6 mt-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
          STOCK Act Disclosures
        </h4>
        <div className="text-center py-6">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-3" aria-hidden="true" />
          <p className="text-gray-600 font-medium">Failed to load stock trade disclosures</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">
            Shows securities transactions reported under the STOCK Act
          </p>
          <button
            onClick={() => mutate()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-civiq-blue hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
            aria-label="Retry loading stock trade data"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.trades.length === 0) {
    // Show empty state with explanation rather than hiding completely
    if (data?.metadata?.note) {
      return (
        <div className="bg-white border-2 border-black p-6 mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
            STOCK Act Disclosures
          </h4>
          <p className="text-sm text-gray-500">{data.metadata.note}</p>
        </div>
      );
    }
    return null;
  }

  const trades = data.trades;
  const displayedTrades = showAll ? trades : trades.slice(0, SHOW_INITIALLY);
  const hasMore = trades.length > SHOW_INITIALLY;

  return (
    <div className="bg-white border-2 border-black p-6 mt-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-civiq-blue" aria-hidden="true" />
        STOCK Act Disclosures
      </h4>
      <p className="text-sm text-gray-600 mb-4">
        Securities transactions reported under the STOCK Act of 2012
        {data.metadata.coveragePeriod && ` (${data.metadata.coveragePeriod})`}
      </p>

      {/* Trade count summary */}
      <div className="mb-4 text-sm text-gray-500">
        {trades.length} transaction{trades.length !== 1 ? 's' : ''} across{' '}
        {data.metadata.totalFilings} filing{data.metadata.totalFilings !== 1 ? 's' : ''}
      </div>

      {/* Trades table */}
      <div className="overflow-x-auto -mx-6 sm:mx-0">
        <div className="inline-block min-w-full align-middle px-6 sm:px-0">
          <table className="min-w-full" role="table" aria-label="Stock trade disclosures">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Date
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Asset
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Type
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Owner
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Filing
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayedTrades.map((trade, index) => (
                <TradeRow
                  key={`${trade.filingId}-${trade.assetDescription}-${index}`}
                  trade={trade}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progressive disclosure */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-civiq-blue hover:underline focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
          >
            {showAll ? 'Show fewer' : `Show all ${trades.length} transactions`}
          </button>
        </div>
      )}

      <DataSourceAttribution
        {...DATA_SOURCES.HOUSE_CLERK}
        lastUpdated={data.metadata.lastUpdated}
        variant="compact"
        className="mt-4"
      />
    </div>
  );
}

/** Single trade row component */
function TradeRow({ trade }: { trade: StockTrade }) {
  const formattedDate = formatTradeDate(trade.transactionDate);
  const isSale = trade.transactionType.startsWith('Sale');
  const isPurchase = trade.transactionType === 'Purchase';

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formattedDate}</td>
      <td className="px-3 py-2 text-sm text-gray-900">
        <div className="max-w-xs">
          <span>{trade.assetDescription}</span>
          {trade.ticker && (
            <span className="ml-1 text-xs text-gray-500 font-mono">({trade.ticker})</span>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <span
          className={`inline-block px-2 py-0.5 text-xs font-medium ${
            isPurchase
              ? 'bg-green-100 text-green-800'
              : isSale
                ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800'
          }`}
        >
          {trade.transactionType}
        </span>
      </td>
      <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap font-mono">
        {trade.amount}
      </td>
      <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap">{trade.owner}</td>
      <td className="px-3 py-2 text-sm whitespace-nowrap">
        <a
          href={trade.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-civiq-blue hover:underline"
          aria-label={`View official filing ${trade.filingId}`}
        >
          PDF
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </td>
    </tr>
  );
}

function formatTradeDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

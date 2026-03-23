/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

'use client';

import useSWR from 'swr';
import { TrendingUp, AlertCircle, RefreshCw, ExternalLink } from 'lucide-react';
import { DataSourceAttribution, DATA_SOURCES } from '@/components/shared/ui/DataSourceAttribution';
import { StockTradeSummary } from '@/components/intelligence/StockTradeSummary';
import type { StockTradeResponse, StockTrade } from '@/types/stock-trades';
import { useMemo, useState } from 'react';

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

type TxnFilter = 'All' | 'Purchase' | 'Sale';
type OwnerFilter = 'All' | 'Self' | 'Spouse' | 'Joint' | 'Dependent Child';
type SortOption = 'date' | 'late';

/**
 * STOCK Act Disclosures Section
 *
 * Displays congressional stock trades from Periodic Transaction Reports
 * filed with the U.S. House Office of the Clerk. SWR-fetched independently.
 */
export function StockTradesSection({ bioguideId }: StockTradesSectionProps) {
  const [showAll, setShowAll] = useState(false);
  const [txnFilter, setTxnFilter] = useState<TxnFilter>('All');
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('date');

  const { data, error, isLoading, mutate } = useSWR<StockTradeResponse>(
    `/api/representative/${bioguideId}/stock-trades`,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000,
    }
  );

  // Compute available years from trade data
  const availableYears = useMemo(() => {
    if (!data?.trades) return [];
    const years = new Set<string>();
    for (const t of data.trades) {
      if (!t.isPaperFiling && t.transactionDate) {
        const y = t.transactionDate.slice(0, 4);
        if (y) years.add(y);
      }
    }
    return [...years].sort().reverse();
  }, [data?.trades]);

  // Compute available owners from trade data
  const availableOwners = useMemo(() => {
    if (!data?.trades) return [];
    const owners = new Set<string>();
    for (const t of data.trades) {
      if (!t.isPaperFiling) owners.add(t.owner);
    }
    return [...owners].sort();
  }, [data?.trades]);

  // Filter + sort trades
  const filteredTrades = useMemo(() => {
    if (!data?.trades) return [];
    let trades = data.trades.filter(t => !t.isPaperFiling);

    if (txnFilter !== 'All') {
      trades = trades.filter(t =>
        txnFilter === 'Sale'
          ? t.transactionType.startsWith('Sale')
          : t.transactionType === txnFilter
      );
    }
    if (ownerFilter !== 'All') {
      trades = trades.filter(t => t.owner === ownerFilter);
    }
    if (yearFilter !== 'All') {
      trades = trades.filter(t => t.transactionDate.startsWith(yearFilter));
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      trades = trades.filter(
        t => t.ticker?.toLowerCase().includes(q) || t.assetDescription.toLowerCase().includes(q)
      );
    }

    if (sortBy === 'late') {
      trades = [...trades].sort((a, b) => b.daysToDisclose - a.daysToDisclose);
    }
    // Default sort is by date descending (already sorted from API)

    return trades;
  }, [data?.trades, txnFilter, ownerFilter, yearFilter, search, sortBy]);

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

  const paperFilings = data.trades.filter(t => t.isPaperFiling);
  const allTrades = data.trades.filter(t => !t.isPaperFiling);
  const displayedTrades = showAll ? filteredTrades : filteredTrades.slice(0, SHOW_INITIALLY);
  const hasMore = filteredTrades.length > SHOW_INITIALLY;
  const hasActiveFilters =
    txnFilter !== 'All' || ownerFilter !== 'All' || yearFilter !== 'All' || search.trim() !== '';

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

      {/* Paper filing notice */}
      {paperFilings.length > 0 && (
        <div className="mb-4 border-2 border-gray-300 bg-gray-50 p-4">
          <p className="text-sm font-medium text-gray-700 mb-1">
            Paper Filing{paperFilings.length > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-gray-500 mb-2">
            This member files paper disclosures. Individual trades cannot be extracted
            automatically. View the original filing for details.
          </p>
          <div className="flex flex-wrap gap-2">
            {paperFilings.map(pf => (
              <a
                key={pf.filingId}
                href={pf.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-civiq-blue hover:underline"
                aria-label={`View paper filing ${pf.filingId}`}
              >
                Filing {pf.filingId}
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Summary card */}
      <StockTradeSummary trades={allTrades} totalFilings={data.metadata.totalFilings} />

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <FilterSelect
          label="Type"
          value={txnFilter}
          options={['All', 'Purchase', 'Sale']}
          onChange={v => setTxnFilter(v as TxnFilter)}
        />
        {availableOwners.length > 1 && (
          <FilterSelect
            label="Owner"
            value={ownerFilter}
            options={['All', ...availableOwners]}
            onChange={v => setOwnerFilter(v as OwnerFilter)}
          />
        )}
        {availableYears.length > 1 && (
          <FilterSelect
            label="Year"
            value={yearFilter}
            options={['All', ...availableYears]}
            onChange={v => setYearFilter(v)}
          />
        )}
        <FilterSelect
          label="Sort"
          value={sortBy === 'late' ? 'Late filings first' : 'Date'}
          options={['Date', 'Late filings first']}
          onChange={v => setSortBy(v === 'Late filings first' ? 'late' : 'date')}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ticker or asset"
          className="border-2 border-gray-300 px-2 py-1 text-sm focus:outline-none focus:border-civiq-blue"
          aria-label="Search trades by ticker or asset name"
        />
        {hasActiveFilters && (
          <button
            onClick={() => {
              setTxnFilter('All');
              setOwnerFilter('All');
              setYearFilter('All');
              setSearch('');
              setSortBy('date');
            }}
            className="text-xs text-civiq-blue hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Result count */}
      <div className="mb-2 text-sm text-gray-500">
        {hasActiveFilters
          ? `${filteredTrades.length} of ${allTrades.length} transactions`
          : `${allTrades.length} transaction${allTrades.length !== 1 ? 's' : ''}`}
      </div>

      {/* Trades table */}
      {filteredTrades.length > 0 ? (
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
                    Filed
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Source
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
      ) : (
        <p className="text-sm text-gray-500 py-4">No transactions match the current filters.</p>
      )}

      {/* Progressive disclosure */}
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-civiq-blue hover:underline focus:outline-none focus:ring-2 focus:ring-civiq-blue focus:ring-offset-2"
          >
            {showAll ? 'Show fewer' : `Show all ${filteredTrades.length} transactions`}
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

/** Compact filter dropdown */
function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="inline-flex items-center gap-1 text-xs text-gray-500">
      {label}
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="border-2 border-gray-300 px-1 py-1 text-sm text-gray-900 bg-white focus:outline-none focus:border-civiq-blue"
      >
        {options.map(o => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Single trade row component */
function TradeRow({ trade }: { trade: StockTrade }) {
  const formattedDate = formatTradeDate(trade.transactionDate);
  const isSale = trade.transactionType.startsWith('Sale');
  const isPurchase = trade.transactionType === 'Purchase';
  const isLate = trade.isLateFiling;

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-3 py-2 text-sm text-gray-900 whitespace-nowrap">{formattedDate}</td>
      <td className="px-3 py-2 text-sm text-gray-900">
        <div className="max-w-xs">
          <span>{trade.assetDescription}</span>
          {trade.ticker && (
            <span className="ml-1 text-xs text-gray-500 font-mono">({trade.ticker})</span>
          )}
          <span className="ml-1 text-xs text-gray-400">{trade.assetTypeLabel}</span>
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
        <span
          className={isLate ? 'text-[#e11d07] font-medium' : 'text-gray-600'}
          aria-label={
            isLate
              ? `Filed ${trade.daysToDisclose} days after transaction, exceeding the 45-day STOCK Act deadline`
              : `Filed ${trade.daysToDisclose} days after transaction`
          }
        >
          {trade.daysToDisclose > 0 ? `${trade.daysToDisclose}d` : '--'}
        </span>
      </td>
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

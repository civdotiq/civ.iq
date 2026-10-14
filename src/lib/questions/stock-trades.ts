/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Data for the stock-trades question page (/ask/stock-trades/[bioguideId]).
 *
 * Trades come from Congress Trading Monitor (STOCK Act periodic transaction
 * reports, both chambers) and are limited to the 119th Congress — CIV.IQ
 * serves the current Congress only. Kept out of template-data-fetchers so the
 * sitemap can import it without pulling in the analyzer chain.
 */

import { cache } from 'react';
import { cachedFetch } from '@/lib/cache';
import { circuitBreakers } from '@/lib/circuit-breaker';
import { congressTradingMonitor } from '@/lib/data-sources/senate-disclosure-service';
import { CONGRESS_SESSIONS } from '@/lib/data/congressional-constants';
import type { StockTrade } from '@/types/stock-trades';

/** First day of the 119th Congress; earlier trades are out of scope. */
export const STOCK_TRADES_SINCE = CONGRESS_SESSIONS[119].startDate;

export interface StockTradesData {
  /** 119th-Congress transactions, newest first. */
  trades: StockTrade[];
  /** True when the upstream could not be reached — distinct from "no filings". */
  unavailable: boolean;
}

/** Keep trades made on or after the start of the 119th Congress. */
export function currentCongressTrades(trades: StockTrade[]): StockTrade[] {
  return trades.filter(t => t.transactionDate >= STOCK_TRADES_SINCE);
}

/**
 * Per-request memoized so generateMetadata (noindex decision) and the page
 * share one lookup.
 */
export const fetchStockTradesData = cache(async function fetchStockTradesData(
  bioguideId: string,
  chamber: 'House' | 'Senate'
): Promise<StockTradesData> {
  try {
    const trades = await circuitBreakers.senateStockWatcher.execute(() =>
      chamber === 'Senate'
        ? congressTradingMonitor.getTradesForMember(bioguideId)
        : congressTradingMonitor.getTradesForRepresentative(bioguideId)
    );
    return { trades: currentCongressTrades(trades), unavailable: false };
  } catch {
    return { trades: [], unavailable: true };
  }
});

export interface MembersWithStockTrades {
  house: string[];
  senate: string[];
}

/**
 * Bioguide IDs of members with at least one 119th-Congress trade, per chamber.
 * Used by the sitemap so it lists only stock-trades pages that have content
 * (pages without trades are noindexed). One Redis read when warm; the cold
 * path reads every filer file, each cached individually for 24 hours.
 */
export async function getMembersWithStockTrades(): Promise<MembersWithStockTrades> {
  return cachedFetch(
    'question:stock-trades:members:119:v1',
    async () => {
      const [senate, house] = await Promise.all([
        congressTradingMonitor.getAllSenatorTrades(),
        congressTradingMonitor.getAllRepresentativeTrades(),
      ]);
      const withTrades = (byMember: Map<string, StockTrade[]>): string[] =>
        [...byMember]
          .filter(([, trades]) => currentCongressTrades(trades).length > 0)
          .map(([id]) => id)
          .sort();
      return { house: withTrades(house), senate: withTrades(senate) };
    },
    6 * 60 * 60, // 6 hours (seconds)
    members => members.house.length > 0 && members.senate.length > 0
  );
}

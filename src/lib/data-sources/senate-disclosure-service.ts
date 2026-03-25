/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Senate Financial Disclosure Service
 *
 * Fetches pre-parsed STOCK Act Periodic Transaction Reports (PTRs)
 * for U.S. Senators from the Senate Stock Watcher open-source dataset.
 *
 * Data source: Senate Stock Watcher (GitHub)
 * Original records: Senate Office of Public Records electronic financial disclosures (eFD)
 *
 * @see {@link https://github.com/timothycarambat/senate-stock-watcher-data}
 * @see {@link https://efdsearch.senate.gov}
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type { StockTrade } from '@/types/stock-trades';

const DATA_URL =
  'https://raw.githubusercontent.com/timothycarambat/senate-stock-watcher-data/master/aggregate/all_transactions_for_senators.json';

/** Senate Stock Watcher transaction shape */
interface SswTransaction {
  transaction_date: string;
  owner: string;
  ticker: string;
  asset_description: string;
  asset_type: string;
  type: string;
  amount: string;
  comment: string;
  ptr_link: string;
}

/** Senate Stock Watcher senator-grouped entry */
interface SswSenator {
  first_name: string;
  last_name: string;
  office: string;
  ptr_link: string;
  date_recieved: string; // Typo in source data
  bioguide: string;
  transactions: SswTransaction[];
}

/** Map Senate free-text asset types to House 2-letter codes */
const SENATE_ASSET_TYPE_MAP: Record<string, string> = {
  Stock: 'ST',
  'Stock Option': 'OP',
  'Municipal Security': 'GS',
  'Corporate Bond': 'CS',
  'Other Securities': 'OT',
  'Non-Public Stock': 'PS',
  'PDF Disclosed Filing': 'OT',
};

/** Map Senate free-text asset types to human-readable labels */
const SENATE_ASSET_LABEL_MAP: Record<string, string> = {
  Stock: 'Stock',
  'Stock Option': 'Stock Options',
  'Municipal Security': 'Municipal Security',
  'Corporate Bond': 'Corporate Bond',
  'Other Securities': 'Other Securities',
  'Non-Public Stock': 'Non-Public Stock',
  'PDF Disclosed Filing': 'Paper Filing',
};

/**
 * Strip HTML tags from a string.
 * Senate Stock Watcher data sometimes contains anchor tags around tickers
 * and div/em tags in asset descriptions.
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract a filing ID from a Senate eFD ptr_link URL.
 * Looks for UUID pattern; falls back to a hash of the URL.
 */
function extractFilingId(ptrLink: string): string {
  const uuidMatch = ptrLink.match(
    /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
  );
  if (uuidMatch) return uuidMatch[1]!;

  // Deterministic fallback: use last path segment or hash of URL
  const segments = ptrLink.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? ptrLink.slice(-32);
}

/**
 * Parse MM/DD/YYYY to ISO date string (YYYY-MM-DD).
 */
function parseDate(dateStr: string): string {
  const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return `${year ?? '0000'}-${(month ?? '01').padStart(2, '0')}-${(day ?? '01').padStart(2, '0')}`;
  }
  return dateStr;
}

/**
 * Compute calendar days between transaction date and filing date.
 */
function computeDaysToDisclose(transactionDate: string, filingDate: string): number {
  const txn = new Date(transactionDate + 'T00:00:00');
  const filed = new Date(filingDate + 'T00:00:00');
  if (isNaN(txn.getTime()) || isNaN(filed.getTime())) return 0;
  const diffMs = filed.getTime() - txn.getTime();
  return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Map a Senate owner string to the StockTrade owner format.
 */
function mapOwner(owner: string): string {
  switch (owner) {
    case 'Self':
      return 'Self';
    case 'Spouse':
      return 'Spouse';
    case 'Joint':
      return 'Joint';
    case 'Child':
      return 'Dependent Child';
    case 'N/A':
    default:
      return 'Self';
  }
}

/**
 * Map a Senate transaction type to the StockTrade format.
 */
function mapTransactionType(type: string): string {
  switch (type) {
    case 'Purchase':
      return 'Purchase';
    case 'Sale (Full)':
      return 'Sale (Full)';
    case 'Sale (Partial)':
      return 'Sale (Partial)';
    case 'Exchange':
      return 'Exchange';
    case 'N/A':
    default:
      return 'Purchase';
  }
}

export class SenateDisclosureService {
  /**
   * Fetch all senator data from the Senate Stock Watcher aggregate file.
   * Cached for 24 hours.
   */
  private async fetchAllSenatorData(): Promise<SswSenator[]> {
    return cachedFetch(
      'senate-stock-watcher:all-senators',
      async () => {
        logger.info('Fetching Senate Stock Watcher aggregate data');

        const response = await fetch(DATA_URL, {
          headers: { 'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)' },
        });

        if (!response.ok) {
          throw new Error(
            `Senate Stock Watcher returned ${response.status}: ${response.statusText}`
          );
        }

        const data = (await response.json()) as SswSenator[];

        logger.info('Fetched Senate Stock Watcher data', {
          senatorCount: data.length,
          totalTransactions: data.reduce((sum, s) => sum + (s.transactions?.length ?? 0), 0),
        });

        return data;
      },
      86400 // 24 hours
    );
  }

  /**
   * Convert a Senate Stock Watcher transaction to a StockTrade.
   */
  private mapTransaction(
    txn: SswTransaction,
    bioguideId: string,
    senator: SswSenator
  ): StockTrade {
    const rawTicker = stripHtml(txn.ticker);
    const ticker = rawTicker === '--' || rawTicker === '' ? null : rawTicker;
    const assetDescription = stripHtml(txn.asset_description);
    const assetType = SENATE_ASSET_TYPE_MAP[txn.asset_type] ?? 'OT';
    const assetTypeLabel = SENATE_ASSET_LABEL_MAP[txn.asset_type] ?? (txn.asset_type || 'Other');
    const isPaperFiling = txn.asset_type === 'PDF Disclosed Filing' || txn.type === 'N/A';

    const transactionDate = parseDate(txn.transaction_date);
    const filingDate = parseDate(senator.date_recieved);
    const daysToDisclose = computeDaysToDisclose(transactionDate, filingDate);

    return {
      filingId: extractFilingId(txn.ptr_link || senator.ptr_link),
      bioguideId,
      memberName: `${senator.first_name} ${senator.last_name}`.trim(),
      stateDistrict: '', // Resolved by caller
      owner: mapOwner(txn.owner),
      assetDescription: assetDescription || 'Unknown Asset',
      ticker,
      assetType,
      assetTypeLabel,
      transactionType: mapTransactionType(txn.type),
      transactionDate,
      filingDate,
      amount: txn.amount === 'Unknown' ? '$0 - $0' : txn.amount,
      capitalGainsOver200: false, // Not reported in Senate data
      isPaperFiling,
      daysToDisclose,
      isLateFiling: daysToDisclose > 45,
      sourceUrl: txn.ptr_link || senator.ptr_link,
    };
  }

  /**
   * Get all stock trades for a specific Senator by bioguide ID.
   */
  async getTradesForMember(bioguideId: string): Promise<StockTrade[]> {
    return cachedFetch(
      `senate-stock-trades:${bioguideId}`,
      async () => {
        const senators = await this.fetchAllSenatorData();

        const senator = senators.find(
          s => s.bioguide?.toUpperCase() === bioguideId.toUpperCase()
        );

        if (!senator || !senator.transactions?.length) {
          logger.info('No Senate Stock Watcher data for member', { bioguideId });
          return [];
        }

        const trades = senator.transactions.map(txn =>
          this.mapTransaction(txn, bioguideId, senator)
        );

        // Filter out fully empty paper filing entries (type=N/A, amount=Unknown)
        // but keep them flagged as paper filings
        const validTrades = trades.filter(
          t => !t.isPaperFiling || t.ticker !== null
        );

        // Deduplicate by filing + asset + date
        const seen = new Set<string>();
        const deduped = validTrades.filter(trade => {
          const key = `${trade.filingId}:${trade.assetDescription}:${trade.transactionDate}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Sort by transaction date descending
        return deduped.sort(
          (a, b) =>
            new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
      },
      86400 // 24 hours
    );
  }

  /**
   * Get all senator trades grouped by bioguide ID.
   * Uses the bulk dataset (single cached fetch), much faster than per-member calls.
   */
  async getAllSenatorTrades(): Promise<Map<string, StockTrade[]>> {
    const senators = await this.fetchAllSenatorData();
    const result = new Map<string, StockTrade[]>();

    for (const senator of senators) {
      const bioguideId = senator.bioguide?.toUpperCase();
      if (!bioguideId || !senator.transactions?.length) continue;

      const trades = senator.transactions
        .map(txn => this.mapTransaction(txn, bioguideId, senator))
        .filter(t => !t.isPaperFiling || t.ticker !== null);

      // Deduplicate by filing + asset + date
      const seen = new Set<string>();
      const deduped = trades.filter(trade => {
        const key = `${trade.filingId}:${trade.assetDescription}:${trade.transactionDate}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      if (deduped.length > 0) {
        result.set(bioguideId, deduped);
      }
    }

    return result;
  }

  /**
   * Check if a bioguide ID has data in the Senate Stock Watcher dataset.
   */
  async hasMemberData(bioguideId: string): Promise<boolean> {
    try {
      const senators = await this.fetchAllSenatorData();
      return senators.some(
        s => s.bioguide?.toUpperCase() === bioguideId.toUpperCase()
      );
    } catch {
      return false;
    }
  }
}

export const senateDisclosureService = new SenateDisclosureService();

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Congress Trading Monitor Service
 *
 * Fetches pre-parsed STOCK Act Periodic Transaction Reports (PTRs) for
 * members of Congress from the Congress Trading Monitor open dataset
 * (MIT-licensed, refreshed daily). Serves BOTH chambers: Senate records
 * derive from the Senate eFD system, House records from the House Clerk.
 *
 * Replaced Senate Stock Watcher 2026-07: that dataset's last commit was
 * 2021-03-16, silently freezing Senate coverage at early 2021. Replaced
 * the in-house House Clerk PDF parser 2026-07: CTM parses the same House
 * filings daily at scale, so we consume its pre-parsed output instead of
 * running a brittle PDF pipeline. CTM covers electronic filings from 2015
 * to present; pre-2015 paper filings are not included. Every trade retains
 * its primary-source document link (efdsearch.senate.gov or
 * disclosures-clerk.house.gov).
 *
 * Note: CTM is cross-branch — it also carries OGE executive-branch filers.
 * We filter strictly on `filer.chamber` ('senate' | 'house'); never widen
 * this to include non-Congress filers.
 *
 * The historical export name `senateDisclosureService` is kept as an alias
 * for back-compat; new House call sites should use `congressTradingMonitor`.
 *
 * @see {@link https://github.com/kadoa-org/congress-trading-monitor}
 * @see {@link https://efdsearch.senate.gov}
 * @see {@link https://disclosures-clerk.house.gov}
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { ASSET_TYPE_CODES } from '@/types/stock-trades';
import type { StockTrade } from '@/types/stock-trades';

/** Chamber discriminator for Congress Trading Monitor filer records */
type Chamber = 'senate' | 'house';

const BASE_URL =
  'https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data';

/** Concurrency for per-filer fetches in bulk loads */
const BULK_FETCH_CONCURRENCY = 6;

/** Congress Trading Monitor filer index entry (filers.json) */
interface CtmFiler {
  id: string;
  full_name: string;
  chamber: string | null;
  party: string | null;
  state: string | null;
  photo_url: string | null;
}

/** Congress Trading Monitor transaction (filer/{id}.json trades[]) */
interface CtmTrade {
  id: string;
  filing_id: string | null;
  transaction_date: string;
  filing_date: string | null;
  owner: string | null;
  ticker: string | null;
  asset_name: string | null;
  asset_type: string | null;
  transaction_type: string | null;
  amount_range_label: string | null;
  doc_url: string | null;
  filing_type: string | null;
}

/** Per-filer file shape */
interface CtmFilerFile {
  filer: CtmFiler;
  trades: CtmTrade[];
}

/** Map Senate free-text asset types to House 2-letter codes */
const SENATE_ASSET_TYPE_MAP: Record<string, string> = {
  Stock: 'ST',
  'Stock Option': 'OP',
  'Municipal Security': 'GS',
  'Corporate Bond': 'CS',
  'Exchange Traded Fund': 'EF',
  'Exchange-Traded Fund': 'EF',
  'Mutual Fund': 'MF',
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
  'Exchange Traded Fund': 'Exchange-Traded Fund',
  'Exchange-Traded Fund': 'Exchange-Traded Fund',
  'Mutual Fund': 'Mutual Fund',
  'Other Securities': 'Other Securities',
  'Non-Public Stock': 'Non-Public Stock',
  'PDF Disclosed Filing': 'Paper Filing',
};

/**
 * Strip HTML tags from a string. Defensive: upstream data has carried
 * anchor/div tags around tickers and asset names before.
 */
function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract the bioguide ID from a unitedstates.github.io photo URL
 * (e.g., .../congress/225x275/C001047.jpg -> C001047).
 */
function extractBioguideFromPhotoUrl(photoUrl: string | null): string | null {
  if (!photoUrl) return null;
  const match = photoUrl.match(/\/([A-Z]\d{6})\.(?:jpg|jpeg|png)/i);
  return match ? match[1]!.toUpperCase() : null;
}

/**
 * Extract a filing ID from a Senate eFD doc_url.
 * Looks for UUID pattern; falls back to the dataset's filing_id.
 */
function extractFilingId(docUrl: string | null, filingId: string | null, rowId: string): string {
  if (docUrl) {
    const uuidMatch = docUrl.match(
      /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i
    );
    if (uuidMatch) return uuidMatch[1]!;
  }
  if (filingId) return filingId.replace(/^senate_/, '');
  return rowId;
}

/**
 * Parse MM/DD/YYYY to ISO date string (YYYY-MM-DD).
 * Congress Trading Monitor dates are already ISO and pass through unchanged.
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
 * Map a Congress Trading Monitor owner value to the StockTrade owner format.
 * Senate records use free text ("Joint"); House records use 2-letter codes
 * ("JT"). Both normalize to the same word form.
 */
function mapOwner(owner: string): string {
  switch (owner.toUpperCase()) {
    case 'SELF':
    case 'SE':
      return 'Self';
    case 'SPOUSE':
    case 'SP':
      return 'Spouse';
    case 'JOINT':
    case 'JT':
      return 'Joint';
    case 'CHILD':
    case 'DC':
      return 'Dependent Child';
    case 'N/A':
    case '':
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
   * Fetch the filer index for one chamber, keyed by bioguide ID.
   * The bioguide ID is extracted from each filer's unitedstates.github.io
   * photo URL; filers without one are skipped (never guessed by name).
   * The `chamber` filter also excludes CTM's OGE executive-branch filers.
   * Cached for 24 hours.
   */
  private async fetchFilerIndex(chamber: Chamber): Promise<Record<string, CtmFiler>> {
    // Namespace kept as `senate-trades:` for continuity with the health-probe
    // cacheKeyPattern; the per-chamber suffix keeps House and Senate separate.
    return cachedFetch(
      `senate-trades:filer-index:${chamber}`,
      async () => {
        logger.info('Fetching Congress Trading Monitor filer index', { chamber });

        const response = await fetch(`${BASE_URL}/filers.json`, {
          headers: { 'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)' },
        });

        if (!response.ok) {
          throw new Error(
            `Congress Trading Monitor returned ${response.status}: ${response.statusText}`
          );
        }

        const filers = (await response.json()) as CtmFiler[];
        const index: Record<string, CtmFiler> = {};
        let skipped = 0;

        for (const filer of filers) {
          if (filer.chamber !== chamber) continue;
          const bioguideId = extractBioguideFromPhotoUrl(filer.photo_url);
          if (!bioguideId) {
            skipped++;
            logger.warn('Congress Trading Monitor filer has no resolvable bioguide ID, skipping', {
              chamber,
              filerId: filer.id,
              name: filer.full_name,
            });
            continue;
          }
          index[bioguideId] = filer;
        }

        logger.info('Built Congress Trading Monitor filer index', {
          chamber,
          members: Object.keys(index).length,
          skipped,
        });

        return index;
      },
      86400 // 24 hours
    );
  }

  /**
   * Fetch all trades for one filer. Cached for 24 hours
   * (upstream dataset refreshes daily).
   */
  private async fetchFilerTrades(filerId: string): Promise<CtmTrade[]> {
    return cachedFetch(
      `senate-trades:filer:${filerId}`,
      async () => {
        const response = await fetch(`${BASE_URL}/filer/${filerId}.json`, {
          headers: { 'User-Agent': 'CIV.IQ/1.0 (Civic Information Platform)' },
        });

        if (!response.ok) {
          throw new Error(
            `Congress Trading Monitor returned ${response.status}: ${response.statusText}`
          );
        }

        const data = (await response.json()) as CtmFilerFile;
        return data.trades ?? [];
      },
      86400 // 24 hours
    );
  }

  /**
   * Convert a Congress Trading Monitor transaction to a StockTrade.
   */
  private mapTransaction(txn: CtmTrade, bioguideId: string, filer: CtmFiler): StockTrade {
    const rawTicker = stripHtml(txn.ticker ?? '');
    const ticker = rawTicker === '--' || rawTicker === '' ? null : rawTicker;
    const assetDescription = stripHtml(txn.asset_name ?? '');
    const assetTypeRaw = txn.asset_type ?? '';
    // House CTM records already use canonical 2-letter codes (ST, OP, OT);
    // Senate records use free text ("Stock"). Pass native codes through,
    // otherwise map the free-text label to a code.
    const isNativeCode = assetTypeRaw in ASSET_TYPE_CODES;
    const assetType = isNativeCode ? assetTypeRaw : (SENATE_ASSET_TYPE_MAP[assetTypeRaw] ?? 'OT');
    const assetTypeLabel = isNativeCode
      ? (ASSET_TYPE_CODES[assetType] ?? assetType)
      : (SENATE_ASSET_LABEL_MAP[assetTypeRaw] ?? (assetTypeRaw || 'Other'));
    const isPaperFiling = assetTypeRaw === 'PDF Disclosed Filing' || txn.transaction_type === 'N/A';

    const transactionDate = parseDate(txn.transaction_date);
    const filingDate = txn.filing_date ? parseDate(txn.filing_date) : '';
    const daysToDisclose = filingDate ? computeDaysToDisclose(transactionDate, filingDate) : 0;

    return {
      filingId: extractFilingId(txn.doc_url, txn.filing_id, txn.id),
      bioguideId,
      memberName: filer.full_name,
      stateDistrict: '', // Resolved by caller
      owner: mapOwner(txn.owner ?? ''),
      assetDescription: assetDescription || 'Unknown Asset',
      ticker,
      assetType,
      assetTypeLabel,
      transactionType: mapTransactionType(txn.transaction_type ?? ''),
      transactionDate,
      filingDate,
      amount: txn.amount_range_label || '$0 - $0',
      capitalGainsOver200: false, // Not reported in Senate data
      isPaperFiling,
      daysToDisclose,
      isLateFiling: daysToDisclose > 45,
      sourceUrl: txn.doc_url ?? '',
    };
  }

  /**
   * Map, filter, and sort a filer's raw transactions into StockTrades.
   */
  private buildTrades(rawTrades: CtmTrade[], bioguideId: string, filer: CtmFiler): StockTrade[] {
    // Deduplicate by the dataset's unique row ID
    const seen = new Set<string>();
    const unique = rawTrades.filter(txn => {
      if (seen.has(txn.id)) return false;
      seen.add(txn.id);
      return true;
    });

    return unique
      .map(txn => this.mapTransaction(txn, bioguideId, filer))
      .filter(t => !t.isPaperFiling || t.ticker !== null)
      .sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
      );
  }

  /**
   * Get all stock trades for one member (either chamber) by bioguide ID.
   */
  private async getTradesForMemberInChamber(
    bioguideId: string,
    chamber: Chamber
  ): Promise<StockTrade[]> {
    const index = await this.fetchFilerIndex(chamber);
    const normalizedId = bioguideId.toUpperCase();
    const filer = index[normalizedId];

    if (!filer) {
      logger.info('No Congress Trading Monitor data for member', { bioguideId, chamber });
      return [];
    }

    const rawTrades = await this.fetchFilerTrades(filer.id);
    return this.buildTrades(rawTrades, normalizedId, filer);
  }

  /**
   * Get all stock trades for a specific Senator by bioguide ID.
   */
  async getTradesForMember(bioguideId: string): Promise<StockTrade[]> {
    return this.getTradesForMemberInChamber(bioguideId, 'senate');
  }

  /**
   * Get all stock trades for a specific Representative by bioguide ID.
   */
  async getTradesForRepresentative(bioguideId: string): Promise<StockTrade[]> {
    return this.getTradesForMemberInChamber(bioguideId, 'house');
  }

  /**
   * Get all trades for one chamber grouped by bioguide ID.
   * Fetches per-filer files with bounded concurrency; each file is
   * individually cached, so repeat calls are cheap.
   */
  private async getAllTradesForChamber(chamber: Chamber): Promise<Map<string, StockTrade[]>> {
    const index = await this.fetchFilerIndex(chamber);
    const entries = Object.entries(index);
    const result = new Map<string, StockTrade[]>();

    for (let i = 0; i < entries.length; i += BULK_FETCH_CONCURRENCY) {
      const batch = entries.slice(i, i + BULK_FETCH_CONCURRENCY);
      await Promise.all(
        batch.map(async ([bioguideId, filer]) => {
          try {
            const rawTrades = await this.fetchFilerTrades(filer.id);
            const trades = this.buildTrades(rawTrades, bioguideId, filer);
            if (trades.length > 0) {
              result.set(bioguideId, trades);
            }
          } catch (error) {
            logger.warn('Failed to fetch filer trades, skipping', {
              filerId: filer.id,
              bioguideId,
              error: (error as Error).message,
            });
          }
        })
      );
    }

    return result;
  }

  /**
   * Get all senator trades grouped by bioguide ID.
   */
  async getAllSenatorTrades(): Promise<Map<string, StockTrade[]>> {
    return this.getAllTradesForChamber('senate');
  }

  /**
   * Get all representative trades grouped by bioguide ID.
   */
  async getAllRepresentativeTrades(): Promise<Map<string, StockTrade[]>> {
    return this.getAllTradesForChamber('house');
  }

  /**
   * Check if a bioguide ID has Senate data in the Congress Trading Monitor dataset.
   */
  async hasMemberData(bioguideId: string): Promise<boolean> {
    try {
      const index = await this.fetchFilerIndex('senate');
      return bioguideId.toUpperCase() in index;
    } catch {
      return false;
    }
  }
}

/**
 * Congress Trading Monitor client for both chambers. Prefer this name at new
 * call sites; `senateDisclosureService` is kept as a back-compat alias.
 */
export const congressTradingMonitor = new SenateDisclosureService();

/** @deprecated Use {@link congressTradingMonitor}. Kept for existing Senate call sites. */
export const senateDisclosureService = congressTradingMonitor;

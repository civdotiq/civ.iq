/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * House Financial Disclosure Service
 *
 * Fetches and parses STOCK Act Periodic Transaction Reports (PTRs)
 * from the U.S. House Office of the Clerk.
 *
 * Data sources:
 * - XML index: https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YEAR}FD.ZIP
 * - PTR PDFs: https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/{YEAR}/{DocID}.pdf
 *
 * @see {@link https://disclosures-clerk.house.gov}
 */

import JSZip from 'jszip';
// Import the lib directly to avoid pdf-parse's index.js which tries to read a test PDF at import time
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>;
import { XMLParser } from 'fast-xml-parser';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import type { StockTrade, HouseClerkFiling } from '@/types/stock-trades';

const BASE_URL = 'https://disclosures-clerk.house.gov';
const USER_AGENT = 'CIV.IQ/1.0 (Civic Information Platform)';

/** In-memory cache for name→bioguide resolution (refreshes with service) */
let memberLookupCache: Map<string, { bioguideId: string; name: string }> | null = null;
let memberLookupTimestamp = 0;
const MEMBER_LOOKUP_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class HouseDisclosureService {
  /**
   * Fetch and parse the annual XML index of financial disclosure filings.
   * Returns only PTR (Periodic Transaction Report) entries.
   */
  async fetchFilingIndex(year: number): Promise<HouseClerkFiling[]> {
    const cacheKey = `house-disclosure-index:${year}`;

    return cachedFetch(
      cacheKey,
      async () => {
        const url = `${BASE_URL}/public_disc/financial-pdfs/${year}FD.ZIP`;

        logger.info('Fetching House financial disclosure index', { year, url });

        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
        });

        if (!response.ok) {
          throw new Error(`House Clerk ZIP returned ${response.status}: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);

        // Find the XML file inside the ZIP
        const xmlFileName = Object.keys(zip.files).find(
          name => name.endsWith('.xml') || name.endsWith('.XML')
        );

        if (!xmlFileName) {
          throw new Error('No XML file found in House Clerk ZIP');
        }

        const xmlContent = await zip.files[xmlFileName]!.async('string');

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '',
        });
        const parsed = parser.parse(xmlContent);

        // The XML structure varies — handle both array and single-item cases
        const members =
          parsed?.FinancialDisclosure?.Member || parsed?.['financial-disclosure']?.member || [];
        const memberArray = Array.isArray(members) ? members : [members];

        const filings: HouseClerkFiling[] = memberArray
          .filter((m: Record<string, unknown>) => m && m.FilingType === 'P')
          .map((m: Record<string, unknown>) => ({
            first: String(m.First || m.first || ''),
            last: String(m.Last || m.last || ''),
            filingType: String(m.FilingType || m.filingType || ''),
            stateDst: String(m.StateDst || m.stateDst || ''),
            year: String(m.Year || m.year || year),
            filingDate: String(m.FilingDate || m.filingDate || ''),
            docId: String(m.DocID || m.docID || m.docId || ''),
          }));

        logger.info('Parsed House disclosure index', {
          year,
          totalEntries: memberArray.length,
          ptrEntries: filings.length,
        });

        return filings;
      },
      86400 // 24 hours in seconds
    );
  }

  /**
   * Fetch and parse a single PTR PDF into structured trade data.
   */
  async parsePtrPdf(docId: string, year: number, filing: HouseClerkFiling): Promise<StockTrade[]> {
    const cacheKey = `house-disclosure-ptr:${docId}`;

    return cachedFetch(
      cacheKey,
      async () => {
        const url = `${BASE_URL}/public_disc/ptr-pdfs/${year}/${docId}.pdf`;

        logger.info('Fetching PTR PDF', { docId, year, url });

        const response = await fetch(url, {
          headers: { 'User-Agent': USER_AGENT },
        });

        if (!response.ok) {
          logger.warn('PTR PDF not available', { docId, status: response.status });
          return [];
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        const pdf = await pdfParse(buffer);
        const text = pdf.text;

        return this.extractTradesFromText(text, docId, year, filing, url);
      },
      604800 // 7 days in seconds — filed PDFs never change
    );
  }

  /**
   * Extract structured trade data from PTR PDF text.
   *
   * House PTR PDFs follow a standardized tabular format:
   * - Each transaction row contains: owner, asset, type, date, amount, cap gains
   * - Amounts are ranges (e.g., "$1,001 - $15,000")
   * - Dates are MM/DD/YYYY
   */
  private extractTradesFromText(
    text: string,
    docId: string,
    year: number,
    filing: HouseClerkFiling,
    sourceUrl: string
  ): StockTrade[] {
    const trades: StockTrade[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Common amount range patterns in STOCK Act filings
    const amountPattern = /\$[\d,]+ - \$[\d,]+|\$[\d,]+\+/;
    const tickerPattern = /\(([A-Z]{1,5})\)/;

    // Transaction type indicators
    const transactionTypeMap: Record<string, string> = {
      'P': 'Purchase',
      'S': 'Sale',
      'S (Full)': 'Sale (Full)',
      'S (Partial)': 'Sale (Partial)',
      'E': 'Exchange',
    };

    // Owner abbreviation mapping
    const ownerMap: Record<string, string> = {
      'SP': 'Spouse',
      'JT': 'Joint',
      'DC': 'Dependent Child',
    };

    // Track whether we've found the transactions section
    let inTransactions = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? '';

      // Detect start of transactions section
      if (
        line.includes('Transaction') ||
        line.includes('TRANSACTIONS') ||
        line.includes('Asset')
      ) {
        inTransactions = true;
        continue;
      }

      if (!inTransactions) continue;

      // Skip header/separator lines
      if (line.startsWith('---') || line.startsWith('===')) continue;

      // Try to extract an amount range — if present, this line likely contains trade data
      const amountMatch = line.match(amountPattern);
      if (!amountMatch) continue;

      // Extract dates from this line and surrounding context
      const dates: string[] = [];
      const contextWindow = [lines[i - 1] ?? '', line, lines[i + 1] ?? ''].join(' ');
      const dateMatches = contextWindow.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g);
      for (const dm of dateMatches) {
        dates.push(dm[1]!);
      }

      // Extract ticker symbol
      const tickerMatch = contextWindow.match(tickerPattern);
      const ticker = tickerMatch?.[1] ?? null;

      // Determine transaction type
      let transactionType = 'Purchase';
      for (const [abbrev, fullType] of Object.entries(transactionTypeMap)) {
        if (line.includes(abbrev) || contextWindow.includes(fullType)) {
          transactionType = fullType;
          break;
        }
      }
      // More specific: look for Sale indicators
      if (contextWindow.match(/\bS\b/) || contextWindow.includes('Sale')) {
        transactionType = 'Sale';
        if (contextWindow.includes('Full') || contextWindow.includes('(Full)')) {
          transactionType = 'Sale (Full)';
        } else if (contextWindow.includes('Partial') || contextWindow.includes('(Partial)')) {
          transactionType = 'Sale (Partial)';
        }
      }
      if (contextWindow.match(/\bP\b/) || contextWindow.includes('Purchase')) {
        transactionType = 'Purchase';
      }

      // Determine owner
      let owner = 'Self';
      for (const [abbrev, fullOwner] of Object.entries(ownerMap)) {
        if (line.includes(abbrev)) {
          owner = fullOwner;
          break;
        }
      }

      // Extract asset description — text before the amount, cleaned up
      const amountIndex = line.indexOf(amountMatch[0]);
      let assetDescription = line.substring(0, amountIndex).trim();
      // Remove owner abbreviations and transaction types from asset description
      assetDescription = assetDescription
        .replace(/^(SP|JT|DC)\s+/i, '')
        .replace(/\s+(P|S|E)\s*$/, '')
        .trim();

      // If asset description is too short, look at preceding line
      if (assetDescription.length < 5 && i > 0) {
        assetDescription = (lines[i - 1] ?? '').trim();
      }

      // Extract asset type from brackets [ST], [OP], [BD], etc.
      const assetTypeMatch = contextWindow.match(/\[([A-Z]{2})\]/);
      const assetType = assetTypeMatch?.[1] ?? 'ST';

      // Parse transaction date
      const transactionDate = dates[0]
        ? this.parseDate(dates[0])
        : `${year}-01-01`;

      // Parse filing date
      const filingDate = filing.filingDate
        ? this.parseDate(filing.filingDate)
        : `${year}-01-01`;

      // Capital gains indicator
      const capitalGainsOver200 =
        contextWindow.includes('Yes') ||
        contextWindow.includes('$200') ||
        contextWindow.includes('cap. gains');

      trades.push({
        filingId: docId,
        bioguideId: '', // Resolved later
        memberName: `${filing.first} ${filing.last}`,
        stateDistrict: filing.stateDst,
        owner,
        assetDescription: assetDescription || 'Unknown Asset',
        ticker,
        assetType,
        transactionType,
        transactionDate,
        filingDate,
        amount: amountMatch[0],
        capitalGainsOver200,
        sourceUrl,
      });
    }

    logger.info('Extracted trades from PTR PDF', {
      docId,
      tradeCount: trades.length,
      member: `${filing.first} ${filing.last}`,
    });

    return trades;
  }

  /**
   * Parse MM/DD/YYYY to ISO date string.
   */
  private parseDate(dateStr: string): string {
    // Handle MM/DD/YYYY format
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, month, day, year] = match;
      return `${year}-${month!.padStart(2, '0')}-${day!.padStart(2, '0')}`;
    }
    return dateStr;
  }

  /**
   * Build a lookup map: "{lastName}:{stateDistrict}" → { bioguideId, name }
   * Uses the RepresentativesCoreService to avoid HTTP self-calls.
   */
  async buildMemberLookup(): Promise<Map<string, { bioguideId: string; name: string }>> {
    const now = Date.now();
    if (memberLookupCache && now - memberLookupTimestamp < MEMBER_LOOKUP_TTL) {
      return memberLookupCache;
    }

    const reps = await RepresentativesCoreService.getAllRepresentatives();
    const lookup = new Map<string, { bioguideId: string; name: string }>();

    for (const rep of reps) {
      if (rep.chamber !== 'House') continue;

      const stateDistrict = rep.district
        ? `${rep.state}${rep.district.padStart(2, '0')}`
        : `${rep.state}00`;

      // Primary key: "LastName:StateDistrict" (e.g., "Pelosi:CA11")
      const key = `${rep.lastName.toUpperCase()}:${stateDistrict}`;
      lookup.set(key, { bioguideId: rep.bioguideId, name: rep.name });

      // Also index by just last name + state for at-large districts
      const stateKey = `${rep.lastName.toUpperCase()}:${rep.state}`;
      if (!lookup.has(stateKey)) {
        lookup.set(stateKey, { bioguideId: rep.bioguideId, name: rep.name });
      }
    }

    memberLookupCache = lookup;
    memberLookupTimestamp = now;

    logger.info('Built member lookup cache', { entries: lookup.size });
    return lookup;
  }

  /**
   * Resolve a filing's name + state/district to a bioguide ID.
   */
  async resolveBioguideId(filing: HouseClerkFiling): Promise<string | null> {
    const lookup = await this.buildMemberLookup();
    const lastName = filing.last.toUpperCase();
    const stateDst = filing.stateDst;

    // Try exact match: "PELOSI:CA11"
    const exactKey = `${lastName}:${stateDst}`;
    if (lookup.has(exactKey)) {
      return lookup.get(exactKey)!.bioguideId;
    }

    // Try state-only match for at-large: "PELOSI:CA"
    const state = stateDst.replace(/\d+$/, '');
    const stateKey = `${lastName}:${state}`;
    if (lookup.has(stateKey)) {
      return lookup.get(stateKey)!.bioguideId;
    }

    logger.warn('Could not resolve bioguide ID for filing', {
      last: filing.last,
      first: filing.first,
      stateDst: filing.stateDst,
    });
    return null;
  }

  /**
   * Get all stock trades for a specific representative.
   */
  async getTradesForMember(bioguideId: string): Promise<StockTrade[]> {
    const cacheKey = `stock-trades:${bioguideId}`;

    return cachedFetch(
      cacheKey,
      async () => {
        const currentYear = new Date().getFullYear();
        const years = [currentYear - 1, currentYear];
        const allTrades: StockTrade[] = [];

        for (const year of years) {
          try {
            const filings = await this.fetchFilingIndex(year);

            // Filter filings for this member
            const memberFilings = filings.filter(f => {
              const resolved = this.resolveBioguideIdSync(f);
              return resolved === bioguideId;
            });

            // Parse each filing's PDF
            for (const filing of memberFilings) {
              const trades = await this.parsePtrPdf(filing.docId, year, filing);
              const tradesWithBioguide = trades.map(t => ({
                ...t,
                bioguideId,
              }));
              allTrades.push(...tradesWithBioguide);
            }
          } catch (error) {
            logger.error('Error fetching trades for year', error as Error, {
              bioguideId,
              year,
            });
          }
        }

        // Deduplicate by filingId + asset + transactionDate
        const seen = new Set<string>();
        const deduped = allTrades.filter(trade => {
          const key = `${trade.filingId}:${trade.assetDescription}:${trade.transactionDate}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // Sort by transaction date descending
        return deduped.sort(
          (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        );
      },
      21600 // 6 hours in seconds
    );
  }

  /**
   * Synchronous bioguide resolution using the cached lookup.
   * Returns null if the lookup hasn't been built yet.
   */
  private resolveBioguideIdSync(filing: HouseClerkFiling): string | null {
    if (!memberLookupCache) return null;

    const lastName = filing.last.toUpperCase();
    const stateDst = filing.stateDst;

    const exactKey = `${lastName}:${stateDst}`;
    if (memberLookupCache.has(exactKey)) {
      return memberLookupCache.get(exactKey)!.bioguideId;
    }

    const state = stateDst.replace(/\d+$/, '');
    const stateKey = `${lastName}:${state}`;
    if (memberLookupCache.has(stateKey)) {
      return memberLookupCache.get(stateKey)!.bioguideId;
    }

    return null;
  }

  /**
   * Get filings for a specific member by bioguide ID from the XML index.
   * Ensures the member lookup is initialized before filtering.
   */
  async getFilingsForMember(bioguideId: string): Promise<{ filing: HouseClerkFiling; year: number }[]> {
    // Ensure lookup is built
    await this.buildMemberLookup();

    const currentYear = new Date().getFullYear();
    const years = [currentYear - 1, currentYear];
    const results: { filing: HouseClerkFiling; year: number }[] = [];

    for (const year of years) {
      try {
        const filings = await this.fetchFilingIndex(year);
        for (const filing of filings) {
          const resolved = this.resolveBioguideIdSync(filing);
          if (resolved === bioguideId) {
            results.push({ filing, year });
          }
        }
      } catch (error) {
        logger.error('Error fetching filing index', error as Error, { year });
      }
    }

    return results;
  }
}

export const houseDisclosureService = new HouseDisclosureService();

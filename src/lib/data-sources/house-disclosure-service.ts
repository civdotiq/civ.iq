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
import { ASSET_TYPE_CODES } from '@/types/stock-trades';

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

        // 1e: Detect image-based (scanned paper) PDFs — pdf-parse returns near-empty text
        if (text.trim().length < 50 && pdf.numpages > 0) {
          logger.info('Detected paper filing (image-based PDF)', { docId, textLength: text.trim().length });
          return [{
            filingId: docId,
            bioguideId: '',
            memberName: `${filing.first} ${filing.last}`,
            stateDistrict: filing.stateDst,
            owner: 'Self',
            assetDescription: 'Paper filing — view original disclosure',
            ticker: null,
            assetType: 'OT',
            assetTypeLabel: 'Other',
            transactionType: 'Purchase',
            transactionDate: filing.filingDate ? this.parseDate(filing.filingDate) : `${year}-01-01`,
            filingDate: filing.filingDate ? this.parseDate(filing.filingDate) : `${year}-01-01`,
            amount: '$0 - $0',
            capitalGainsOver200: false,
            isPaperFiling: true,
            sourceUrl: url,
          }];
        }

        return this.extractTradesFromText(text, docId, year, filing, url);
      },
      604800 // 7 days in seconds — filed PDFs never change
    );
  }

  /**
   * Extract structured trade data from PTR PDF text.
   *
   * House PTR PDFs use a standardized STOCK Act tabular format with
   * "IDOwnerAsset" headers repeating on each page. The text from pdf-parse
   * contains null bytes (\x00) instead of spaces in certain delimiter fields.
   *
   * Parsing strategy:
   * 1. Extract transaction sections between IDOwnerAsset headers and page footers
   * 2. Strip orphaned SubOwner lines that cross page boundaries
   * 3. Split each section on "F S : {status}" Filing Status delimiters
   * 4. Parse each resulting block for owner, asset, ticker, type, dates, amount
   */
  private extractTradesFromText(
    text: string,
    docId: string,
    year: number,
    filing: HouseClerkFiling,
    sourceUrl: string
  ): StockTrade[] {
    const trades: StockTrade[] = [];

    // Normalize null bytes to spaces for consistent regex matching
    const normalized = text.replace(/\x00/g, ' ');

    // Find all "IDOwnerAsset" table header positions (one per page)
    const headerRe = /IDOwnerAsset/g;
    let match: RegExpExecArray | null;
    const headerPositions: number[] = [];
    while ((match = headerRe.exec(normalized)) !== null) {
      headerPositions.push(match.index);
    }

    if (headerPositions.length === 0) {
      logger.warn('No IDOwnerAsset headers found in PTR PDF', { docId });
      return [];
    }

    // Extract transaction sections — bounded by next header to prevent overlap
    const sections: string[] = [];
    for (let i = 0; i < headerPositions.length; i++) {
      const hPos = headerPositions[i]!;
      const headerEnd = normalized.indexOf('\n', hPos);
      if (headerEnd < 0) continue;

      // Skip past the cap gains header line ($200?)
      let startPos = headerEnd;
      const afterHeader = normalized.slice(headerEnd, headerEnd + 100);
      const gainsEnd = afterHeader.indexOf('$200?');
      if (gainsEnd >= 0) {
        startPos = headerEnd + gainsEnd + 5;
        const nl = normalized.indexOf('\n', startPos);
        if (nl >= 0) startPos = nl;
      }

      // End: next header position or page footer pattern
      let endPos = i + 1 < headerPositions.length
        ? headerPositions[i + 1]!
        : normalized.length;

      for (const ep of [/\* For the complete list/, /Filing ID #/, /A {3,}C {3,}D/]) {
        const idx = normalized.slice(startPos).search(ep);
        if (idx >= 0 && (startPos + idx) < endPos) {
          endPos = startPos + idx;
        }
      }

      sections.push(normalized.slice(startPos, endPos));
    }

    let txnText = sections.join('\n');

    // Strip orphaned SubOwner lines (ones at page boundaries not preceded by F S)
    txnText = txnText.replace(/^S\s{2,}O\s*:[^\n]*\n/gm, (substr, offset) => {
      const before = txnText.lastIndexOf('\n', offset - 1);
      const prevLine = before >= 0 ? txnText.slice(before + 1, offset) : '';
      if (/^F\s{2,}S\s{2,}/.test(prevLine)) {
        return substr; // Keep — part of F S + S O sequence consumed by split
      }
      return ''; // Remove orphan
    });

    // Split on Filing Status lines + optional Description/SubOwner lines
    // F      S     : {status}
    // D          : {description}     (optional)
    // S          O : {subowner}      (optional, O may have single space before colon)
    const blocks = txnText.split(
      /\nF\s{2,}S\s{2,}[^\n]*(?:\nD\s{2,}[^\n]*)?(?:\nS\s{2,}O\s*:[^\n]*)?\n?/
    );

    const filingDate = filing.filingDate
      ? this.parseDate(filing.filingDate)
      : `${year}-01-01`;

    for (let block of blocks) {
      // 1a: Strip leading D: and S O: artifact lines from page-boundary bleeds
      // These appear when a page break occurs mid-trade and the D:/S O: lines
      // from the previous trade spill into the start of the next block
      block = block.replace(/^(?:D\s{2,}:[^\n]*\n)+/, '');
      block = block.replace(/^(?:S\s{2,}O\s*:[^\n]*\n)+/, '');

      // Must have a dollar amount range to be a trade
      const amountMatch = block.match(/(\$[\d,]+)\s*-\s*(\$[\d,]+)/);
      if (!amountMatch) continue;
      const amount = `${amountMatch[1]} - ${amountMatch[2]}`;

      // Dates: MM/DD/YYYY (transaction date, then notification date)
      const dates = [...block.matchAll(/(\d{2}\/\d{2}\/\d{4})/g)].map(m => m[1]!);
      if (dates.length === 0) continue;

      // Ticker: uppercase letters in parentheses, e.g. (AVGO)
      const tickerMatch = block.match(/\(([A-Z]{1,6})\)/);
      const ticker = tickerMatch ? tickerMatch[1]! : null;

      // Asset type: two uppercase letters in brackets, e.g. [ST], [OP]
      const assetTypeMatch = block.match(/\[([A-Z]{2})\]/);
      const assetType = assetTypeMatch ? assetTypeMatch[1]! : 'ST';
      const assetTypeLabel = ASSET_TYPE_CODES[assetType] ?? assetType;

      // 1c: Transaction type — anchored to the [XX] asset type bracket on the cleaned block
      let transactionType = 'Purchase';
      const txnMatch = block.match(/\[[A-Z]{2}\][\s\n]*(S \(partial\)|S \(full\)|S|P|E)/);
      if (txnMatch) {
        const t = txnMatch[1]!;
        if (t === 'P') transactionType = 'Purchase';
        else if (t === 'S') transactionType = 'Sale';
        else if (t === 'S (full)') transactionType = 'Sale (Full)';
        else if (t === 'S (partial)') transactionType = 'Sale (Partial)';
        else if (t === 'E') transactionType = 'Exchange';
      }

      // 1b: Owner detection — run on the cleaned block (after D: stripping)
      const trimmed = block.replace(/^[\s\n]+/, '');
      let owner = 'Self';
      let ownerLen = 0;
      if (/^SP[A-Z]/.test(trimmed)) { owner = 'Spouse'; ownerLen = 2; }
      else if (/^JT[A-Z]/.test(trimmed)) { owner = 'Joint'; ownerLen = 2; }
      else if (/^DC[A-Z]/.test(trimmed)) { owner = 'Dependent Child'; ownerLen = 2; }
      // Fallback: scan first line for owner prefix anywhere (page-boundary artifacts)
      if (owner === 'Self' && ownerLen === 0) {
        const firstLine = trimmed.split('\n')[0] ?? '';
        if (/SP[A-Z]/.test(firstLine)) { owner = 'Spouse'; }
        else if (/JT[A-Z]/.test(firstLine)) { owner = 'Joint'; }
        else if (/DC[A-Z]/.test(firstLine)) { owner = 'Dependent Child'; }
      }

      // Asset description: text between owner prefix and ticker/bracket
      const afterOwner = trimmed.slice(ownerLen);
      let assetDescription = '';
      if (ticker) {
        const tickerStr = '(' + ticker + ')';
        const tickerIdx = afterOwner.indexOf(tickerStr);
        if (tickerIdx > 0) {
          assetDescription = afterOwner.slice(0, tickerIdx).trim()
            .replace(/\n/g, ' ').replace(/\s+/g, ' ');
        }
      }
      if (!assetDescription && assetTypeMatch) {
        const bracketIdx = afterOwner.indexOf('[');
        if (bracketIdx > 0) {
          let raw = afterOwner.slice(0, bracketIdx);
          raw = raw.replace(/\([^)]*\)\s*$/, '');
          assetDescription = raw.trim().replace(/\n/g, ' ').replace(/\s+/g, ' ');
        }
      }

      // Don't confuse ticker with asset type code (e.g. AB stock vs AB=Asset-Backed)
      const resolvedTicker = ticker && ticker === assetType && ASSET_TYPE_CODES[ticker]
        ? null
        : ticker;

      trades.push({
        filingId: docId,
        bioguideId: '', // Resolved later
        memberName: `${filing.first} ${filing.last}`,
        stateDistrict: filing.stateDst,
        owner,
        assetDescription: assetDescription || 'Unknown Asset',
        ticker: resolvedTicker,
        assetType,
        assetTypeLabel,
        transactionType,
        transactionDate: this.parseDate(dates[0]!),
        filingDate,
        amount,
        capitalGainsOver200: false, // Not reliably extractable from text
        isPaperFiling: false,
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
        // Build member lookup before filtering (sync resolver needs the cache)
        await this.buildMemberLookup();

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

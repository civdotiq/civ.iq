/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * House Annual Financial Disclosure Service
 *
 * Fetches the U.S. House Office of the Clerk's annual financial disclosure
 * filings (FilingType 'A') — metadata + primary-source PDF links.
 *
 * Scope note: STOCK Act *trade* data (Periodic Transaction Reports) is no
 * longer parsed here. As of 2026-07, House trades come from the Congress
 * Trading Monitor dataset via `congressTradingMonitor` in
 * `senate-disclosure-service.ts` — the same pre-parsed, daily-refreshed,
 * freshness-monitored source used for the Senate. This service retains only
 * the annual-disclosure index, which CTM does not cover.
 *
 * Data source:
 * - XML index: https://disclosures-clerk.house.gov/public_disc/financial-pdfs/{YEAR}FD.ZIP
 *
 * @see {@link https://disclosures-clerk.house.gov}
 */

import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import type { HouseClerkFiling, AnnualDisclosure } from '@/types/stock-trades';

const BASE_URL = 'https://disclosures-clerk.house.gov';
const USER_AGENT = 'CIV.IQ/1.0 (Civic Information Platform)';

/** Number of years back to search for filings (current year + N-1 prior years) */
const COVERAGE_YEARS = 5;

/** In-memory cache for name→bioguide resolution (refreshes with service) */
let memberLookupCache: Map<string, { bioguideId: string; name: string }> | null = null;
let memberLookupTimestamp = 0;
const MEMBER_LOOKUP_TTL = 24 * 60 * 60 * 1000; // 24 hours

export class HouseDisclosureService {
  /**
   * Fetch and parse the full annual XML index of financial disclosure filings.
   * Returns all filing types (PTR, Annual, Amendment, etc.).
   */
  private async fetchFullFilingIndex(year: number): Promise<HouseClerkFiling[]> {
    const cacheKey = `house-disclosure-full-index:${year}`;

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
          .filter((m: Record<string, unknown>) => m)
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
        });

        return filings;
      },
      86400 // 24 hours in seconds
    );
  }

  /**
   * Parse MM/DD/YYYY to ISO date string.
   */
  private parseDate(dateStr: string): string {
    // Handle MM/DD/YYYY format
    const match = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, month, day, year] = match;
      return `${year ?? '0000'}-${(month ?? '01').padStart(2, '0')}-${(day ?? '01').padStart(2, '0')}`;
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
   * Get the array of years to search for filings.
   */
  private getCoverageYears(): number[] {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: COVERAGE_YEARS }, (_, i) => currentYear - i).reverse();
  }

  /**
   * Get annual financial disclosure filings for a member (FilingType 'A').
   * Returns metadata + PDF links — does not parse PDF contents.
   */
  async getAnnualDisclosuresForMember(bioguideId: string): Promise<AnnualDisclosure[]> {
    const cacheKey = `annual-disclosures:${bioguideId}`;

    return cachedFetch(
      cacheKey,
      async () => {
        await this.buildMemberLookup();

        const years = this.getCoverageYears();
        const results: AnnualDisclosure[] = [];

        for (const year of years) {
          try {
            const allFilings = await this.fetchFullFilingIndex(year);
            const annualFilings = allFilings.filter(f => f.filingType === 'A');

            for (const filing of annualFilings) {
              const resolved = this.resolveBioguideIdSync(filing);
              if (resolved === bioguideId) {
                results.push({
                  docId: filing.docId,
                  year: Number(filing.year) || year,
                  filingDate: filing.filingDate
                    ? this.parseDate(filing.filingDate)
                    : `${year}-01-01`,
                  pdfUrl: `${BASE_URL}/public_disc/financial-pdfs/${year}/${filing.docId}.pdf`,
                });
              }
            }
          } catch (error) {
            logger.error('Error fetching annual disclosures for year', error as Error, {
              bioguideId,
              year,
            });
          }
        }

        // Sort by year descending
        return results.sort((a, b) => b.year - a.year);
      },
      21600 // 6 hours in seconds
    );
  }
}

export const houseDisclosureService = new HouseDisclosureService();

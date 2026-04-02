/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  SecCompanyProfile,
  SecFiling,
  SecSearchResult,
  SecCompanyFacts,
} from '@/types/sec-edgar';

const DATA_BASE_URL = 'https://data.sec.gov';
const SEARCH_BASE_URL = 'https://efts.sec.gov/LATEST';

const USER_AGENT = 'civiq/1.0 (contact@civ.iq)';

// SEC rate limit: 10 req/s — simple delay between requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 120; // ~8 req/s to stay safely under limit

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  return fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
  });
}

/**
 * Pad CIK to 10 digits as required by SEC EDGAR API
 */
function padCik(cik: string): string {
  return cik.replace(/^0+/, '').padStart(10, '0');
}

export class SecEdgarService {
  /**
   * Fetch company profile by CIK number
   */
  async fetchCompanyProfile(cik: string): Promise<SecCompanyProfile | null> {
    const paddedCik = padCik(cik);
    const cacheKey = `sec-company:${paddedCik}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${DATA_BASE_URL}/submissions/CIK${paddedCik}.json`;
          logger.info('Fetching SEC company profile', { cik: paddedCik });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) {
              logger.warn('SEC company not found', { cik: paddedCik });
              return null;
            }
            throw new Error(`SEC EDGAR API returned ${response.status}`);
          }

          const data = await response.json();
          const recentFilings = data.filings?.recent;

          return {
            cik: String(data.cik),
            entityType: data.entityType ?? '',
            sic: data.sic ?? '',
            sicDescription: data.sicDescription ?? '',
            name: data.name ?? '',
            tickers: data.tickers ?? [],
            exchanges: data.exchanges ?? [],
            ein: data.ein ?? '',
            category: data.category ?? '',
            stateOfIncorporation: data.stateOfIncorporation ?? '',
            fiscalYearEnd: data.fiscalYearEnd ?? '',
            filings: recentFilings
              ? {
                  recent: {
                    accessionNumber: recentFilings.accessionNumber ?? [],
                    filingDate: recentFilings.filingDate ?? [],
                    reportDate: recentFilings.reportDate ?? [],
                    form: recentFilings.form ?? [],
                    primaryDocument: recentFilings.primaryDocument ?? [],
                    primaryDocDescription: recentFilings.primaryDocDescription ?? [],
                  },
                }
              : undefined,
          } as SecCompanyProfile;
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('Failed to fetch SEC company profile', error as Error, { cik });
      return null;
    }
  }

  /**
   * Extract Form 4 filings from a company's recent filings
   */
  async fetchForm4Filings(cik: string): Promise<SecFiling[]> {
    const profile = await this.fetchCompanyProfile(cik);
    if (!profile?.filings?.recent) return [];

    const recent = profile.filings.recent;
    const form4Filings: SecFiling[] = [];

    for (let i = 0; i < recent.form.length; i++) {
      if (recent.form[i] === '4' || recent.form[i] === '4/A') {
        form4Filings.push({
          accessionNumber: recent.accessionNumber[i] ?? '',
          filingDate: recent.filingDate[i] ?? '',
          reportDate: recent.reportDate[i] ?? '',
          form: recent.form[i] ?? '',
          primaryDocument: recent.primaryDocument[i] ?? '',
          description: recent.primaryDocDescription[i] ?? '',
        });
      }
    }

    return form4Filings;
  }

  /**
   * Search EDGAR full-text search for filings
   */
  async searchFilings(query: string, formType?: string): Promise<SecSearchResult> {
    const cacheKey = `sec-search:${query}:${formType ?? 'all'}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const params = new URLSearchParams({
            q: query,
            dateRange: 'custom',
            startdt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] ?? '',
            enddt: new Date().toISOString().split('T')[0] ?? '',
          });
          if (formType) {
            params.set('forms', formType);
          }

          const url = `${SEARCH_BASE_URL}/search-index?${params.toString()}`;
          logger.info('Searching SEC EDGAR', { query, formType });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`SEC EDGAR search returned ${response.status}`);
          }

          const data = await response.json();
          const hits = (data.hits?.hits ?? []).map(
            (hit: {
              _id: string;
              _source: {
                file_num?: string;
                period_of_report?: string;
                entity_name?: string;
                file_date?: string;
                form_type?: string;
              };
            }) => ({
              id: hit._id,
              accessionNumber: hit._id,
              fileDate: hit._source?.file_date ?? '',
              formType: hit._source?.form_type ?? '',
              entityName: hit._source?.entity_name ?? '',
              fileNumber: hit._source?.file_num ?? '',
              periodOfReport: hit._source?.period_of_report ?? '',
            })
          );

          return {
            query,
            hits,
            total: data.hits?.total?.value ?? hits.length,
            totalIsApproximate: data.hits?.total?.relation === 'gte',
          } as SecSearchResult;
        },
        1800 // 30 minutes
      );
    } catch (error) {
      logger.error('SEC EDGAR search failed', error as Error, { query });
      return { query, hits: [], total: 0 };
    }
  }

  /**
   * Fetch XBRL financial facts for a company
   */
  async fetchFinancialFacts(cik: string): Promise<SecCompanyFacts | null> {
    const paddedCik = padCik(cik);
    const cacheKey = `sec-facts:${paddedCik}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${DATA_BASE_URL}/api/xbrl/companyfacts/CIK${paddedCik}.json`;
          logger.info('Fetching SEC company facts', { cik: paddedCik });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`SEC EDGAR companyfacts returned ${response.status}`);
          }

          return (await response.json()) as SecCompanyFacts;
        },
        3600 // 1 hour — financial facts update quarterly
      );
    } catch (error) {
      logger.error('Failed to fetch SEC company facts', error as Error, { cik });
      return null;
    }
  }

  /**
   * Search for a company CIK by ticker symbol
   */
  async findCikByTicker(ticker: string): Promise<string | null> {
    const cacheKey = `sec-ticker-cik:${ticker.toUpperCase()}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const tickersUrl = 'https://www.sec.gov/files/company_tickers.json';
          logger.info('Looking up CIK for ticker', { ticker });

          const response = await rateLimitedFetch(tickersUrl);
          if (!response.ok) {
            throw new Error(`SEC tickers lookup returned ${response.status}`);
          }

          const tickers = (await response.json()) as Record<
            string,
            { cik_str: number; ticker: string; title: string }
          >;
          const upperTicker = ticker.toUpperCase();

          for (const entry of Object.values(tickers)) {
            if (entry.ticker === upperTicker) {
              return String(entry.cik_str);
            }
          }

          return null;
        },
        86400 // 24 hours — ticker-CIK mapping is very stable
      );
    } catch (error) {
      logger.error('Failed to find CIK for ticker', error as Error, { ticker });
      return null;
    }
  }
}

export const secEdgarService = new SecEdgarService();

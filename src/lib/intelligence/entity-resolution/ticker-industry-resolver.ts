/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Ticker-to-Industry Resolver
 *
 * Resolves stock tickers from House Clerk disclosure filings to
 * IndustrySector using SEC EDGAR data + SIC code mapping.
 *
 * Flow: ticker → CIK (static lookup) → SIC code (SEC API, cached) → IndustrySector
 *
 * ETFs, mutual funds, and unresolvable tickers return null.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { sicToSector } from './sic-sector-map';
import type { TickerResolution } from '../types';

// Static ticker → CIK mapping from SEC EDGAR company_tickers.json
// ~10K entries, ~155KB
import tickerCikMap from './sec-sic-data.json';

/** SIC code cache TTL: 30 days (SIC codes rarely change) */
const SIC_CACHE_TTL = 30 * 24 * 60 * 60;

/** SEC EDGAR submissions API base URL */
const SEC_SUBMISSIONS_URL = 'https://data.sec.gov/submissions';

/** SEC requires a User-Agent header identifying the requester */
const SEC_USER_AGENT = 'CIV.IQ civic-intel-hub/1.0 (civdotiq.org)';

/**
 * Known ETF/fund tickers that should return null (no single sector).
 * This is not exhaustive — the resolver also returns null for tickers
 * not found in the SEC company data.
 */
const KNOWN_FUNDS = new Set([
  'SPY',
  'QQQ',
  'IWM',
  'DIA',
  'VTI',
  'VOO',
  'VEA',
  'VWO',
  'EFA',
  'AGG',
  'BND',
  'TLT',
  'GLD',
  'SLV',
  'USO',
  'XLF',
  'XLE',
  'XLK',
  'XLV',
  'XLI',
  'XLP',
  'XLY',
  'XLB',
  'XLU',
  'XLRE',
  'XLC',
  'ARKK',
  'ARKW',
  'ARKG',
  'ARKF',
  'ARKQ',
]);

/**
 * Resolve a stock ticker to an IndustrySector.
 *
 * Returns null for ETFs, mutual funds, and tickers that can't be resolved.
 * Uses Redis caching for SEC API responses (30-day TTL).
 */
export async function resolveTickerIndustry(ticker: string): Promise<TickerResolution | null> {
  const normalizedTicker = ticker.toUpperCase().trim();

  if (!normalizedTicker) {
    return null;
  }

  // Skip known funds/ETFs
  if (KNOWN_FUNDS.has(normalizedTicker)) {
    return null;
  }

  // Check Redis cache first
  const cacheKey = `ticker-sic:${normalizedTicker}`;
  try {
    const cached = await getRedisCache().get<TickerResolution | 'null'>(cacheKey);
    if (cached === 'null') {
      return null;
    }
    if (cached) {
      return cached;
    }
  } catch {
    // Cache miss or error — continue to resolution
  }

  // Look up CIK from static data
  const cik = (tickerCikMap as Record<string, number>)[normalizedTicker];
  if (!cik) {
    logger.debug(`[TickerResolver] No CIK found for ticker: ${normalizedTicker}`);
    await cacheMiss(cacheKey);
    return null;
  }

  // Fetch SIC code from SEC EDGAR API
  const sicCode = await fetchSicCode(cik);
  if (!sicCode) {
    await cacheMiss(cacheKey);
    return null;
  }

  // Map SIC code to IndustrySector
  const sector = sicToSector(sicCode);
  if (!sector) {
    logger.debug(`[TickerResolver] SIC ${sicCode} has no sector mapping for ${normalizedTicker}`);
    await cacheMiss(cacheKey);
    return null;
  }

  const result: TickerResolution = {
    sector,
    sicCode,
    confidence: 1.0,
  };

  // Cache successful resolution
  try {
    await getRedisCache().set(cacheKey, result, SIC_CACHE_TTL);
  } catch {
    // Cache write failure is non-fatal
  }

  return result;
}

/**
 * Fetch SIC code from SEC EDGAR submissions API.
 * The CIK is zero-padded to 10 digits per SEC convention.
 */
async function fetchSicCode(cik: number): Promise<string | null> {
  const paddedCik = String(cik).padStart(10, '0');
  const url = `${SEC_SUBMISSIONS_URL}/CIK${paddedCik}.json`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': SEC_USER_AGENT },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn(`[TickerResolver] SEC API returned ${response.status} for CIK ${cik}`);
      return null;
    }

    const data = await response.json();
    const sic = data?.sic;

    if (!sic) {
      return null;
    }

    return String(sic);
  } catch (error) {
    logger.error('[TickerResolver] SEC API fetch failed', error as Error, {
      cik: String(cik),
    });
    return null;
  }
}

/**
 * Cache a null result to avoid repeated lookups for unresolvable tickers.
 */
async function cacheMiss(cacheKey: string): Promise<void> {
  try {
    await getRedisCache().set(cacheKey, 'null', SIC_CACHE_TTL);
  } catch {
    // Non-fatal
  }
}

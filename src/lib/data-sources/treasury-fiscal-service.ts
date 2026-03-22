/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Treasury Fiscal Data Service
 *
 * Queries the Bureau of the Fiscal Service for federal debt,
 * revenue, and spending data.
 *
 * API: https://api.fiscaldata.treasury.gov/services/api/fiscal_service/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  FederalDebt,
  MonthlyRevenue,
  SpendingCategory,
  TreasuryFiscalApiResponse,
  RawTreasuryDebt,
  RawTreasuryReceipt,
  RawTreasuryOutlay,
} from '@/types/treasury-fiscal';

const TREASURY_BASE = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 43200; // 12 hours

async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return fetch(url, {
    headers: { 'User-Agent': 'CIV.IQ (civdotiq.org)' },
    signal: AbortSignal.timeout(30_000),
  });
}

function parseAmount(value: string | null | undefined): number {
  if (!value) return 0;
  return parseFloat(value) || 0;
}

export class TreasuryFiscalService {
  /**
   * Get the latest federal debt figures.
   */
  async getFederalDebt(): Promise<FederalDebt | null> {
    const cacheKey = 'treasury-debt';

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${TREASURY_BASE}/v2/accounting/od/debt_to_penny?sort=-record_date&page[size]=1`;
          logger.info('Treasury federal debt');

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            throw new Error(`Treasury API returned ${response.status}`);
          }

          const data: TreasuryFiscalApiResponse<RawTreasuryDebt> = await response.json();
          const record = data.data?.[0];
          if (!record) return null;

          return {
            totalPublicDebtOutstanding: parseAmount(record.tot_pub_debt_out_amt),
            debtHeldByPublic: parseAmount(record.debt_held_public_amt),
            intragovernmentalHoldings: parseAmount(record.intragov_hold_amt),
            recordDate: record.record_date ?? '',
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('TreasuryFiscalService.getFederalDebt failed', error as Error);
      return null;
    }
  }

  /**
   * Get monthly revenue (receipts) by category.
   */
  async getMonthlyRevenue(year?: number): Promise<MonthlyRevenue[]> {
    const targetYear = year ?? new Date().getFullYear();
    const cacheKey = `treasury-revenue:${targetYear}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${TREASURY_BASE}/v1/accounting/mts/mts_table_4?filter=record_calendar_year:eq:${targetYear}&sort=-record_date&page[size]=100`;
          logger.info('Treasury monthly revenue', { year: targetYear });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Treasury API returned ${response.status}`);
          }

          const data: TreasuryFiscalApiResponse<RawTreasuryReceipt> = await response.json();
          return (data.data ?? []).map(r => ({
            recordDate: r.record_date ?? '',
            currentMonthNetReceipts: parseAmount(r.current_month_net_rcpt_amt),
            fiscalYearToDateNetReceipts: parseAmount(r.fytd_net_rcpt_amt),
            category: r.classification_desc ?? '',
          }));
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('TreasuryFiscalService.getMonthlyRevenue failed', error as Error);
      return [];
    }
  }

  /**
   * Get spending (outlays) by category.
   */
  async getSpendingByCategory(year?: number): Promise<SpendingCategory[]> {
    const targetYear = year ?? new Date().getFullYear();
    const cacheKey = `treasury-spending:${targetYear}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const url = `${TREASURY_BASE}/v1/accounting/mts/mts_table_5?filter=record_calendar_year:eq:${targetYear}&sort=-record_date&page[size]=100`;
          logger.info('Treasury spending by category', { year: targetYear });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Treasury API returned ${response.status}`);
          }

          const data: TreasuryFiscalApiResponse<RawTreasuryOutlay> = await response.json();
          return (data.data ?? []).map(r => ({
            recordDate: r.record_date ?? '',
            category: r.classification_desc ?? '',
            currentMonthOutlays: parseAmount(r.current_month_gross_outly_amt),
            fiscalYearToDateOutlays: parseAmount(r.fytd_gross_outly_amt),
          }));
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('TreasuryFiscalService.getSpendingByCategory failed', error as Error);
      return [];
    }
  }
}

export const treasuryFiscalService = new TreasuryFiscalService();

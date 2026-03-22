/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CMS Open Payments Service
 *
 * Queries CMS Open Payments for pharma/device manufacturer
 * payments to physicians.
 *
 * API: https://openpaymentsdata.cms.gov/api/1/
 * No API key required.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  OpenPayment,
  OpenPaymentAggregate,
  RawOpenPaymentRecord,
} from '@/types/open-payments';

const OPEN_PAYMENTS_BASE = 'https://openpaymentsdata.cms.gov/api/1/datastore/sql';

// General Payment Data dataset UUID (CY2023)
const GENERAL_PAYMENTS_UUID = 'mxaw-9e5i';

const MIN_REQUEST_INTERVAL_MS = 300;
let lastRequestTime = 0;
const CACHE_TTL = 86400; // 24 hours

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

function transformPayment(raw: RawOpenPaymentRecord): OpenPayment {
  return {
    recordId: raw.record_id ?? '',
    payerName:
      raw.applicable_manufacturer_or_applicable_gpo_making_payment_name ?? '',
    recipientState: raw.recipient_state ?? '',
    recipientCity: raw.recipient_city ?? '',
    recipientSpecialty: raw.covered_recipient_specialty_1 ?? '',
    totalAmount: parseFloat(raw.total_amount_of_payment_usdollars) || 0,
    paymentNature: raw.nature_of_payment_or_transfer_of_value ?? '',
    formOfPayment: raw.form_of_payment_or_transfer_of_value ?? '',
    productName:
      raw.name_of_drug_or_biological_or_device_or_medical_supply_1 || null,
    productCategory:
      raw.indicate_drug_or_biological_or_device_or_medical_supply_1 || null,
    productType: raw.covered_or_noncovered_indicator_1 || null,
    paymentDate: raw.date_of_payment ?? '',
    programYear: parseInt(raw.program_year, 10) || 0,
  };
}

function escapeSQL(value: string): string {
  return value.replace(/'/g, "''");
}

export class OpenPaymentsService {
  /**
   * Search Open Payments by state, company, and/or payment type.
   */
  async searchPayments(params: {
    state?: string;
    company?: string;
    paymentType?: string;
    limit?: number;
  }): Promise<OpenPayment[]> {
    const { state, company, paymentType, limit = 50 } = params;
    const cacheKey = `open-payments:${state ?? ''}:${company ?? ''}:${paymentType ?? ''}:${limit}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          const whereClauses: string[] = [];
          if (state) {
            whereClauses.push(`recipient_state = '${escapeSQL(state.toUpperCase())}'`);
          }
          if (company) {
            whereClauses.push(
              `UPPER(applicable_manufacturer_or_applicable_gpo_making_payment_name) LIKE '%${escapeSQL(company.toUpperCase())}%'`
            );
          }
          if (paymentType) {
            whereClauses.push(
              `nature_of_payment_or_transfer_of_value = '${escapeSQL(paymentType)}'`
            );
          }

          if (whereClauses.length === 0) {
            logger.warn('Open Payments search requires at least one filter');
            return [];
          }

          const whereStr = whereClauses.join(' AND ');
          const queryLimit = Math.min(limit, 200);
          const query = encodeURIComponent(
            `[SELECT * FROM ${GENERAL_PAYMENTS_UUID}][WHERE ${whereStr}][ORDER BY total_amount_of_payment_usdollars DESC][LIMIT ${queryLimit}]`
          );
          const url = `${OPEN_PAYMENTS_BASE}?query=${query}`;
          logger.info('Open Payments search', { state, company, paymentType });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return [];
            throw new Error(`Open Payments API returned ${response.status}`);
          }

          const data: RawOpenPaymentRecord[] = await response.json();
          if (!Array.isArray(data)) return [];

          return data.map(transformPayment);
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('OpenPaymentsService.searchPayments failed', error as Error);
      return [];
    }
  }

  /**
   * Get aggregated payment data for a state.
   */
  async getPaymentAggregates(state: string): Promise<OpenPaymentAggregate | null> {
    const stateUpper = state.toUpperCase();
    const cacheKey = `open-payments-agg:${stateUpper}`;

    try {
      return await cachedFetch(
        cacheKey,
        async () => {
          // Fetch a sample of high-value payments for aggregation
          const query = encodeURIComponent(
            `[SELECT * FROM ${GENERAL_PAYMENTS_UUID}][WHERE recipient_state = '${escapeSQL(stateUpper)}'][ORDER BY total_amount_of_payment_usdollars DESC][LIMIT 500]`
          );
          const url = `${OPEN_PAYMENTS_BASE}?query=${query}`;
          logger.info('Open Payments aggregation', { state: stateUpper });

          const response = await rateLimitedFetch(url);
          if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error(`Open Payments API returned ${response.status}`);
          }

          const data: RawOpenPaymentRecord[] = await response.json();
          if (!Array.isArray(data) || data.length === 0) return null;

          const payments = data.map(transformPayment);

          // Aggregate by company
          const companyMap = new Map<string, { count: number; totalAmount: number }>();
          for (const p of payments) {
            const existing = companyMap.get(p.payerName) ?? { count: 0, totalAmount: 0 };
            existing.count += 1;
            existing.totalAmount += p.totalAmount;
            companyMap.set(p.payerName, existing);
          }

          // Aggregate by specialty
          const specialtyMap = new Map<string, { count: number; totalAmount: number }>();
          for (const p of payments) {
            if (!p.recipientSpecialty) continue;
            const existing = specialtyMap.get(p.recipientSpecialty) ?? {
              count: 0,
              totalAmount: 0,
            };
            existing.count += 1;
            existing.totalAmount += p.totalAmount;
            specialtyMap.set(p.recipientSpecialty, existing);
          }

          // Aggregate by nature of payment
          const natureMap = new Map<string, { count: number; totalAmount: number }>();
          for (const p of payments) {
            const existing = natureMap.get(p.paymentNature) ?? { count: 0, totalAmount: 0 };
            existing.count += 1;
            existing.totalAmount += p.totalAmount;
            natureMap.set(p.paymentNature, existing);
          }

          const sortByAmount = (
            a: { totalAmount: number },
            b: { totalAmount: number }
          ): number => b.totalAmount - a.totalAmount;

          return {
            state: stateUpper,
            totalPayments: payments.length,
            totalAmount: payments.reduce((sum, p) => sum + p.totalAmount, 0),
            byCompany: [...companyMap.entries()]
              .map(([company, v]) => ({ company, ...v }))
              .sort(sortByAmount),
            bySpecialty: [...specialtyMap.entries()]
              .map(([specialty, v]) => ({ specialty, ...v }))
              .sort(sortByAmount),
            byNature: [...natureMap.entries()]
              .map(([nature, v]) => ({ nature, ...v }))
              .sort(sortByAmount),
          };
        },
        CACHE_TTL
      );
    } catch (error) {
      logger.error('OpenPaymentsService.getPaymentAggregates failed', error as Error);
      return null;
    }
  }
}

export const openPaymentsService = new OpenPaymentsService();

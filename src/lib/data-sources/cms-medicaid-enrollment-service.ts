/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CMS Medicaid & CHIP Enrollment Service
 *
 * Queries the monthly "State Medicaid and CHIP Applications, Eligibility
 * Determinations, and Enrollment Data" dataset from data.medicaid.gov.
 * State-level (50 states + DC), monthly. No API key required.
 *
 * API: https://data.medicaid.gov/about/api (DKAN datastore query)
 *
 * The distribution UUID rotates when the dataset is re-released each month,
 * so we resolve it at runtime from the stable dataset id rather than
 * hardcoding it (same drift class as cms-provider-service.ts).
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';

// Stable dataset id (metastore) — does NOT change across monthly releases.
const MEDICAID_DATASET_ID = '6165f45b-ca93-5bb5-9d06-db29c692a360';
const METASTORE_BASE = 'https://data.medicaid.gov/api/1/metastore/schemas/dataset/items';
const DATASTORE_QUERY_BASE = 'https://data.medicaid.gov/api/1/datastore/query';
const CACHE_TTL = 86400; // 24 hours

export interface MedicaidEnrollment {
  /** Combined Medicaid + CHIP enrollment for the state */
  totalMedicaidAndChip: number | null;
  totalMedicaid: number | null;
  totalChip: number | null;
  /** Reporting period as YYYYMM (e.g. "202602") */
  reportingPeriod: string | null;
  /** True when the newest figure is marked preliminary ("P") and may be revised */
  preliminary: boolean;
}

const REQUEST_HEADERS = {
  'User-Agent': 'CIV.IQ (civdotiq.org)',
  Accept: 'application/json',
} as const;

/** Resolve the current datastore distribution UUID from the stable dataset id. */
async function resolveDistributionId(): Promise<string | null> {
  const url = `${METASTORE_BASE}/${MEDICAID_DATASET_ID}?show-reference-ids`;
  const res = await fetch(url, {
    headers: REQUEST_HEADERS,
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`Medicaid metastore error: ${res.status}`);
  }
  const meta = (await res.json()) as { distribution?: Array<{ identifier?: string }> };
  return meta.distribution?.[0]?.identifier ?? null;
}

function parseCount(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Fetch the latest state-level Medicaid + CHIP enrollment for a 2-letter
 * state abbreviation (e.g. "CA"). Returns null when unavailable.
 */
export async function fetchMedicaidEnrollment(
  stateAbbreviation: string
): Promise<MedicaidEnrollment | null> {
  const stateAbbr = stateAbbreviation.toUpperCase();
  const cacheKey = `cms-medicaid-enrollment:${stateAbbr}`;

  try {
    return await cachedFetch<MedicaidEnrollment | null>(
      cacheKey,
      async () => {
        const distId = await resolveDistributionId();
        if (!distId) {
          logger.warn('Medicaid enrollment unavailable: no distribution id', { stateAbbr });
          return null;
        }

        const params = new URLSearchParams();
        params.set('limit', '1');
        params.set('conditions[0][property]', 'state_abbreviation');
        params.set('conditions[0][value]', stateAbbr);
        params.set('conditions[0][operator]', '=');
        params.set('sorts[0][property]', 'reporting_period');
        params.set('sorts[0][order]', 'desc');
        const url = `${DATASTORE_QUERY_BASE}/${distId}?${params.toString()}`;

        logger.info('Fetching CMS Medicaid enrollment', { stateAbbr });
        const res = await fetch(url, {
          headers: REQUEST_HEADERS,
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          throw new Error(`Medicaid datastore error: ${res.status}`);
        }

        const data = (await res.json()) as { results?: Array<Record<string, string | null>> };
        const row = data.results?.[0];
        if (!row) {
          logger.warn('Medicaid enrollment query returned no rows', { stateAbbr });
          return null;
        }

        return {
          totalMedicaidAndChip: parseCount(row.total_medicaid_and_chip_enrollment),
          totalMedicaid: parseCount(row.total_medicaid_enrollment),
          totalChip: parseCount(row.total_chip_enrollment),
          reportingPeriod: row.reporting_period ?? null,
          preliminary: row.preliminary_or_updated === 'P',
        };
      },
      CACHE_TTL
    );
  } catch (error) {
    logger.error('Failed to fetch Medicaid enrollment', error as Error, { stateAbbr });
    return null;
  }
}

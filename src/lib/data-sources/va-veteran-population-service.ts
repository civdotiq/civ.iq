/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * VA Veteran Population Service
 *
 * Queries the VA "Veteran Population by State" dataset (NCVAS / VetPop) from
 * the VA open-data hub. State-level, current fiscal year. No API key required.
 *
 * API: https://www.datahub.va.gov (Socrata SODA)
 * Dataset: Veteran Population by State FY2026 — resource w6fb-7dn4
 *
 * Note: this is veteran POPULATION (count of veterans living in the state),
 * NOT VA expenditures. The VA "Geographic Distribution of Expenditures" (GDX)
 * report — which breaks spend out by congressional district — is only
 * available via API for FY2007–FY2008 (≈17 years stale) and as Excel files
 * thereafter, so it is not integrated as live current data.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getStateName } from '@/lib/data/us-states';

const VA_RESOURCE_BASE = 'https://www.datahub.va.gov/resource';
// Veteran Population by State, FY2026.
const VETERAN_POP_RESOURCE = 'w6fb-7dn4';
const FISCAL_YEAR = 'FY2026';
const CACHE_TTL = 86400; // 24 hours

export interface VeteranPopulation {
  /** Estimated number of veterans living in the state */
  count: number | null;
  /** Fiscal year of the VetPop estimate (e.g. "FY2026") */
  fiscalYear: string;
}

function parseCount(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  // VetPop values can carry decimals; veterans are people, so round.
  const parsed = Math.round(Number(value));
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Fetch the veteran population for a 2-letter state abbreviation (e.g. "CA").
 * The VA dataset keys on full state name. Returns null when unavailable.
 */
export async function fetchVeteranPopulation(
  stateAbbreviation: string
): Promise<VeteranPopulation | null> {
  const stateAbbr = stateAbbreviation.toUpperCase();
  const stateName = getStateName(stateAbbr);
  if (!stateName) {
    logger.warn('Veteran population: unknown state code', { stateAbbr });
    return null;
  }

  const cacheKey = `va-veteran-population:${stateAbbr}`;

  try {
    return await cachedFetch<VeteranPopulation | null>(
      cacheKey,
      async () => {
        const params = new URLSearchParams();
        params.set('$select', 'state,number');
        // Socrata $where with case-insensitive match on full state name.
        params.set('$where', `upper(state)='${stateName.toUpperCase()}'`);
        params.set('$limit', '1');
        const url = `${VA_RESOURCE_BASE}/${VETERAN_POP_RESOURCE}.json?${params.toString()}`;

        logger.info('Fetching VA veteran population', { stateAbbr, stateName });
        const res = await fetch(url, {
          headers: { 'User-Agent': 'CIV.IQ (civdotiq.org)', Accept: 'application/json' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          throw new Error(`VA datahub error: ${res.status}`);
        }

        const rows = (await res.json()) as Array<Record<string, string | null>>;
        const row = rows[0];
        if (!row) {
          logger.warn('Veteran population query returned no rows', { stateAbbr, stateName });
          return null;
        }

        return {
          count: parseCount(row.number),
          fiscalYear: FISCAL_YEAR,
        };
      },
      CACHE_TTL
    );
  } catch (error) {
    logger.error('Failed to fetch veteran population', error as Error, { stateAbbr });
    return null;
  }
}

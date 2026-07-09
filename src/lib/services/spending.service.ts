/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * District Spending Service
 *
 * Shared service for fetching federal spending data from USASpending.gov.
 * Used by both the spending API route and the spending narrative API
 * (eliminates self-referencing HTTP fetches).
 */

import { cachedFetch } from '@/lib/cache';
import { currentFederalFiscalYearWindow } from '@/lib/helpers/federal-fiscal-year';
import logger from '@/lib/logging/simple-logger';
import type {
  FederalAward,
  USASpendingAwardResponse,
  USASpendingAwardResult,
} from '@/types/spending';

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

const CONTRACT_CODES = ['A', 'B', 'C', 'D'];
const GRANT_CODES = ['02', '03', '04', '05'];

// The spending_by_geography endpoint identifies districts by FIPS-based
// shape codes (e.g. TX-10 = "4810"), not by state postal codes.
const STATE_FIPS: Record<string, string> = {
  AL: '01',
  AK: '02',
  AZ: '04',
  AR: '05',
  CA: '06',
  CO: '08',
  CT: '09',
  DE: '10',
  FL: '12',
  GA: '13',
  HI: '15',
  ID: '16',
  IL: '17',
  IN: '18',
  IA: '19',
  KS: '20',
  KY: '21',
  LA: '22',
  ME: '23',
  MD: '24',
  MA: '25',
  MI: '26',
  MN: '27',
  MS: '28',
  MO: '29',
  MT: '30',
  NE: '31',
  NV: '32',
  NH: '33',
  NJ: '34',
  NM: '35',
  NY: '36',
  NC: '37',
  ND: '38',
  OH: '39',
  OK: '40',
  OR: '41',
  PA: '42',
  RI: '44',
  SC: '45',
  SD: '46',
  TN: '47',
  TX: '48',
  UT: '49',
  VT: '50',
  VA: '51',
  WA: '53',
  WV: '54',
  WI: '55',
  WY: '56',
};

/**
 * Parse district ID (e.g., "MI-05", "CA-5", "AK-AL") into state and district number.
 * Returns null for invalid formats.
 */
export function parseDistrictId(districtId: string): { state: string; district: string } | null {
  const match = districtId.match(/^([A-Z]{2})-(\d{1,2}|AL|00)$/i);
  if (!match) return null;
  const district = match[2] ?? '';
  return {
    state: match[1]?.toUpperCase() ?? '',
    district: district.match(/^\d+$/) ? district.padStart(2, '0') : '00',
  };
}

function transformAward(award: USASpendingAwardResult, type: 'contract' | 'grant'): FederalAward {
  return {
    id: award['Award ID'],
    internalId: award.internal_id,
    recipientName: award['Recipient Name'],
    amount: award['Award Amount'],
    type,
    typeDescription: award['Award Type'],
    agency: award['Awarding Agency'],
    agencySlug: award.agency_slug,
    startDate: award['Start Date'],
    description: award.Description || 'No description available',
    url: `https://www.usaspending.gov/award/${award.generated_internal_id}`,
  };
}

async function fetchDistrictAwards(
  state: string,
  district: string,
  awardCodes: string[],
  limit: number = 10
): Promise<FederalAward[]> {
  const { startDate, endDate } = currentFederalFiscalYearWindow();

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify({
        subawards: false,
        limit,
        fields: [
          'Award ID',
          'Recipient Name',
          'Award Amount',
          'Award Type',
          'Awarding Agency',
          'Start Date',
          'Description',
        ],
        sort: 'Award Amount',
        order: 'desc',
        filters: {
          place_of_performance_locations: [{ country: 'USA', state, district_current: district }],
          time_period: [{ start_date: startDate, end_date: endDate }],
          award_type_codes: awardCodes,
        },
      }),
    });

    if (!response.ok) {
      logger.error('USAspending API error', new Error(`HTTP ${response.status}`));
      return [];
    }

    const data: USASpendingAwardResponse = await response.json();
    const type = awardCodes.includes('A') ? 'contract' : 'grant';
    return data.results.map(award => transformAward(award, type));
  } catch (error) {
    logger.error('Error fetching district awards', error as Error);
    return [];
  }
}

async function fetchDistrictAggregate(
  state: string,
  district: string
): Promise<{ total: number; perCapita: number | null; population: number | null } | null> {
  const { startDate, endDate } = currentFederalFiscalYearWindow();

  const stateFips = STATE_FIPS[state];
  if (!stateFips) {
    logger.warn('No FIPS code for state in district aggregate lookup', { state });
    return null;
  }

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_geography/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify({
        scope: 'place_of_performance',
        geo_layer: 'district',
        geo_layer_filters: [`${stateFips}${district}`],
        filters: {
          time_period: [{ start_date: startDate, end_date: endDate }],
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.results?.[0];
    // No aggregated amount = data unavailable, not $0 (null-honesty)
    if (!result || typeof result.aggregated_amount !== 'number') return null;

    return {
      total: result.aggregated_amount,
      perCapita: result.per_capita ?? null,
      population: result.population ?? null,
    };
  } catch (error) {
    logger.error('Error fetching district aggregate', error as Error);
    return null;
  }
}

/**
 * Documented, auditable code set defining "infrastructure" for the district
 * infrastructure obligation figure. Kept as a named constant so the definition
 * is transparent and one-line-editable — never a fuzzy keyword match.
 *
 * Contract dimension: PSC (Product/Service Code) families Y and Z. NAICS and PSC
 * describe the SAME procurement universe (every contract carries both), so we
 * pick ONE — PSC, because it describes what the money bought/built:
 *   Y = Construction of Structures and Facilities
 *   Z = Maintenance, Repair, and Alteration of Real Property
 * Grant dimension (disjoint from contracts): DOT + EPA State Revolving Fund
 * assistance listings. Energy (81.xxx) is intentionally excluded from v1 — most
 * 81.xxx listings are R&D, not built infrastructure.
 */
export const INFRASTRUCTURE_CODE_SET = {
  pscFamilies: ['Y', 'Z'] as const,
  grantCfda: ['20.106', '20.205', '20.500', '20.507', '66.458', '66.468'] as const,
  label:
    'Federal construction & infrastructure obligations — procurement for construction and ' +
    'real-property work (PSC Y & Z) plus DOT/EPA-SRF infrastructure grants ' +
    '(assistance listings 20.106/20.205/20.500/20.507, 66.458, 66.468). Place of performance ' +
    'in this district, current fiscal year to date. Source: USASpending.gov.',
};

const INFRA_MAX_PAGES = 20; // 100/page — bounds a pathological district; cap is logged

/**
 * Sum Award Amount over a district's awards matching a code filter, current FY,
 * by paging spending_by_award. Both infrastructure dimensions use this endpoint:
 * it reliably honors psc_codes and program_numbers, whereas code-filtered
 * spending_by_geography queries intermittently time out (502/504). Any page
 * failure returns null (an incomplete sum would understate the total) — never a
 * misleading partial or 0. The page cap is logged (no silent caps).
 */
async function sumDistrictAwardObligations(
  state: string,
  district: string,
  awardTypeCodes: string[],
  codeFilter: Record<string, unknown>,
  dimension: string
): Promise<number | null> {
  const { startDate, endDate } = currentFederalFiscalYearWindow();
  let total = 0;

  for (let page = 1; page <= INFRA_MAX_PAGES; page++) {
    try {
      const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
        body: JSON.stringify({
          subawards: false,
          limit: 100,
          page,
          fields: ['Award ID', 'Award Amount'],
          sort: 'Award Amount',
          order: 'desc',
          filters: {
            place_of_performance_locations: [{ country: 'USA', state, district_current: district }],
            time_period: [{ start_date: startDate, end_date: endDate }],
            award_type_codes: awardTypeCodes,
            ...codeFilter,
          },
        }),
        signal: AbortSignal.timeout(25000),
      });

      if (!response.ok) {
        logger.warn('Infrastructure award page failed', {
          state,
          district,
          dimension,
          page,
          status: response.status,
        });
        return null;
      }

      const data = await response.json();
      const results: Array<Record<string, unknown>> = data.results ?? [];
      for (const r of results) {
        const amount = Number(r['Award Amount']);
        if (Number.isFinite(amount)) total += amount;
      }

      const hasNext = data.page_metadata?.hasNext ?? false;
      if (!hasNext || results.length === 0) return total;

      if (page === INFRA_MAX_PAGES) {
        logger.warn('Infrastructure paging hit page cap; total may be understated', {
          state,
          district,
          dimension,
          pages: INFRA_MAX_PAGES,
        });
      }
    } catch (error) {
      logger.error('Error summing infrastructure award obligations', error as Error, {
        state,
        district,
        dimension,
        page,
      });
      return null;
    }
  }
  return total;
}

/** Contract-side infrastructure obligations: PSC Y+Z procurement. */
function fetchInfrastructureContractObligations(
  state: string,
  district: string
): Promise<number | null> {
  return sumDistrictAwardObligations(
    state,
    district,
    CONTRACT_CODES,
    { psc_codes: { require: INFRASTRUCTURE_CODE_SET.pscFamilies.map(f => ['Service', f]) } },
    'contract'
  );
}

/** Grant-side infrastructure obligations: DOT + EPA-SRF assistance listings. */
function fetchInfrastructureGrantObligations(
  state: string,
  district: string
): Promise<number | null> {
  return sumDistrictAwardObligations(
    state,
    district,
    GRANT_CODES,
    { program_numbers: [...INFRASTRUCTURE_CODE_SET.grantCfda] },
    'grant'
  );
}

/** District infrastructure obligations, split by dimension. */
export interface DistrictInfrastructureSpending {
  /** contract + grant obligations; null when queried but none found (see reason). */
  total: number | null;
  contractObligations: number | null; // PSC Y+Z
  grantObligations: number | null; // DOT/EPA-SRF assistance listings
  codeSetLabel: string;
  reason?: string; // present when total is null
}

/**
 * Federal construction & infrastructure obligations for a district, current FY
 * to date, from the documented INFRASTRUCTURE_CODE_SET. Returns null (not
 * cached, retried) when a code family fails; returns an object with total null +
 * reason when the query succeeds but finds nothing. Cached 6h on success.
 */
export async function getDistrictInfrastructureSpending(
  state: string,
  district: string
): Promise<DistrictInfrastructureSpending | null> {
  const cacheKey = `spending-district-infra-${state}-${district}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const [contractObligations, grantObligations] = await Promise.all([
        fetchInfrastructureContractObligations(state, district),
        fetchInfrastructureGrantObligations(state, district),
      ]);

      // Either family failing means the combined total would be incomplete —
      // return null (unavailable, retried) rather than a misleading partial sum.
      if (contractObligations === null || grantObligations === null) return null;

      const sum = contractObligations + grantObligations;
      const base = {
        contractObligations,
        grantObligations,
        codeSetLabel: INFRASTRUCTURE_CODE_SET.label,
      };
      if (sum <= 0) {
        return {
          ...base,
          total: null,
          reason:
            'Queried USASpending; no matching construction or infrastructure obligations for the current fiscal year to date',
        };
      }
      return { ...base, total: sum };
    },
    6 * 60 * 60
  );
}

/**
 * Statewide federal spending total for the current fiscal year
 * (place-of-performance, all award types). Powers the senator variant of
 * the Record Card's "Their office, your money" section. Null-honesty:
 * no aggregated amount = unavailable, never $0.
 */
export async function getStateSpendingTotal(
  state: string
): Promise<{ total: number; perCapita: number | null } | null> {
  // Unlike the district layer (FIPS+district shape codes), the state
  // geo_layer filters by postal code — FIPS returns empty results.
  if (!/^[A-Z]{2}$/.test(state)) {
    logger.warn('Invalid state code in state aggregate lookup', { state });
    return null;
  }

  return cachedFetch(
    `spending-state-total-${state}`,
    async () => {
      const { startDate, endDate } = currentFederalFiscalYearWindow();

      const response = await fetch(`${USASPENDING_API}/search/spending_by_geography/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
        },
        body: JSON.stringify({
          scope: 'place_of_performance',
          geo_layer: 'state',
          geo_layer_filters: [state],
          filters: {
            time_period: [{ start_date: startDate, end_date: endDate }],
          },
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      const result = data.results?.[0];
      if (!result || typeof result.aggregated_amount !== 'number') return null;

      return {
        total: result.aggregated_amount,
        perCapita: result.per_capita ?? null,
      };
    },
    6 * 60 * 60
  );
}

/** Award counts for a district in the current fiscal year, by award family */
export interface DistrictAwardCounts {
  contracts: number;
  grants: number;
}

async function fetchDistrictAwardCounts(
  state: string,
  district: string
): Promise<DistrictAwardCounts | null> {
  const { startDate, endDate } = currentFederalFiscalYearWindow();

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_award_count/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify({
        filters: {
          place_of_performance_locations: [{ country: 'USA', state, district_current: district }],
          time_period: [{ start_date: startDate, end_date: endDate }],
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const results = data.results;
    if (typeof results?.contracts !== 'number' || typeof results?.grants !== 'number') {
      return null;
    }

    return { contracts: results.contracts, grants: results.grants };
  } catch (error) {
    logger.error('Error fetching district award counts', error as Error);
    return null;
  }
}

/**
 * Count of contracts and grants awarded in a congressional district in the
 * current fiscal year. null = data unavailable (never fabricated).
 * Cached separately from getDistrictSpending so existing cache entries keep
 * their shape; failed fetches (null) are not served from cache.
 */
export async function getDistrictAwardCounts(
  state: string,
  district: string
): Promise<DistrictAwardCounts | null> {
  const cacheKey = `spending-district-counts-${state}-${district}`;

  return cachedFetch(cacheKey, () => fetchDistrictAwardCounts(state, district), 6 * 60 * 60);
}

/** Result from getDistrictSpending — same shape the API route returns in its JSON body */
export interface DistrictSpendingResult {
  contracts: FederalAward[];
  grants: FederalAward[];
  aggregate: { total: number; perCapita: number | null; population: number | null } | null;
  contractTotal: number;
  grantTotal: number;
}

/**
 * Fetch federal spending data for a congressional district.
 * Calls USASpending.gov directly (no self-referencing HTTP).
 * Results are cached for 6 hours.
 */
export async function getDistrictSpending(
  state: string,
  district: string
): Promise<DistrictSpendingResult> {
  const cacheKey = `spending-district-${state}-${district}`;

  return cachedFetch(
    cacheKey,
    async () => {
      const [contracts, grants, aggregate] = await Promise.all([
        fetchDistrictAwards(state, district, CONTRACT_CODES, 10),
        fetchDistrictAwards(state, district, GRANT_CODES, 10),
        fetchDistrictAggregate(state, district),
      ]);

      const contractTotal = contracts.reduce((sum, a) => sum + a.amount, 0);
      const grantTotal = grants.reduce((sum, a) => sum + a.amount, 0);

      return { contracts, grants, aggregate, contractTotal, grantTotal };
    },
    // cachedFetch TTL is in seconds; this was previously 6h * 1000 (~250 days)
    6 * 60 * 60
  );
}

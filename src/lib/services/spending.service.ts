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
        geo_layer_filters: [`${state}${district}`],
        filters: {
          time_period: [{ start_date: startDate, end_date: endDate }],
        },
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const result = data.results?.[0];
    if (!result) return null;

    return {
      total: result.aggregated_amount ?? 0,
      perCapita: result.per_capita ?? null,
      population: result.population ?? null,
    };
  } catch (error) {
    logger.error('Error fetching district aggregate', error as Error);
    return null;
  }
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
    6 * 60 * 60 * 1000
  );
}

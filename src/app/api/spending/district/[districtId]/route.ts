/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import type {
  DistrictSpendingResponse,
  FederalAward,
  USASpendingAwardResponse,
  USASpendingAwardResult,
} from '@/types/spending';

// ISR: Revalidate every 6 hours (spending data updates daily)
export const revalidate = 21600;
export const dynamic = 'force-dynamic';

const USASPENDING_API = 'https://api.usaspending.gov/api/v2';

// Contract award type codes
const CONTRACT_CODES = ['A', 'B', 'C', 'D'];
// Grant/assistance award type codes
const GRANT_CODES = ['02', '03', '04', '05'];

/**
 * Parse district ID (e.g., "MI-05") into state and district number
 */
function parseDistrictId(districtId: string): { state: string; district: string } | null {
  const match = districtId.match(/^([A-Z]{2})-(\d{2})$/i);
  if (!match) return null;
  return {
    state: match[1]?.toUpperCase() ?? '',
    district: match[2] ?? '',
  };
}

/**
 * Transform USAspending award to simplified format
 */
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

/**
 * Fetch awards for a congressional district
 */
async function fetchDistrictAwards(
  state: string,
  district: string,
  awardCodes: string[],
  limit: number = 10
): Promise<FederalAward[]> {
  const fiscalYear = new Date().getFullYear();
  const startDate = `${fiscalYear - 1}-10-01`; // Federal FY starts Oct 1
  const endDate = `${fiscalYear}-09-30`;

  const requestBody = {
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
      place_of_performance_locations: [
        {
          country: 'USA',
          state,
          district_current: district,
        },
      ],
      time_period: [{ start_date: startDate, end_date: endDate }],
      award_type_codes: awardCodes,
    },
  };

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_award/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify(requestBody),
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

/**
 * Fetch aggregate spending for a district
 */
async function fetchDistrictAggregate(
  state: string,
  district: string
): Promise<{ total: number; perCapita: number | null; population: number | null } | null> {
  const fiscalYear = new Date().getFullYear();
  const startDate = `${fiscalYear - 1}-10-01`;
  const endDate = `${fiscalYear}-09-30`;

  const requestBody = {
    scope: 'place_of_performance',
    geo_layer: 'district',
    geo_layer_filters: [`${state}${district}`],
    filters: {
      time_period: [{ start_date: startDate, end_date: endDate }],
    },
  };

  try {
    const response = await fetch(`${USASPENDING_API}/search/spending_by_geography/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CIV.IQ/1.0 (Civic Intelligence Platform)',
      },
      body: JSON.stringify(requestBody),
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse<DistrictSpendingResponse>> {
  try {
    const { districtId } = await params;
    const parsed = parseDistrictId(districtId);

    if (!parsed) {
      return NextResponse.json(
        {
          success: false,
          summary: null,
          recentContracts: [],
          recentGrants: [],
          metadata: {
            generatedAt: new Date().toISOString(),
            dataSource: 'usaspending.gov',
            fiscalYear: new Date().getFullYear(),
          },
          error: 'Invalid district ID format. Use format: ST-DD (e.g., MI-05)',
        },
        { status: 400 }
      );
    }

    const { state, district } = parsed;
    const cacheKey = `spending-district-${state}-${district}`;

    logger.info('District spending API request', { districtId, state, district });

    const result = await cachedFetch(
      cacheKey,
      async () => {
        // Fetch contracts, grants, and aggregate in parallel
        const [contracts, grants, aggregate] = await Promise.all([
          fetchDistrictAwards(state, district, CONTRACT_CODES, 10),
          fetchDistrictAwards(state, district, GRANT_CODES, 10),
          fetchDistrictAggregate(state, district),
        ]);

        // Calculate totals from fetched awards (approximate)
        const contractTotal = contracts.reduce((sum, a) => sum + a.amount, 0);
        const grantTotal = grants.reduce((sum, a) => sum + a.amount, 0);

        return {
          contracts,
          grants,
          aggregate,
          contractTotal,
          grantTotal,
        };
      },
      6 * 60 * 60 * 1000 // 6 hour cache
    );

    const fiscalYear = new Date().getFullYear();

    return NextResponse.json(
      {
        success: true,
        summary: {
          districtId: districtId.toUpperCase(),
          displayName: `${state}-${district}`,
          state,
          districtNumber: district,
          fiscalYear,
          totalSpending: result.aggregate?.total ?? 0,
          contractSpending: result.contractTotal,
          grantSpending: result.grantTotal,
          loanSpending: 0, // Would need separate query
          otherSpending: 0,
          topRecipients: [], // Would need aggregation query
          topAgencies: [], // Would need aggregation query
          perCapita: result.aggregate?.perCapita ?? null,
          population: result.aggregate?.population ?? null,
        },
        recentContracts: result.contracts,
        recentGrants: result.grants,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'usaspending.gov',
          fiscalYear,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=43200',
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('District spending API error', error as Error);

    return NextResponse.json(
      {
        success: false,
        summary: null,
        recentContracts: [],
        recentGrants: [],
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'usaspending.gov',
          fiscalYear: new Date().getFullYear(),
        },
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { parseDistrictId, getDistrictSpending } from '@/lib/services/spending.service';
import type { DistrictSpendingResponse } from '@/types/spending';

export const dynamic = 'force-dynamic';

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

    logger.info('District spending API request', { districtId, state, district });

    const result = await getDistrictSpending(state, district);
    const fiscalYear = new Date().getFullYear();

    const aggregateAvailable = result.aggregate !== null;

    return NextResponse.json(
      {
        success: true,
        summary: {
          districtId: districtId.toUpperCase(),
          displayName: `${state}-${district}`,
          state,
          districtNumber: district,
          fiscalYear,
          totalSpending: result.aggregate?.total ?? result.contractTotal + result.grantTotal,
          contractSpending: result.contractTotal,
          grantSpending: result.grantTotal,
          loanSpending: 0,
          otherSpending: 0,
          topRecipients: [],
          topAgencies: [],
          perCapita: result.aggregate?.perCapita ?? null,
          population: result.aggregate?.population ?? null,
        },
        recentContracts: result.contracts,
        recentGrants: result.grants,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataSource: 'usaspending.gov',
          fiscalYear,
          dataQuality: aggregateAvailable ? 'complete' : 'partial',
          ...(!aggregateAvailable && {
            dataNote:
              'Aggregate spending API unavailable; totalSpending is sum of top-10 contracts and grants only',
          }),
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

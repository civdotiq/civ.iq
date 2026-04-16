/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { parseDistrictId, getDistrictSpending } from '@/lib/services/spending.service';
import {
  fetchWithSourceStatus,
  computeDataQuality,
  type SourceStatus,
} from '@/types/backbone-response';
import type { DistrictSpendingResponse } from '@/types/spending';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
): Promise<NextResponse<DistrictSpendingResponse>> {
  const { districtId } = await params;
  const parsed = parseDistrictId(districtId);
  const now = new Date().toISOString();
  const fiscalYear = new Date().getFullYear();

  if (!parsed) {
    const sourceStatus: SourceStatus = {
      source: 'usaspending.gov',
      status: 'ok',
      fetchedAt: now,
    };
    return NextResponse.json(
      {
        success: false,
        summary: null,
        recentContracts: [],
        recentGrants: [],
        dataQuality: 'empty' as const,
        sourceStatus: [sourceStatus],
        metadata: {
          generatedAt: now,
          dataSource: 'usaspending.gov',
          fiscalYear,
        },
        error: 'Invalid district ID format. Use format: ST-DD (e.g., MI-05)',
      },
      { status: 400 }
    );
  }

  const { state, district } = parsed;

  logger.info('District spending API request', { districtId, state, district });

  const { data: result, sourceStatus } = await fetchWithSourceStatus(
    'usaspending.gov',
    () => getDistrictSpending(state, district),
    { contracts: [], grants: [], contractTotal: 0, grantTotal: 0, aggregate: null }
  );

  if (sourceStatus.status !== 'ok') {
    logger.error('District spending API error', new Error(sourceStatus.errorMessage ?? 'unknown'));

    return NextResponse.json(
      {
        success: false,
        summary: null,
        recentContracts: [],
        recentGrants: [],
        dataQuality: computeDataQuality([sourceStatus], true),
        sourceStatus: [sourceStatus],
        metadata: {
          generatedAt: now,
          dataSource: 'usaspending.gov',
          fiscalYear,
        },
        error: sourceStatus.errorMessage,
      },
      { status: 503 }
    );
  }

  const aggregateAvailable = result.aggregate !== null;
  const hasData = result.contracts.length > 0 || result.grants.length > 0;
  const dataQuality = aggregateAvailable
    ? hasData
      ? 'complete'
      : 'empty'
    : hasData
      ? 'partial'
      : 'empty';

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
      dataQuality: dataQuality as 'complete' | 'partial' | 'empty',
      sourceStatus: [sourceStatus],
      metadata: {
        generatedAt: now,
        dataSource: 'usaspending.gov',
        fiscalYear,
        ...(!aggregateAvailable &&
          hasData && {
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
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Top Industries Analysis API Route
 * Provides detailed industry breakdown for campaign contributions
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { aggregateFinanceData } from '@/lib/fec/finance-aggregator';
import { govCache } from '@/services/cache';
import {
  getFECMapping,
  getFECCandidateLink,
  FinanceCacheKeys,
  EmptyFinanceResponses,
  FEC_CACHE_OPTIONS,
  withFECCacheHeaders,
} from '@/lib/api/finance-helpers';
import { ApiErrors } from '@/lib/api/error-responses';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface IndustryAnalysisResponse {
  topIndustries: Array<{
    industry: string;
    amount: number;
    percentage: number;
    contributionCount: number;
    topEmployers: Array<{
      name: string;
      amount: number;
      count: number;
    }>;
  }>;
  dataQuality: {
    totalContributionsAnalyzed: number;
    contributionsWithEmployer: number;
    completenessPercentage: number;
  };
  metadata: {
    bioguideId: string;
    cycle: number;
    lastUpdated: string;
    fecTransparencyLink?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Industries API] Called', { bioguideId });

    const cacheKey = FinanceCacheKeys.industries(bioguideId);
    const cached = await govCache.get<IndustryAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const fecMapping = getFECMapping(bioguideId);
    if (!fecMapping) {
      return NextResponse.json(EmptyFinanceResponses.industries(bioguideId));
    }

    const financeData = await aggregateFinanceData(fecMapping.fecId, 2024, 'XX');
    if (!financeData) {
      return NextResponse.json(EmptyFinanceResponses.industries(bioguideId));
    }

    const response: IndustryAnalysisResponse = {
      topIndustries: financeData.industryBreakdown.map(item => ({
        industry: item.industry,
        amount: item.amount,
        percentage: item.percentage,
        contributionCount: item.count,
        topEmployers: item.topEmployers,
      })),
      dataQuality: financeData.dataQuality.industry,
      metadata: {
        bioguideId,
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecTransparencyLink: getFECCandidateLink(fecMapping.fecId),
      },
    };

    await govCache.set(cacheKey, response, FEC_CACHE_OPTIONS);

    logger.info('[Industries API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return withFECCacheHeaders(response);
  } catch (error) {
    logger.error('[Industries API] Error', error as Error, { bioguideId });
    return ApiErrors.serverError(error as Error);
  }
}

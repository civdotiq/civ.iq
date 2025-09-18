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
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { aggregateFinanceData } from '@/lib/fec/finance-aggregator';
import { govCache } from '@/services/cache';

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

    const cacheKey = `finance-industries:${bioguideId}:2024`;
    const cached = await govCache.get<IndustryAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) {
      return NextResponse.json({
        topIndustries: [],
        dataQuality: {
          totalContributionsAnalyzed: 0,
          contributionsWithEmployer: 0,
          completenessPercentage: 0,
        },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
        },
      });
    }

    const financeData = await aggregateFinanceData(fecMapping.fecId, 2024, 'XX');
    if (!financeData) {
      return NextResponse.json({
        topIndustries: [],
        dataQuality: {
          totalContributionsAnalyzed: 0,
          contributionsWithEmployer: 0,
          completenessPercentage: 0,
        },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
        },
      });
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
        fecTransparencyLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
      },
    };

    await govCache.set(cacheKey, response, {
      ttl: 21600000,
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Industries API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Industries API] Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Failed to fetch industry analysis' }, { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Geographic Distribution Analysis API Route
 * Provides in-state vs out-of-state contribution analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { aggregateFinanceData } from '@/lib/fec/finance-aggregator';
import { govCache } from '@/services/cache';

interface GeographicAnalysisResponse {
  inStateTotal: number;
  outOfStateTotal: number;
  inStatePercentage: number;
  outOfStatePercentage: number;
  topStates: Array<{
    state: string;
    stateName: string;
    amount: number;
    percentage: number;
    contributionCount: number;
    isHomeState: boolean;
  }>;
  dataQuality: {
    totalContributionsAnalyzed: number;
    contributionsWithState: number;
    completenessPercentage: number;
  };
  metadata: {
    bioguideId: string;
    representativeState: string;
    cycle: number;
    lastUpdated: string;
    fecTransparencyLink: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Geography API] Called', { bioguideId });

    const cacheKey = `finance-geography:${bioguideId}:2024`;
    const cached = await govCache.get<GeographicAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) {
      return NextResponse.json({
        inStateTotal: 0,
        outOfStateTotal: 0,
        inStatePercentage: 0,
        outOfStatePercentage: 0,
        topStates: [],
        dataQuality: {
          totalContributionsAnalyzed: 0,
          contributionsWithState: 0,
          completenessPercentage: 0,
        },
        metadata: {
          bioguideId,
          representativeState: '',
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          fecTransparencyLink: '',
        },
      });
    }

    const representativeState = 'XX';
    const financeData = await aggregateFinanceData(fecMapping.fecId, 2024, representativeState);

    if (!financeData) {
      return NextResponse.json({
        inStateTotal: 0,
        outOfStateTotal: 0,
        inStatePercentage: 0,
        outOfStatePercentage: 0,
        topStates: [],
        dataQuality: {
          totalContributionsAnalyzed: 0,
          contributionsWithState: 0,
          completenessPercentage: 0,
        },
        metadata: {
          bioguideId,
          representativeState,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          fecTransparencyLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
        },
      });
    }

    const inStateContributions = financeData.geographicBreakdown.filter(state => state.isHomeState);
    const outOfStateContributions = financeData.geographicBreakdown.filter(
      state => !state.isHomeState
    );

    const inStateTotal = inStateContributions.reduce((sum, state) => sum + state.amount, 0);
    const outOfStateTotal = outOfStateContributions.reduce((sum, state) => sum + state.amount, 0);
    const totalContributions = inStateTotal + outOfStateTotal;

    const response: GeographicAnalysisResponse = {
      inStateTotal,
      outOfStateTotal,
      inStatePercentage: totalContributions > 0 ? (inStateTotal / totalContributions) * 100 : 0,
      outOfStatePercentage:
        totalContributions > 0 ? (outOfStateTotal / totalContributions) * 100 : 0,
      topStates: financeData.geographicBreakdown.slice(0, 20).map(state => ({
        state: state.state,
        stateName: state.stateName,
        amount: state.amount,
        percentage: state.percentage,
        contributionCount: state.count,
        isHomeState: state.isHomeState,
      })),
      dataQuality: financeData.dataQuality.geography,
      metadata: {
        bioguideId,
        representativeState,
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

    logger.info('[Geography API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Geography API] Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Failed to fetch geographic analysis' }, { status: 500 });
  }
}

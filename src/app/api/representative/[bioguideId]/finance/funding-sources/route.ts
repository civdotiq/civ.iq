/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * PAC & Committee Contributions Analysis API Route
 * Provides detailed funding source analysis including PACs, committees, and party contributions
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';

// ISR: Revalidate every 1 hour
export const revalidate = 3600;

interface FundingSourcesAnalysisResponse {
  totalRaised: number;
  individualContributions: {
    amount: number;
    percentage: number;
  };
  pacContributions: {
    amount: number;
    percentage: number;
    breakdown: Array<{
      type: string;
      amount: number;
      percentage: number;
    }>;
  };
  partyContributions: {
    amount: number;
    percentage: number;
  };
  candidateContributions: {
    amount: number;
    percentage: number;
  };
  otherContributions: {
    amount: number;
    percentage: number;
  };
  metadata: {
    bioguideId: string;
    cycle: number;
    lastUpdated: string;
    fecTransparencyLink: string;
    dataSource: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Funding Sources API] Called', { bioguideId });

    const cacheKey = `finance-funding-sources:${bioguideId}:2024`;
    const cached = await govCache.get<FundingSourcesAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) {
      return NextResponse.json({
        totalRaised: 0,
        individualContributions: { amount: 0, percentage: 0 },
        pacContributions: { amount: 0, percentage: 0, breakdown: [] },
        partyContributions: { amount: 0, percentage: 0 },
        candidateContributions: { amount: 0, percentage: 0 },
        otherContributions: { amount: 0, percentage: 0 },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          fecTransparencyLink: '',
          dataSource: 'No FEC mapping available',
        },
      });
    }

    const financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, 2024);

    if (!financialSummary) {
      return NextResponse.json({
        totalRaised: 0,
        individualContributions: { amount: 0, percentage: 0 },
        pacContributions: { amount: 0, percentage: 0, breakdown: [] },
        partyContributions: { amount: 0, percentage: 0 },
        candidateContributions: { amount: 0, percentage: 0 },
        otherContributions: { amount: 0, percentage: 0 },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          fecTransparencyLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
          dataSource: 'FEC.gov Financial Summary - No data available',
        },
      });
    }

    const totalRaised = financialSummary.receipts || financialSummary.total_receipts || 0;
    const individualAmount = financialSummary.individual_contributions || 0;
    const pacAmount = financialSummary.other_political_committee_contributions || 0;
    const partyAmount = financialSummary.political_party_committee_contributions || 0;
    const candidateAmount = financialSummary.candidate_contribution || 0;
    const otherAmount = Math.max(
      0,
      totalRaised - individualAmount - pacAmount - partyAmount - candidateAmount
    );

    const response: FundingSourcesAnalysisResponse = {
      totalRaised,
      individualContributions: {
        amount: individualAmount,
        percentage: totalRaised > 0 ? (individualAmount / totalRaised) * 100 : 0,
      },
      pacContributions: {
        amount: pacAmount,
        percentage: totalRaised > 0 ? (pacAmount / totalRaised) * 100 : 0,
        breakdown: [
          {
            type: 'Other Political Committees',
            amount: pacAmount,
            percentage: totalRaised > 0 ? (pacAmount / totalRaised) * 100 : 0,
          },
        ],
      },
      partyContributions: {
        amount: partyAmount,
        percentage: totalRaised > 0 ? (partyAmount / totalRaised) * 100 : 0,
      },
      candidateContributions: {
        amount: candidateAmount,
        percentage: totalRaised > 0 ? (candidateAmount / totalRaised) * 100 : 0,
      },
      otherContributions: {
        amount: otherAmount,
        percentage: totalRaised > 0 ? (otherAmount / totalRaised) * 100 : 0,
      },
      metadata: {
        bioguideId,
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecTransparencyLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
        dataSource: 'FEC.gov Financial Summary',
      },
    };

    await govCache.set(cacheKey, response, {
      ttl: 21600000,
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Funding Sources API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Funding Sources API] Error', error as Error, { bioguideId });
    return NextResponse.json(
      { error: 'Failed to fetch funding sources analysis' },
      { status: 500 }
    );
  }
}

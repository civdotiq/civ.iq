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
import { fecApiService } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';
import {
  getFECMapping,
  getFECCandidateLink,
  FinanceCacheKeys,
  EmptyFinanceResponses,
  FEC_SHORT_CACHE_OPTIONS,
} from '@/lib/api/finance-helpers';
import { ApiErrors } from '@/lib/api/error-responses';

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
  const cycle = parseInt(request.nextUrl.searchParams.get('cycle') ?? '', 10) || 2024;
  const startTime = Date.now();

  // Unclamped cycles flow into FEC queries and finance cache keys
  if (cycle < 1980 || cycle > 2030) {
    return NextResponse.json(
      { error: 'cycle must be a year between 1980 and 2030' },
      { status: 400 }
    );
  }

  try {
    logger.info('[Funding Sources API] Called', { bioguideId, cycle });

    const cacheKey = FinanceCacheKeys.fundingSources(bioguideId, cycle);
    const cached = await govCache.get<FundingSourcesAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    const fecMapping = getFECMapping(bioguideId);
    if (!fecMapping) {
      return NextResponse.json(EmptyFinanceResponses.fundingSources(bioguideId), {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      });
    }

    const financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, cycle);

    if (!financialSummary) {
      return NextResponse.json(EmptyFinanceResponses.fundingSources(bioguideId, fecMapping.fecId), {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
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
        cycle,
        lastUpdated: new Date().toISOString(),
        fecTransparencyLink: getFECCandidateLink(fecMapping.fecId),
        dataSource: 'FEC.gov Financial Summary',
      },
    };

    await govCache.set(cacheKey, response, FEC_SHORT_CACHE_OPTIONS);

    logger.info('[Funding Sources API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    logger.error('[Funding Sources API] Error', error as Error, { bioguideId });
    return ApiErrors.serverError(error as Error);
  }
}

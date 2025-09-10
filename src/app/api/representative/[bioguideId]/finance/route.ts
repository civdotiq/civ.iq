/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Optimized FEC Finance API Route
 * Provides real campaign finance data from FEC.gov with caching and performance optimizations
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { govCache } from '@/services/cache';

interface FinanceResponse {
  totalRaised: number;
  totalSpent: number;
  cashOnHand: number;
  individualContributions: number;
  pacContributions: number;
  partyContributions: number;
  candidateContributions: number;
  industryBreakdown: unknown[];
  geographicBreakdown: unknown[];
  dataQuality: {
    industry: {
      totalContributionsAnalyzed: number;
      contributionsWithEmployer: number;
      completenessPercentage: number;
    };
    geography: {
      totalContributionsAnalyzed: number;
      contributionsWithState: number;
      completenessPercentage: number;
    };
    overallDataConfidence: 'high' | 'medium' | 'low';
  };
  candidateId: string;
  cycle: number;
  lastUpdated: string;
  fecDataSources: {
    financialSummary: string;
    contributions: string;
  };
  metadata: {
    note?: string;
    bioguideId: string;
    hasFecMapping: boolean;
    cacheHit: boolean;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Finance API] Optimized endpoint called', { bioguideId });

    // Check cache first
    const cacheKey = `finance:${bioguideId}:2024`;
    const cached = await govCache.get<FinanceResponse>(cacheKey);

    if (cached) {
      logger.info('[Finance API] Cache hit', {
        bioguideId,
        responseTime: Date.now() - startTime,
      });

      return NextResponse.json({
        ...cached,
        metadata: {
          ...cached.metadata,
          cacheHit: true,
        },
      });
    }

    // Check if we have FEC mapping for this bioguide ID
    const fecMapping = bioguideToFECMapping[bioguideId];

    if (!fecMapping) {
      logger.warn('[Finance API] No FEC mapping found', { bioguideId });

      const noDataResponse: FinanceResponse = {
        totalRaised: 0,
        totalSpent: 0,
        cashOnHand: 0,
        individualContributions: 0,
        pacContributions: 0,
        partyContributions: 0,
        candidateContributions: 0,
        industryBreakdown: [],
        geographicBreakdown: [],
        dataQuality: {
          industry: {
            totalContributionsAnalyzed: 0,
            contributionsWithEmployer: 0,
            completenessPercentage: 0,
          },
          geography: {
            totalContributionsAnalyzed: 0,
            contributionsWithState: 0,
            completenessPercentage: 0,
          },
          overallDataConfidence: 'low',
        },
        candidateId: '',
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecDataSources: {
          financialSummary: 'No FEC mapping available',
          contributions: 'No FEC mapping available',
        },
        metadata: {
          note: `No FEC candidate ID mapping found for bioguide ${bioguideId}`,
          bioguideId,
          hasFecMapping: false,
          cacheHit: false,
        },
      };

      // Cache the no-mapping response for shorter time
      await govCache.set(cacheKey, noDataResponse, {
        ttl: 3600000, // 1 hour
        source: 'no-fec-mapping',
        dataType: 'finance',
      });

      return NextResponse.json(noDataResponse);
    }

    logger.info('[Finance API] FEC mapping found', {
      bioguideId,
      fecId: fecMapping.fecId,
      name: fecMapping.name,
    });

    // Fetch FEC financial summary for 2024 cycle
    const financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, 2024);

    if (!financialSummary) {
      logger.warn('[Finance API] No FEC financial data found', {
        bioguideId,
        fecId: fecMapping.fecId,
      });

      const noDataResponse: FinanceResponse = {
        totalRaised: 0,
        totalSpent: 0,
        cashOnHand: 0,
        individualContributions: 0,
        pacContributions: 0,
        partyContributions: 0,
        candidateContributions: 0,
        industryBreakdown: [],
        geographicBreakdown: [],
        dataQuality: {
          industry: {
            totalContributionsAnalyzed: 0,
            contributionsWithEmployer: 0,
            completenessPercentage: 0,
          },
          geography: {
            totalContributionsAnalyzed: 0,
            contributionsWithState: 0,
            completenessPercentage: 0,
          },
          overallDataConfidence: 'low',
        },
        candidateId: fecMapping.fecId,
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        fecDataSources: {
          financialSummary: 'No 2024 financial data available',
          contributions: 'No 2024 contribution data available',
        },
        metadata: {
          note: `No FEC financial data available for candidate ${fecMapping.fecId} in 2024 cycle`,
          bioguideId,
          hasFecMapping: true,
          cacheHit: false,
        },
      };

      // Cache the no-data response for shorter time
      await govCache.set(cacheKey, noDataResponse, {
        ttl: 7200000, // 2 hours
        source: 'fec-no-data',
        dataType: 'finance',
      });

      return NextResponse.json(noDataResponse);
    }

    // Process FEC financial summary into our response format
    const response: FinanceResponse = {
      totalRaised: financialSummary.receipts || financialSummary.total_receipts || 0,
      totalSpent: financialSummary.disbursements || financialSummary.total_disbursements || 0,
      cashOnHand:
        financialSummary.last_cash_on_hand_end_period ||
        financialSummary.cash_on_hand_end_period ||
        0,
      individualContributions: financialSummary.individual_contributions || 0,
      pacContributions: financialSummary.other_political_committee_contributions || 0,
      partyContributions: financialSummary.political_party_committee_contributions || 0,
      candidateContributions: financialSummary.candidate_contribution || 0,

      // For now, return empty arrays - detailed breakdown would require contribution analysis
      industryBreakdown: [],
      geographicBreakdown: [],

      dataQuality: {
        industry: {
          totalContributionsAnalyzed: 0,
          contributionsWithEmployer: 0,
          completenessPercentage: 0,
        },
        geography: {
          totalContributionsAnalyzed: 0,
          contributionsWithState: 0,
          completenessPercentage: 0,
        },
        overallDataConfidence: 'high', // FEC official data
      },

      candidateId: fecMapping.fecId,
      cycle: financialSummary.cycle || 2024,
      lastUpdated: new Date().toISOString(),
      fecDataSources: {
        financialSummary: `FEC.gov candidate/${fecMapping.fecId}/totals`,
        contributions: 'Summary data only - detailed contributions not analyzed',
      },

      metadata: {
        bioguideId,
        hasFecMapping: true,
        cacheHit: false,
      },
    };

    // Cache successful response for longer time
    await govCache.set(cacheKey, response, {
      ttl: 21600000, // 6 hours
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Finance API] Successfully returned FEC data', {
      bioguideId,
      fecId: fecMapping.fecId,
      totalRaised: response.totalRaised,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Finance API] Error fetching finance data', error as Error, {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        error: 'Failed to fetch campaign finance data',
        bioguideId,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

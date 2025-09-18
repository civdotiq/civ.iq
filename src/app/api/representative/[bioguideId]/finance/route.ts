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
import { fecApiService, FECContribution } from '@/lib/fec/fec-api-service';
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
  industryBreakdown: Array<{
    sector: string;
    amount: number;
    percentage: number;
  }>;
  geographicBreakdown: Array<{
    state: string;
    amount: number;
    percentage: number;
  }>;
  topContributors: Array<{
    name: string;
    total_amount: number;
    count: number;
    employer?: string;
    occupation?: string;
  }>;
  recentContributions: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
  // Legacy field names for compatibility with existing component
  industry_breakdown?: Array<{
    sector: string;
    amount: number;
    percentage: number;
  }>;
  top_contributors?: Array<{
    name: string;
    total_amount: number;
    count: number;
    employer?: string;
    occupation?: string;
  }>;
  recent_contributions?: Array<{
    contributor_name: string;
    contributor_employer?: string;
    contribution_receipt_amount: number;
    contribution_receipt_date: string;
  }>;
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
  fecTransparencyLinks: {
    candidatePage: string;
    contributions: string;
    disbursements: string;
    financialSummary: string;
  };
  metadata: {
    note?: string;
    bioguideId: string;
    hasFecMapping: boolean;
    cacheHit: boolean;
  };
}

/**
 * Analyze industry breakdown from contribution employer data
 */
function analyzeIndustryBreakdown(contributions: FECContribution[]): Array<{
  sector: string;
  amount: number;
  percentage: number;
}> {
  if (!contributions.length) return [];

  const industryMap = new Map<string, number>();
  let totalAnalyzed = 0;

  contributions.forEach(contrib => {
    if (contrib.contributor_employer && contrib.contributor_employer.trim()) {
      const employer = contrib.contributor_employer.trim().toUpperCase();
      const amount = contrib.contribution_receipt_amount || 0;
      industryMap.set(employer, (industryMap.get(employer) || 0) + amount);
      totalAnalyzed += amount;
    }
  });

  return Array.from(industryMap.entries())
    .map(([sector, amount]) => ({
      sector,
      amount,
      percentage: totalAnalyzed > 0 ? (amount / totalAnalyzed) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

/**
 * Analyze geographic distribution from contributor state data
 */
function analyzeGeographicBreakdown(contributions: FECContribution[]): Array<{
  state: string;
  amount: number;
  percentage: number;
}> {
  if (!contributions.length) return [];

  const stateMap = new Map<string, number>();
  let totalAnalyzed = 0;

  contributions.forEach(contrib => {
    if (contrib.contributor_state && contrib.contributor_state.trim()) {
      const state = contrib.contributor_state.trim().toUpperCase();
      const amount = contrib.contribution_receipt_amount || 0;
      stateMap.set(state, (stateMap.get(state) || 0) + amount);
      totalAnalyzed += amount;
    }
  });

  return Array.from(stateMap.entries())
    .map(([state, amount]) => ({
      state,
      amount,
      percentage: totalAnalyzed > 0 ? (amount / totalAnalyzed) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 10);
}

/**
 * Analyze top contributors from contribution data
 */
function analyzeTopContributors(contributions: FECContribution[]): Array<{
  name: string;
  total_amount: number;
  count: number;
  employer?: string;
  occupation?: string;
}> {
  if (!contributions.length) return [];

  const contributorMap = new Map<
    string,
    {
      total_amount: number;
      count: number;
      employer?: string;
      occupation?: string;
    }
  >();

  contributions.forEach(contrib => {
    if (contrib.contributor_name && contrib.contributor_name.trim()) {
      const name = contrib.contributor_name.trim();
      const amount = contrib.contribution_receipt_amount || 0;
      const existing = contributorMap.get(name) || { total_amount: 0, count: 0 };

      contributorMap.set(name, {
        total_amount: existing.total_amount + amount,
        count: existing.count + 1,
        employer: contrib.contributor_employer || existing.employer,
        occupation: contrib.contributor_occupation || existing.occupation,
      });
    }
  });

  return Array.from(contributorMap.entries())
    .map(([name, data]) => ({
      name,
      ...data,
    }))
    .sort((a, b) => b.total_amount - a.total_amount)
    .slice(0, 20);
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

    // Debug: Log mapping check
    logger.info('[Finance API DEBUG] Mapping check', {
      bioguideId,
      hasFecMapping: !!fecMapping,
      fecId: fecMapping?.fecId || 'none',
    });

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
        topContributors: [],
        recentContributions: [],
        // Legacy compatibility
        industry_breakdown: [],
        top_contributors: [],
        recent_contributions: [],
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
        fecTransparencyLinks: {
          candidatePage: '',
          contributions: '',
          disbursements: '',
          financialSummary: '',
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
        topContributors: [],
        recentContributions: [],
        // Legacy compatibility
        industry_breakdown: [],
        top_contributors: [],
        recent_contributions: [],
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
        fecTransparencyLinks: {
          candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
          contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
          disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
          financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
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

    // Fetch sample contributions for detailed analysis
    logger.info('[Finance API] Fetching sample contributions for detailed analysis', {
      bioguideId,
      fecId: fecMapping.fecId,
    });

    const sampleContributions = await fecApiService.getSampleContributions(
      fecMapping.fecId,
      2024,
      200
    );

    // Analyze industry breakdown from employer data
    const industryBreakdown = analyzeIndustryBreakdown(sampleContributions);

    // Analyze geographic distribution
    const geographicBreakdown = analyzeGeographicBreakdown(sampleContributions);

    // Get top contributors
    const topContributors = analyzeTopContributors(sampleContributions);

    // Get recent contributions (last 20)
    const recentContributions = sampleContributions
      .sort(
        (a, b) =>
          new Date(b.contribution_receipt_date).getTime() -
          new Date(a.contribution_receipt_date).getTime()
      )
      .slice(0, 20)
      .map(contrib => ({
        contributor_name: contrib.contributor_name,
        contributor_employer: contrib.contributor_employer || undefined,
        contribution_receipt_amount: contrib.contribution_receipt_amount,
        contribution_receipt_date: contrib.contribution_receipt_date,
      }));

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

      // Real analyzed data from FEC contributions
      industryBreakdown,
      geographicBreakdown,
      topContributors,
      recentContributions,
      // Legacy compatibility for existing component
      industry_breakdown: industryBreakdown,
      top_contributors: topContributors,
      recent_contributions: recentContributions,

      dataQuality: {
        industry: {
          totalContributionsAnalyzed: sampleContributions.length,
          contributionsWithEmployer: sampleContributions.filter(c => c.contributor_employer?.trim())
            .length,
          completenessPercentage:
            sampleContributions.length > 0
              ? Math.round(
                  (sampleContributions.filter(c => c.contributor_employer?.trim()).length /
                    sampleContributions.length) *
                    100
                )
              : 0,
        },
        geography: {
          totalContributionsAnalyzed: sampleContributions.length,
          contributionsWithState: sampleContributions.filter(c => c.contributor_state?.trim())
            .length,
          completenessPercentage:
            sampleContributions.length > 0
              ? Math.round(
                  (sampleContributions.filter(c => c.contributor_state?.trim()).length /
                    sampleContributions.length) *
                    100
                )
              : 0,
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
      fecTransparencyLinks: {
        candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
        contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
        disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
        financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
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

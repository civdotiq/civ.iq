/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Comprehensive Finance API Route - OPTIMIZED FOR PERFORMANCE
 * Returns ALL finance data in a single request:
 * - Basic finance summary (Total Raised, Spent, Cash on Hand)
 * - Top contributors with deduplication
 * - Industry breakdown
 * - Contribution trends
 * - Conduit aggregates (ActBlue/WinRed)
 *
 * This endpoint consolidates 3 separate API calls into one,
 * reducing network round-trips and improving perceived performance.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';

interface ComprehensiveFinanceResponse {
  // Basic Finance Summary
  finance: {
    totalRaised: number;
    totalSpent: number;
    cashOnHand: number;
    individualContributions: number;
    pacContributions: number;
    partyContributions: number;
    candidateContributions: number;
    candidateId?: string;
    fecTransparencyLinks?: {
      candidatePage: string;
      contributions: string;
      disbursements: string;
      financialSummary: string;
    };
  };

  // Top Contributors
  contributors: {
    topContributors: Array<{
      name: string;
      totalAmount: number;
      contributionCount: number;
      city: string;
      state: string;
      employer: string;
      occupation: string;
      fecTransparencyLink: string;
      isCommittee?: boolean;
    }>;
    conduitAggregates?: {
      actblue?: {
        totalAmount: number;
        contributionCount: number;
        individualDonors: number;
      };
      winred?: {
        totalAmount: number;
        contributionCount: number;
        individualDonors: number;
      };
    };
    contributionTrends?: Array<{
      month: string;
      amount: number;
      count: number;
    }>;
    metadata: {
      totalIndividualContributors: number;
      totalCommitteeContributors: number;
      fecCandidateLink?: string;
      fecCommitteeId?: string;
      fecReceiptsLink?: string;
    };
  };

  // Industry Breakdown
  industries: {
    topIndustries: Array<{
      industry: string;
      amount: number;
      percentage: number;
      contributionCount: number;
    }>;
    metadata: {
      totalAnalyzed: number;
    };
  };

  // Metadata
  metadata: {
    bioguideId: string;
    cycle: number;
    lastUpdated: string;
    cacheHit: boolean;
    sampleSize: number;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Comprehensive Finance API] Called', { bioguideId });

    // Check unified cache first
    const cacheKey = `finance-comprehensive:${bioguideId}:2024`;
    const cached = await govCache.get<ComprehensiveFinanceResponse>(cacheKey);

    if (cached) {
      logger.info('[Comprehensive Finance API] Cache hit', {
        bioguideId,
        responseTime: Date.now() - startTime,
      });
      return NextResponse.json({
        ...cached,
        metadata: { ...cached.metadata, cacheHit: true },
      });
    }

    // Check FEC mapping
    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) {
      const noDataResponse: ComprehensiveFinanceResponse = {
        finance: {
          totalRaised: 0,
          totalSpent: 0,
          cashOnHand: 0,
          individualContributions: 0,
          pacContributions: 0,
          partyContributions: 0,
          candidateContributions: 0,
        },
        contributors: {
          topContributors: [],
          metadata: {
            totalIndividualContributors: 0,
            totalCommitteeContributors: 0,
          },
        },
        industries: {
          topIndustries: [],
          metadata: {
            totalAnalyzed: 0,
          },
        },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          cacheHit: false,
          sampleSize: 0,
        },
      };

      return NextResponse.json(noDataResponse);
    }

    // Fetch financial summary from FEC
    const financialSummary = await fecApiService.getFinancialSummary(fecMapping.fecId, 2024);

    if (!financialSummary) {
      const noDataResponse: ComprehensiveFinanceResponse = {
        finance: {
          totalRaised: 0,
          totalSpent: 0,
          cashOnHand: 0,
          individualContributions: 0,
          pacContributions: 0,
          partyContributions: 0,
          candidateContributions: 0,
          candidateId: fecMapping.fecId,
          fecTransparencyLinks: {
            candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
            contributions: `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
            disbursements: `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
            financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
          },
        },
        contributors: {
          topContributors: [],
          metadata: {
            totalIndividualContributors: 0,
            totalCommitteeContributors: 0,
          },
        },
        industries: {
          topIndustries: [],
          metadata: {
            totalAnalyzed: 0,
          },
        },
        metadata: {
          bioguideId,
          cycle: 2024,
          lastUpdated: new Date().toISOString(),
          cacheHit: false,
          sampleSize: 0,
        },
      };

      return NextResponse.json(noDataResponse);
    }

    // Fetch sample contributions for detailed analysis (optimized to 250 records)
    const contributions = await fecApiService.getSampleContributions(fecMapping.fecId, 2024, 250);

    // Process contributors
    const contributorMap = new Map<
      string,
      {
        name: string;
        totalAmount: number;
        contributionCount: number;
        city: string;
        state: string;
        employer: string;
        occupation: string;
        isCommittee?: boolean;
      }
    >();

    const conduitStats = {
      actblue: { totalAmount: 0, contributionCount: 0, uniqueDonors: new Set<string>() },
      winred: { totalAmount: 0, contributionCount: 0, uniqueDonors: new Set<string>() },
    };

    const trendMap = new Map<string, { amount: number; count: number }>();
    const industryMap = new Map<string, { amount: number; count: number }>();

    // Single pass through contributions - process everything at once
    for (const contribution of contributions) {
      const name = contribution.contributor_name || 'Unknown';
      const nameUpper = name.toUpperCase();
      const amount = contribution.contribution_receipt_amount || 0;
      const date = contribution.contribution_receipt_date;

      // Track monthly trends
      if (date) {
        const monthKey = date.substring(0, 7); // YYYY-MM
        const existing = trendMap.get(monthKey) || { amount: 0, count: 0 };
        trendMap.set(monthKey, {
          amount: existing.amount + amount,
          count: existing.count + 1,
        });
      }

      // Track industries
      if (contribution.contributor_employer && contribution.contributor_employer.trim()) {
        const employer = contribution.contributor_employer.trim().toUpperCase();
        const existing = industryMap.get(employer) || { amount: 0, count: 0 };
        industryMap.set(employer, {
          amount: existing.amount + amount,
          count: existing.count + 1,
        });
      }

      // Identify conduits
      const isActBlue = nameUpper.includes('ACTBLUE');
      const isWinRed = nameUpper.includes('WINRED');
      const isConduit = isActBlue || isWinRed;

      // Track conduit stats
      if (isActBlue) {
        conduitStats.actblue.totalAmount += amount;
        conduitStats.actblue.contributionCount += 1;
        if (contribution.contributor_city && contribution.contributor_state) {
          conduitStats.actblue.uniqueDonors.add(
            `${contribution.contributor_city}-${contribution.contributor_state}`
          );
        }
      } else if (isWinRed) {
        conduitStats.winred.totalAmount += amount;
        conduitStats.winred.contributionCount += 1;
        if (contribution.contributor_city && contribution.contributor_state) {
          conduitStats.winred.uniqueDonors.add(
            `${contribution.contributor_city}-${contribution.contributor_state}`
          );
        }
      }

      // Skip conduits from main contributor list
      if (isConduit) continue;

      // Identify committees
      const isCommittee =
        nameUpper.includes('PAC') ||
        nameUpper.includes('COMMITTEE') ||
        nameUpper.includes('DCCC') ||
        nameUpper.includes('NRCC') ||
        nameUpper.includes('DSCC') ||
        nameUpper.includes('NRSC') ||
        nameUpper.includes(' FOR ') ||
        nameUpper.includes('FUND');

      const existing = contributorMap.get(name);
      if (existing) {
        existing.totalAmount += amount;
        existing.contributionCount += 1;
      } else {
        contributorMap.set(name, {
          name,
          totalAmount: amount,
          contributionCount: 1,
          city: contribution.contributor_city || '',
          state: contribution.contributor_state || '',
          employer: contribution.contributor_employer || '',
          occupation: contribution.contributor_occupation || '',
          isCommittee,
        });
      }
    }

    // Get principal committee ID for FEC links
    const principalCommitteeId = await fecApiService.getPrincipalCommitteeId(
      fecMapping.fecId,
      2024
    );

    // Format contributors
    const allContributors = Array.from(contributorMap.values());
    const individualContributors = allContributors
      .filter(c => !c.isCommittee)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const topContributors = individualContributors.slice(0, 50).map(contributor => ({
      ...contributor,
      fecTransparencyLink: principalCommitteeId
        ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=2024&committee_id=${principalCommitteeId}&contributor_name=${encodeURIComponent(contributor.name)}`
        : `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(contributor.name)}&candidate_id=${fecMapping.fecId}`,
    }));

    // Format contribution trends (last 12 months)
    const contributionTrends = Array.from(trendMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12);

    // Format industries
    const totalIndustryAmount = Array.from(industryMap.values()).reduce(
      (sum, i) => sum + i.amount,
      0
    );
    const topIndustries = Array.from(industryMap.entries())
      .map(([industry, data]) => ({
        industry,
        amount: data.amount,
        percentage: totalIndustryAmount > 0 ? (data.amount / totalIndustryAmount) * 100 : 0,
        contributionCount: data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);

    // Build comprehensive response
    const response: ComprehensiveFinanceResponse = {
      finance: {
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
        candidateId: fecMapping.fecId,
        fecTransparencyLinks: {
          candidatePage: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
          contributions: principalCommitteeId
            ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=2024&committee_id=${principalCommitteeId}`
            : `https://www.fec.gov/data/receipts/individual-contributions/?candidate_id=${fecMapping.fecId}`,
          disbursements: principalCommitteeId
            ? `https://www.fec.gov/data/disbursements/?two_year_transaction_period=2024&committee_id=${principalCommitteeId}`
            : `https://www.fec.gov/data/disbursements/?candidate_id=${fecMapping.fecId}`,
          financialSummary: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/totals`,
        },
      },
      contributors: {
        topContributors,
        conduitAggregates: {
          ...(conduitStats.actblue.contributionCount > 0 && {
            actblue: {
              totalAmount: conduitStats.actblue.totalAmount,
              contributionCount: conduitStats.actblue.contributionCount,
              individualDonors: conduitStats.actblue.uniqueDonors.size,
            },
          }),
          ...(conduitStats.winred.contributionCount > 0 && {
            winred: {
              totalAmount: conduitStats.winred.totalAmount,
              contributionCount: conduitStats.winred.contributionCount,
              individualDonors: conduitStats.winred.uniqueDonors.size,
            },
          }),
        },
        contributionTrends,
        metadata: {
          totalIndividualContributors: individualContributors.length,
          totalCommitteeContributors: allContributors.filter(c => c.isCommittee).length,
          fecCandidateLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/`,
          fecCommitteeId: principalCommitteeId || undefined,
          fecReceiptsLink: principalCommitteeId
            ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=2024&committee_id=${principalCommitteeId}`
            : undefined,
        },
      },
      industries: {
        topIndustries,
        metadata: {
          totalAnalyzed: contributions.length,
        },
      },
      metadata: {
        bioguideId,
        cycle: 2024,
        lastUpdated: new Date().toISOString(),
        cacheHit: false,
        sampleSize: contributions.length,
      },
    };

    // Cache the comprehensive response
    await govCache.set(cacheKey, response, {
      ttl: 3600000, // 1 hour aligned with FEC cache policy
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Comprehensive Finance API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
      sampleSize: contributions.length,
    });

    // Add HTTP cache headers
    const headers = new Headers({
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=1800',
      'CDN-Cache-Control': 'public, max-age=3600',
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(response, { headers });
  } catch (error) {
    logger.error('[Comprehensive Finance API] Error', error as Error, { bioguideId });
    return NextResponse.json(
      { error: 'Failed to fetch comprehensive finance data' },
      { status: 500 }
    );
  }
}

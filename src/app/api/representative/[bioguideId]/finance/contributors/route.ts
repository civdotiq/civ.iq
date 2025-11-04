/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Top Individual Contributors Analysis API Route
 * Provides detailed breakdown of individual contributors with FEC transparency links
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { bioguideToFECMapping } from '@/lib/data/bioguide-fec-mapping';
import { fecApiService } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';

interface ContributorAnalysisResponse {
  topContributors: Array<{
    name: string;
    totalAmount: number;
    contributionCount: number;
    city: string;
    state: string;
    employer: string;
    occupation: string;
    contributions: Array<{
      amount: number;
      date: string;
    }>;
    fecTransparencyLink: string;
    isConduit?: boolean;
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
    bioguideId: string;
    cycle: number;
    totalContributors: number;
    totalIndividualContributors: number;
    totalCommitteeContributors: number;
    lastUpdated: string;
    fecCandidateLink: string;
    fecCommitteeId?: string;
    fecReceiptsLink?: string;
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const startTime = Date.now();

  try {
    logger.info('[Contributors API] Called', { bioguideId });

    const cacheKey = `finance-contributors-v2:${bioguideId}:2024`;
    const cached = await govCache.get<ContributorAnalysisResponse>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const fecMapping = bioguideToFECMapping[bioguideId];
    if (!fecMapping) {
      return NextResponse.json({
        topContributors: [],
        metadata: {
          bioguideId,
          cycle: 2024,
          totalContributors: 0,
          lastUpdated: new Date().toISOString(),
          fecCandidateLink: '',
        },
      });
    }

    // Fetch optimized sample of contributions for detailed analysis
    // Reduced from 2000 to 250 for better performance while maintaining data quality
    const contributions = await fecApiService.getSampleContributions(fecMapping.fecId, 2024, 250);

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
        contributions: Array<{ amount: number; date: string }>;
        isConduit?: boolean;
        isCommittee?: boolean;
      }
    >();

    // Track conduits and committees separately
    const conduitStats = {
      actblue: { totalAmount: 0, contributionCount: 0, uniqueDonors: new Set<string>() },
      winred: { totalAmount: 0, contributionCount: 0, uniqueDonors: new Set<string>() },
    };

    // Track contribution trends by month
    const trendMap = new Map<string, { amount: number; count: number }>();

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

      // Identify and track conduits
      const isActBlue = nameUpper.includes('ACTBLUE');
      const isWinRed = nameUpper.includes('WINRED');
      const isConduit = isActBlue || isWinRed;

      // Identify committees (contains PAC, COMMITTEE, DCCC, NRCC, etc.)
      const isCommittee =
        !isConduit &&
        (nameUpper.includes('PAC') ||
          nameUpper.includes('COMMITTEE') ||
          nameUpper.includes('DCCC') ||
          nameUpper.includes('NRCC') ||
          nameUpper.includes('DSCC') ||
          nameUpper.includes('NRSC') ||
          nameUpper.includes(' FOR ') || // "CANDIDATE FOR CONGRESS" patterns
          nameUpper.includes('FUND'));

      // Track conduit stats separately
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

      const existing = contributorMap.get(name);

      if (existing) {
        existing.totalAmount += amount;
        existing.contributionCount += 1;
        existing.contributions.push({ amount, date });
      } else {
        contributorMap.set(name, {
          name,
          totalAmount: amount,
          contributionCount: 1,
          city: contribution.contributor_city || '',
          state: contribution.contributor_state || '',
          employer: contribution.contributor_employer || '',
          occupation: contribution.contributor_occupation || '',
          contributions: [{ amount, date }],
          isCommittee,
        });
      }
    }

    // Separate individual contributors from committees
    const allContributors = Array.from(contributorMap.values());
    const individualContributors = allContributors
      .filter(c => !c.isCommittee)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    const committeeContributors = allContributors
      .filter(c => c.isCommittee)
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Get committee ID for better FEC links
    const principalCommitteeId = await fecApiService.getPrincipalCommitteeId(
      fecMapping.fecId,
      2024
    );

    // Take top 50 individual contributors (committees shown separately)
    const topContributors = individualContributors.slice(0, 50).map(contributor => ({
      ...contributor,
      fecTransparencyLink: principalCommitteeId
        ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=2024&committee_id=${principalCommitteeId}&contributor_name=${encodeURIComponent(contributor.name)}`
        : `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(contributor.name)}&candidate_id=${fecMapping.fecId}`,
    }));

    // Convert trend map to sorted array
    const contributionTrends = Array.from(trendMap.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12); // Last 12 months

    const response: ContributorAnalysisResponse = {
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
        bioguideId,
        cycle: 2024,
        totalContributors:
          contributorMap.size +
          (conduitStats.actblue.contributionCount > 0 ? 1 : 0) +
          (conduitStats.winred.contributionCount > 0 ? 1 : 0),
        totalIndividualContributors: individualContributors.length,
        totalCommitteeContributors: committeeContributors.length,
        lastUpdated: new Date().toISOString(),
        fecCandidateLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}/`,
        fecCommitteeId: principalCommitteeId || undefined,
        fecReceiptsLink: principalCommitteeId
          ? `https://www.fec.gov/data/receipts/?two_year_transaction_period=2024&committee_id=${principalCommitteeId}`
          : undefined,
      },
    };

    // FEC data updates quarterly - 30 day cache (2592000000ms = 30 days)
    await govCache.set(cacheKey, response, {
      ttl: 2592000000,
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Contributors API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    // Add HTTP cache headers - FEC data updates quarterly (30 day cache)
    const headers = new Headers({
      'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
      'CDN-Cache-Control': 'public, max-age=2592000',
      Vary: 'Accept-Encoding',
    });

    return NextResponse.json(response, { headers });
  } catch (error) {
    logger.error('[Contributors API] Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Failed to fetch contributor analysis' }, { status: 500 });
  }
}

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
  }>;
  metadata: {
    bioguideId: string;
    cycle: number;
    totalContributors: number;
    lastUpdated: string;
    fecCandidateLink: string;
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

    const cacheKey = `finance-contributors:${bioguideId}:2024`;
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

    const contributions = await fecApiService.getSampleContributions(fecMapping.fecId, 2024, 1000);

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
      }
    >();

    for (const contribution of contributions) {
      const name = contribution.contributor_name || 'Unknown';
      const existing = contributorMap.get(name);

      if (existing) {
        existing.totalAmount += contribution.contribution_receipt_amount || 0;
        existing.contributionCount += 1;
        existing.contributions.push({
          amount: contribution.contribution_receipt_amount || 0,
          date: contribution.contribution_receipt_date,
        });
      } else {
        contributorMap.set(name, {
          name,
          totalAmount: contribution.contribution_receipt_amount || 0,
          contributionCount: 1,
          city: contribution.contributor_city || '',
          state: contribution.contributor_state || '',
          employer: contribution.contributor_employer || '',
          occupation: contribution.contributor_occupation || '',
          contributions: [
            {
              amount: contribution.contribution_receipt_amount || 0,
              date: contribution.contribution_receipt_date,
            },
          ],
        });
      }
    }

    const topContributors = Array.from(contributorMap.values())
      .sort((a, b) => b.totalAmount - a.totalAmount)
      .slice(0, 50)
      .map(contributor => ({
        ...contributor,
        fecTransparencyLink: `https://www.fec.gov/data/receipts/individual-contributions/?contributor_name=${encodeURIComponent(contributor.name)}&candidate_id=${fecMapping.fecId}`,
      }));

    const response: ContributorAnalysisResponse = {
      topContributors,
      metadata: {
        bioguideId,
        cycle: 2024,
        totalContributors: contributorMap.size,
        lastUpdated: new Date().toISOString(),
        fecCandidateLink: `https://www.fec.gov/data/candidate/${fecMapping.fecId}`,
      },
    };

    await govCache.set(cacheKey, response, {
      ttl: 21600000,
      source: 'fec-api',
      dataType: 'finance',
    });

    logger.info('[Contributors API] Success', {
      bioguideId,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('[Contributors API] Error', error as Error, { bioguideId });
    return NextResponse.json({ error: 'Failed to fetch contributor analysis' }, { status: 500 });
  }
}

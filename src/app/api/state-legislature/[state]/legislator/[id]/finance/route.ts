/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Campaign Finance API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/finance
 * Returns campaign finance data from FollowTheMoney.org.
 * Graceful degradation: returns empty data when API key is missing or no match found.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { decodeBase64Url } from '@/lib/url-encoding';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import type { StateLegislatorFinance } from '@/types/state-legislature';

// Finance data is cached for 24 hours
export const revalidate = 86400;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id);
    const stateCode = normalizeStateIdentifier(state);

    if (!stateCode || !legislatorId) {
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
    }

    // Check if FTM API key is configured
    if (!process.env.FOLLOWTHEMONEY_API_KEY) {
      logger.info('FollowTheMoney API key not configured, returning empty finance data', {
        state: stateCode,
        legislatorId,
      });

      return NextResponse.json({
        success: true,
        finance: buildEmptyFinance(legislatorId, stateCode),
        message: 'Campaign finance data source not configured',
      });
    }

    // Verify legislator exists
    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      stateCode,
      legislatorId
    );

    if (!legislator) {
      return NextResponse.json(
        { success: false, error: 'State legislator not found' },
        { status: 404 }
      );
    }

    // Check cache for finance data
    const cacheKey = `finance:state:${stateCode}:${legislatorId}`;
    const cached = await govCache.get<StateLegislatorFinance>(cacheKey);
    if (cached) {
      return NextResponse.json({
        success: true,
        finance: cached,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          party: legislator.party,
        },
      });
    }

    // Dynamically import FTM modules only when API key is configured
    // This prevents build errors when the key isn't set
    const { resolveFTMEntityId, ftmApiService } = await import('@/lib/follow-the-money');

    // Resolve FTM entity ID
    const entityId = await resolveFTMEntityId(legislator);

    if (!entityId) {
      const emptyFinance = buildEmptyFinance(legislatorId, stateCode);
      return NextResponse.json({
        success: true,
        finance: emptyFinance,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          party: legislator.party,
        },
        message: 'No campaign finance records found for this legislator',
      });
    }

    // Fetch finance data in parallel
    const [entity, industries] = await Promise.allSettled([
      ftmApiService.getEntityDetails(entityId),
      ftmApiService.getIndustryBreakdown(entityId),
    ]);

    const entityData = entity.status === 'fulfilled' ? entity.value : null;
    const industryData = industries.status === 'fulfilled' ? industries.value : [];

    const finance: StateLegislatorFinance = {
      legislatorId,
      state: stateCode,
      entityId,
      totalContributions: entityData?.total_$ ? parseFloat(entityData.total_$) : undefined,
      topIndustries: industryData.slice(0, 10).map(ind => ({
        industry: ind.Sector_Long ?? ind.Sector ?? 'Unknown',
        amount: ind.Total_$ ? parseFloat(ind.Total_$) : 0,
        count: ind.Num_Contributions ? parseInt(ind.Num_Contributions, 10) : 0,
      })),
      electionCycles: entityData?.year
        ? [
            {
              year: entityData.year,
              raised: entityData.total_$ ? parseFloat(entityData.total_$) : 0,
              spent: 0, // FTM doesn't provide spending in search results
              office: entityData.office ?? '',
            },
          ]
        : [],
      lastUpdated: new Date().toISOString(),
      source: 'followthemoney',
    };

    // Cache the finance data
    await govCache.set(cacheKey, finance, {
      ttl: 86400000, // 24 hours
      source: 'followthemoney',
      dataType: 'finance',
    });

    logger.info('State legislator finance request successful', {
      state: stateCode,
      legislatorId,
      legislatorName: legislator.name,
      entityId,
      hasData: !!entityData,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        finance,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          party: legislator.party,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
        },
      }
    );
  } catch (error) {
    logger.error('State legislator finance request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch campaign finance data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function buildEmptyFinance(legislatorId: string, state: string): StateLegislatorFinance {
  return {
    legislatorId,
    state,
    lastUpdated: new Date().toISOString(),
    source: 'unavailable',
  };
}

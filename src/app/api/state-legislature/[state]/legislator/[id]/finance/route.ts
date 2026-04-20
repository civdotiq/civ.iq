/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Campaign Finance API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/finance
 *
 * Returns a BackboneResponse so consumers can distinguish between
 * "this legislator has no recorded contributions" and "we cannot answer
 * the question right now." See docs/COVERAGE.md.
 *
 * Two branches, by design:
 *
 *   ACTIVE (default today, 2026-04): FOLLOWTHEMONEY_API_KEY absent →
 *   503 with dataQuality: 'unavailable' and an OpenSecrets-merger note.
 *   This is the branch every request hits right now — FollowTheMoney.org
 *   is in maintenance mode during the OpenSecrets merger and no usable
 *   key exists. Pinned by src/__tests__/api/state-legislature/
 *   legislator-finance.test.ts.
 *
 *   DORMANT (kept as documentation): FOLLOWTHEMONEY_API_KEY present →
 *   fetchWithSourceStatus() → shaped BackboneResponse with industry
 *   breakdown, totals, and election cycles. This is the shape the route
 *   will return once FollowTheMoney's OpenSecrets-era API comes back.
 *   Do NOT delete this branch as "dead code" — it is the contract future
 *   clients will depend on, and preserving it here means the switch-on
 *   is a config change, not a code change.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { decodeBase64Url } from '@/lib/url-encoding';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';
import { govCache } from '@/services/cache';
import {
  fetchWithSourceStatus,
  computeDataQuality,
  type DataQuality,
  type SourceStatus,
} from '@/types/backbone-response';
import type { StateLegislatorFinance } from '@/types/state-legislature';

export const revalidate = 86400;

const FTM_UNAVAILABLE_NOTE =
  'State campaign finance is not currently available. FollowTheMoney.org is in maintenance mode during the OpenSecrets merger; no replacement aggregator with cross-state coverage exists. See docs/COVERAGE.md for current status.';

interface StateLegislatorFinanceResponse {
  legislator: { id: string; name: string; party?: string } | null;
  finance: StateLegislatorFinance;
  dataQuality: DataQuality;
  sourceStatus: SourceStatus[];
  metadata: {
    dataSource: string;
    lastUpdated: string;
    note: string;
  };
}

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
      return NextResponse.json({ error: 'State and legislator ID are required' }, { status: 400 });
    }

    const ftmConfigured = Boolean(process.env.FOLLOWTHEMONEY_API_KEY);

    if (!ftmConfigured) {
      const sourceStatus: SourceStatus = {
        source: 'followthemoney',
        status: 'not-configured',
        errorMessage: 'FOLLOWTHEMONEY_API_KEY not configured',
        fetchedAt: new Date().toISOString(),
      };

      logger.info('State legislator finance request — FTM not configured', {
        state: stateCode,
        legislatorId,
      });

      const response: StateLegislatorFinanceResponse = {
        legislator: null,
        finance: buildEmptyFinance(legislatorId, stateCode),
        dataQuality: 'unavailable',
        sourceStatus: [sourceStatus],
        metadata: {
          dataSource: 'followthemoney',
          lastUpdated: new Date().toISOString(),
          note: FTM_UNAVAILABLE_NOTE,
        },
      };

      return NextResponse.json(response, {
        status: 503,
        headers: { 'Cache-Control': 'no-cache' },
      });
    }

    const legislator = await StateLegislatureCoreService.getStateLegislatorById(
      stateCode,
      legislatorId
    );

    if (!legislator) {
      return NextResponse.json({ error: 'State legislator not found' }, { status: 404 });
    }

    const cacheKey = `finance:state:${stateCode}:${legislatorId}`;
    const cached = await govCache.get<StateLegislatorFinance>(cacheKey);
    if (cached) {
      const response: StateLegislatorFinanceResponse = {
        legislator: { id: legislator.id, name: legislator.name, party: legislator.party },
        finance: cached,
        dataQuality: cached.entityId ? 'complete' : 'empty',
        sourceStatus: [
          {
            source: 'followthemoney',
            status: 'ok',
            fetchedAt: cached.lastUpdated,
          },
        ],
        metadata: {
          dataSource: 'followthemoney',
          lastUpdated: cached.lastUpdated,
          note: cached.entityId
            ? 'Cached campaign finance data from FollowTheMoney.org.'
            : 'No campaign finance records found for this legislator at FollowTheMoney.org.',
        },
      };
      return NextResponse.json(response);
    }

    const { resolveFTMEntityId, ftmApiService } = await import('@/lib/follow-the-money');

    const entityId = await resolveFTMEntityId(legislator);

    if (!entityId) {
      const finance = buildEmptyFinance(legislatorId, stateCode);
      const response: StateLegislatorFinanceResponse = {
        legislator: { id: legislator.id, name: legislator.name, party: legislator.party },
        finance,
        dataQuality: 'empty',
        sourceStatus: [
          {
            source: 'followthemoney',
            status: 'ok',
            fetchedAt: finance.lastUpdated,
          },
        ],
        metadata: {
          dataSource: 'followthemoney',
          lastUpdated: finance.lastUpdated,
          note: 'No campaign finance records found for this legislator at FollowTheMoney.org.',
        },
      };
      return NextResponse.json(response);
    }

    const { data: entityData, sourceStatus: entityStatus } = await fetchWithSourceStatus(
      'followthemoney',
      () => ftmApiService.getEntityDetails(entityId),
      null
    );
    const { data: industryData, sourceStatus: industryStatus } = await fetchWithSourceStatus(
      'followthemoney',
      () => ftmApiService.getIndustryBreakdown(entityId),
      [] as Awaited<ReturnType<typeof ftmApiService.getIndustryBreakdown>>
    );

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
              spent: 0,
              office: entityData.office ?? '',
            },
          ]
        : [],
      lastUpdated: new Date().toISOString(),
      source: 'followthemoney',
    };

    await govCache.set(cacheKey, finance, {
      ttl: 86400000,
      source: 'followthemoney',
      dataType: 'finance',
    });

    const sourceStatuses = [entityStatus, industryStatus];
    const dataIsEmpty = !entityData && industryData.length === 0;
    const dataQuality = computeDataQuality(sourceStatuses, dataIsEmpty);

    const note =
      dataQuality === 'unavailable'
        ? `FollowTheMoney.org request failed: ${entityStatus.errorMessage ?? industryStatus.errorMessage ?? 'unknown error'}.`
        : dataQuality === 'empty'
          ? 'No campaign finance records found for this legislator at FollowTheMoney.org.'
          : dataQuality === 'partial'
            ? 'Partial data — one of the FollowTheMoney endpoints did not respond.'
            : 'Campaign finance data from FollowTheMoney.org.';

    logger.info('State legislator finance request completed', {
      state: stateCode,
      legislatorId,
      legislatorName: legislator.name,
      entityId,
      dataQuality,
      responseTime: Date.now() - startTime,
    });

    const response: StateLegislatorFinanceResponse = {
      legislator: { id: legislator.id, name: legislator.name, party: legislator.party },
      finance,
      dataQuality,
      sourceStatus: sourceStatuses,
      metadata: {
        dataSource: 'followthemoney',
        lastUpdated: finance.lastUpdated,
        note,
      },
    };

    return NextResponse.json(response, {
      status: dataQuality === 'unavailable' ? 503 : 200,
      headers: {
        'Cache-Control':
          dataQuality === 'unavailable'
            ? 'no-cache'
            : 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    });
  } catch (error) {
    logger.error('State legislator finance request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json({ error: 'Failed to fetch campaign finance data' }, { status: 500 });
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

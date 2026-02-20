/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Enrichment API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/vote-enrichment
 * Returns enriched voting analysis: party-line alignment, topic categorization,
 * key votes, and attendance rates.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { VoteEnrichmentService } from '@/services/enrichment/vote-enrichment.service';
import { decodeBase64Url } from '@/lib/url-encoding';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import logger from '@/lib/logging/simple-logger';

// Enrichment data changes as new votes are cast — revalidate hourly
export const revalidate = 3600;

export async function GET(
  request: NextRequest,
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

    // Verify the legislator exists and get their party
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

    // Compute enrichment
    const enrichment = await VoteEnrichmentService.enrichVotes(
      stateCode,
      legislatorId,
      legislator.party
    );

    logger.info('Vote enrichment request successful', {
      state: stateCode,
      legislatorId,
      legislatorName: legislator.name,
      votesAnalyzed: enrichment.totalVotesAnalyzed,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        enrichment,
        legislator: {
          id: legislator.id,
          name: legislator.name,
          party: legislator.party,
          chamber: legislator.chamber,
          district: legislator.district,
        },
        state: stateCode,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        },
      }
    );
  } catch (error) {
    logger.error('Vote enrichment request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to compute vote enrichment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

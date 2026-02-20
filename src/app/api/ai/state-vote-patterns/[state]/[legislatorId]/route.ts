/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Vote Patterns AI Analysis API
 *
 * GET /api/ai/state-vote-patterns/[state]/[legislatorId]
 * Returns an AI-generated plain language analysis of a state legislator's voting patterns.
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import { VoteEnrichmentService } from '@/services/enrichment/vote-enrichment.service';
import { StateVotePatternAnalyzer } from '@/features/legislation/services/ai/state-vote-pattern-analyzer';
import { normalizeStateIdentifier } from '@/lib/data/us-states';
import { decodeBase64Url } from '@/lib/url-encoding';
import logger from '@/lib/logging/simple-logger';

// Vote pattern analysis is cached for 7 days
export const revalidate = 604800;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ state: string; legislatorId: string }> }
) {
  const startTime = Date.now();

  try {
    const { state, legislatorId: rawId } = await params;
    const stateCode = normalizeStateIdentifier(state);
    const legislatorId = decodeBase64Url(rawId);

    if (!stateCode || !legislatorId) {
      return NextResponse.json(
        { success: false, error: 'State and legislator ID are required' },
        { status: 400 }
      );
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

    // Get vote enrichment data (Phase 1)
    const enrichment = await VoteEnrichmentService.enrichVotes(
      stateCode,
      legislatorId,
      legislator.party
    );

    // Generate AI analysis
    const analysis = await StateVotePatternAnalyzer.analyze(
      enrichment,
      legislator.name,
      legislator.party,
      stateCode
    );

    logger.info('State vote patterns AI analysis request successful', {
      state: stateCode,
      legislatorId,
      legislatorName: legislator.name,
      source: analysis.source,
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        ...analysis,
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=1209600',
        },
      }
    );
  } catch (error) {
    logger.error('State vote patterns AI analysis request failed', error as Error, {
      responseTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate vote pattern analysis',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

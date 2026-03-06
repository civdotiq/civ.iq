/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Representative Influence Chain
 *
 * Aggregates lobbying pipeline insights for each of a representative's
 * committees. Shows "lobbying → committee → legislation chain" per
 * representative.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/influence-chain
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import { analyzeLobbyingPipeline } from '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer';
import type { LobbyingPipelineInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';

interface InfluenceChainResponse {
  bioguideId: string;
  committeePipelines: LobbyingPipelineInsight[];
  generatedAt: string;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<InfluenceChainResponse | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Influence chain request', { bioguideId: upperId });

    const rep = await getEnhancedRepresentative(upperId);
    if (!rep?.committees?.length) {
      return NextResponse.json(
        { error: 'Representative not found or has no committee assignments' },
        { status: 404 }
      );
    }

    // Resolve committee names to committee codes via fuzzy match
    const committeeCodes: string[] = [];
    for (const committee of rep.committees) {
      const normalizedName = committee.name.toLowerCase();
      const mapping = ALL_COMMITTEE_MAPPINGS.find(
        m =>
          normalizedName.includes(m.committeeName.toLowerCase()) ||
          m.committeeName.toLowerCase().includes(normalizedName)
      );
      if (mapping) {
        committeeCodes.push(mapping.committeeCode);
      }
    }

    if (committeeCodes.length === 0) {
      return NextResponse.json({ error: 'No known committee codes matched' }, { status: 404 });
    }

    // Fetch lobbying pipeline for each committee (individually cached)
    const results = await Promise.all(
      committeeCodes.map(code =>
        analyzeLobbyingPipeline(code).catch(error => {
          logger.error('[Intelligence] Lobbying pipeline failed for committee', error as Error, {
            bioguideId: upperId,
            committeeCode: code,
          });
          return null;
        })
      )
    );

    const committeePipelines = results.filter((r): r is LobbyingPipelineInsight => r !== null);

    const response: InfluenceChainResponse = {
      bioguideId: upperId,
      committeePipelines,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Influence chain error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

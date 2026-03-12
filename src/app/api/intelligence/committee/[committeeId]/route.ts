/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Committee Lobbying Pipeline
 *
 * Serves cached lobbying pipeline insight for a committee or generates
 * on-demand. Committee ID must match a known committeeCode from
 * ALL_COMMITTEE_MAPPINGS.
 *
 * Endpoint: GET /api/intelligence/committee/[committeeId]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { ALL_COMMITTEE_MAPPINGS } from '@/lib/connections/committee-agency-map';
import { analyzeLobbyingPipeline } from '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer';
import type { LobbyingPipelineInsight } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ committeeId: string }> }
): Promise<NextResponse<LobbyingPipelineInsight | { error: string }>> {
  const { committeeId } = await params;

  if (!committeeId || typeof committeeId !== 'string') {
    return NextResponse.json({ error: 'Committee ID is required' }, { status: 400 });
  }

  const upperCode = committeeId.toUpperCase();

  // Validate against known committees
  const mapping = ALL_COMMITTEE_MAPPINGS.find(m => m.committeeCode === upperCode);
  if (!mapping) {
    return NextResponse.json({ error: `Unknown committee code: ${upperCode}` }, { status: 404 });
  }

  try {
    logger.info('[Intelligence] Committee lobbying pipeline request', {
      committeeId: upperCode,
    });

    const insight = await analyzeLobbyingPipeline(upperCode);

    if (!insight) {
      return NextResponse.json(
        { error: 'Insufficient lobbying data for this committee' },
        { status: 404 }
      );
    }

    return NextResponse.json(insight, {
      headers: {
        'Cache-Control': 'public, s-maxage=43200, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    logger.error('[Intelligence] Committee lobbying pipeline error', error as Error, {
      committeeId: upperCode,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

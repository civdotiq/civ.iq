/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Civic Intelligence Brief
 *
 * Returns a synthesized civic intelligence brief for a legislator,
 * combining funding, voting, committee, and lobbying data into
 * a single 2-minute read.
 *
 * Endpoint: GET /api/intelligence/representative/[bioguideId]/brief
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { assembleCivicBrief } from '@/lib/intelligence/analyzers/civic-brief-assembler';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { CivicBriefInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
): Promise<NextResponse<CivicBriefInsight | { error: string }>> {
  const { bioguideId } = await params;

  if (!bioguideId || typeof bioguideId !== 'string') {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  const upperId = bioguideId.toUpperCase();

  try {
    logger.info('[Intelligence] Civic brief request', { bioguideId: upperId });
    const errors: InsightError[] = [];

    const insight = await assembleCivicBrief(upperId).catch(e => {
      errors.push(classifyError(e, 'civic-brief-assembler'));
      return null;
    });

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Civic brief not available for this legislator',
          errors,
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ...insight, errors, status: 'complete' as const },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Civic brief error', error as Error, {
      bioguideId: upperId,
    });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

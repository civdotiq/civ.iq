/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligence API — Regulation Analysis
 *
 * Returns regulation analysis for a federal agency,
 * linking rulemaking activity to lobbying disclosure data.
 *
 * Endpoint: GET /api/intelligence/regulation/[agencySlug]
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeRegulations } from '@/lib/intelligence/analyzers/regulation-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { RegulationInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ agencySlug: string }> }
): Promise<NextResponse<RegulationInsight | { error: string }>> {
  const { agencySlug } = await params;

  if (!agencySlug || typeof agencySlug !== 'string') {
    return NextResponse.json({ error: 'Agency slug is required' }, { status: 400 });
  }

  try {
    logger.info('[Intelligence] Regulation request', { agencySlug });
    const errors: InsightError[] = [];

    const insight = await analyzeRegulations(agencySlug).catch(e => {
      errors.push(classifyError(e, 'regulation-analyzer'));
      return null;
    });

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Regulation analysis not available for this agency',
          errors,
          status: 'unavailable' as const,
        },
        { status: 404 }
      );
    }

    const status = errors.length === 0 ? 'complete' : 'partial';

    return NextResponse.json(
      { ...insight, errors, status },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Regulation error', error as Error, { agencySlug });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeEnforcement } from '@/lib/intelligence/analyzers/enforcement-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';
import type { EnforcementInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sector: string }> }
): Promise<NextResponse<EnforcementInsight | { error: string }>> {
  const { sector } = await params;

  if (!sector || typeof sector !== 'string') {
    return NextResponse.json({ error: 'Sector is required' }, { status: 400 });
  }

  try {
    logger.info('[Intelligence] Enforcement sector request', { sector });
    const errors: InsightError[] = [];

    const insight = await analyzeEnforcement({
      type: 'sector',
      sector: sector as IndustrySector,
    }).catch(e => {
      errors.push(classifyError(e, 'enforcement-analyzer'));
      return null;
    });

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Enforcement analysis not available for this sector',
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
          'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=3600',
        },
      }
    );
  } catch (error) {
    logger.error('[Intelligence] Enforcement sector error', error as Error, { sector });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

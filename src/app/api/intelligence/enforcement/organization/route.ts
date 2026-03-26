/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { analyzeEnforcement } from '@/lib/intelligence/analyzers/enforcement-analyzer';
import { classifyError } from '@/lib/intelligence/error-utils';
import type { EnforcementInsight, InsightError } from '@/lib/intelligence/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(
  request: NextRequest
): Promise<NextResponse<EnforcementInsight | { error: string }>> {
  const name = request.nextUrl.searchParams.get('name');

  if (!name || typeof name !== 'string') {
    return NextResponse.json(
      { error: 'Organization name is required (query param: ?name=)' },
      { status: 400 }
    );
  }

  try {
    logger.info('[Intelligence] Enforcement organization request', { name });
    const errors: InsightError[] = [];

    const insight = await analyzeEnforcement({
      type: 'organization',
      name,
    }).catch(e => {
      errors.push(classifyError(e, 'enforcement-analyzer'));
      return null;
    });

    if (!insight) {
      return NextResponse.json(
        {
          error: 'Enforcement analysis not available for this organization',
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
    logger.error('[Intelligence] Enforcement organization error', error as Error, { name });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

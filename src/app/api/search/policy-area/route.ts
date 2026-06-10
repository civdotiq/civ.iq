/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Policy Area Search API — Gap 6 Join Endpoint
 *
 * Cross-domain search by Congress.gov policyArea. Delegates to
 * policy-area-search.service.ts for the actual data fetching.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { getPolicyAreaMapping } from '@/lib/connections/policy-area-map';
import { searchPolicyArea } from '@/lib/services/policy-area-search.service';
import type { PolicyAreaResults } from '@/types/joins';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest
): Promise<NextResponse<PolicyAreaResults | { error: string }>> {
  const { searchParams } = request.nextUrl;
  const policyArea = searchParams.get('policyArea');

  if (!policyArea) {
    return NextResponse.json(
      { error: 'Query parameter "policyArea" is required' },
      { status: 400 }
    );
  }

  try {
    logger.info('Policy area search request', { policyArea });

    const mapping = getPolicyAreaMapping(policyArea);
    if (!mapping) {
      return NextResponse.json({ error: `Unknown policy area: ${policyArea}` }, { status: 404 });
    }

    // parseInt('abc') is NaN and Math.min(NaN, 30) stays NaN — fall back to the default
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 30);
    const result = await searchPolicyArea(policyArea, limit);

    if (!result) {
      return NextResponse.json({ error: 'Failed to fetch policy area results' }, { status: 500 });
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=7200, stale-while-revalidate=1800',
      },
    });
  } catch (error) {
    logger.error('Policy area search error', error as Error, { policyArea });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

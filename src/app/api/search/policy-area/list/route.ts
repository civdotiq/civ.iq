/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Policy Area List API
 *
 * Returns all known Congress.gov policyArea values that can be used
 * with the /api/search/policy-area endpoint.
 */

import { NextResponse } from 'next/server';
import { getAllPolicyAreas } from '@/lib/connections/policy-area-map';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const policyAreas = getAllPolicyAreas().sort();

  return NextResponse.json(
    {
      policyAreas,
      count: policyAreas.length,
      metadata: {
        generatedAt: new Date().toISOString(),
        dataSource: 'congress.gov',
      },
    },
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    }
  );
}

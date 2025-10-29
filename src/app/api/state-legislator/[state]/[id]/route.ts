/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @deprecated This endpoint is deprecated as of 2025-10-29.
 *
 * Use the canonical endpoint instead:
 * /api/state-legislature/[state]/legislator/[id]
 *
 * This endpoint redirects to the canonical route for backward compatibility.
 *
 * REASON FOR DEPRECATION:
 * - Violates architectural pattern by directly instantiating OpenStatesAPI
 * - Bypasses StateLegislatureCoreService (correct service layer)
 * - Returns limited fields instead of full EnhancedStateLegislator
 * - Missing performance logging and comprehensive error handling
 *
 * MIGRATION GUIDE:
 * Old: GET /api/state-legislator/MI/ocd-person-dc6ff9c0-f2b1-433d-a96b-292cf05bcb50
 * New: GET /api/state-legislature/MI/legislator/ocd-person-dc6ff9c0-f2b1-433d-a96b-292cf05bcb50
 *
 * This redirect will be removed in a future version.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
): Promise<NextResponse> {
  const { state, id } = await params;

  logger.warn('Deprecated endpoint accessed', {
    deprecatedEndpoint: `/api/state-legislator/${state}/${id}`,
    canonicalEndpoint: `/api/state-legislature/${state}/legislator/${id}`,
    message: 'Please update to use the canonical endpoint',
  });

  // Return 301 Permanent Redirect to canonical route
  const canonicalUrl = `/api/state-legislature/${state}/legislator/${id}`;

  return NextResponse.json(
    {
      success: false,
      deprecated: true,
      message:
        'This endpoint is deprecated. Use /api/state-legislature/[state]/legislator/[id] instead.',
      canonicalEndpoint: canonicalUrl,
      redirectUrl: canonicalUrl,
    },
    {
      status: 301,
      headers: {
        Location: canonicalUrl,
        'X-Deprecated-Endpoint': 'true',
        'X-Canonical-Endpoint': canonicalUrl,
      },
    }
  );
}

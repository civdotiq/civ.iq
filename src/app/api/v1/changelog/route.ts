/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Public API v1 — Changelog
 *
 * Returns version history for the v1 API.
 * Helps consumers track breaking changes and new features.
 */

import { NextResponse } from 'next/server';
import { v1Success } from '@/lib/api/v1-response';
import { addVersionHeaders, API_VERSION } from '@/lib/api/v1-versioning';

export const dynamic = 'force-dynamic';

const CHANGELOG = [
  {
    version: '1.0.0',
    date: '2025-12-15',
    changes: [
      'Initial public v1 API release',
      'Representatives: list and detail endpoints',
      'Bills: list, detail, and AI summary (cached) endpoints',
      'Committees: list and detail endpoints',
      'Districts: detail endpoint with representatives',
      'Votes: roll-call vote detail endpoint',
      'Atom feeds: member, bills, bill, committee, district',
      'Rate limiting: 60 requests/minute on all v1 endpoints',
      'CORS: open access (Access-Control-Allow-Origin: *)',
    ],
  },
];

export async function GET(): Promise<NextResponse> {
  const response = NextResponse.json(
    v1Success(
      {
        currentVersion: API_VERSION,
        versions: CHANGELOG,
      },
      'civ.iq'
    ),
    {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=172800',
      },
    }
  );

  addVersionHeaders(response.headers);

  return response;
}

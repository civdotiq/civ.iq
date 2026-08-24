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
import { v1Success, v1Error } from '@/lib/api/v1-response';
import { addVersionHeaders, API_VERSION } from '@/lib/api/v1-versioning';

export const dynamic = 'force-dynamic';

const CHANGELOG = [
  {
    version: '1.2.1',
    date: '2026-08-24',
    changes: [
      'OpenAPI: every operation now declares typed 5xx error responses matching actual route behavior',
      'OpenAPI: removed unreferenced error components; MCP errors documented as JSON-RPC envelopes',
      'Non-v1 JSON endpoints (intelligence, search, compare, state) standardized on the ApiError envelope for error responses',
      'MCP server manifest published at /.well-known/mcp.json (MCP registry server.json format)',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-21',
    changes: [
      'Unknown /api paths now return structured JSON 404s (never HTML)',
      'IETF RateLimit-Limit/Remaining/Reset/Policy headers on all API responses (legacy X-RateLimit-* kept)',
      'X-API-Version header on every v1 response',
      'OpenAPI: typed ApiError schema for non-v1 endpoints, 429 documented on every operation',
      'Published versioning & deprecation policy (RFC 8594 Sunset/Deprecation signaling): https://civdotiq.org/docs/api#versioning',
      'Markdown content negotiation (Accept: text/markdown) on key pages; agent-readable markdown 404s',
      'MCP: static doc resources exposed via resources/list; /mcp accepts protocol traffic',
    ],
  },
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
  try {
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
  } catch {
    return NextResponse.json(v1Error(500, 'Internal server error'), { status: 500 });
  }
}

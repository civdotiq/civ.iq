/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * API catch-all: unknown /api/* paths return structured JSON 404s.
 *
 * Without this, a typo'd endpoint fell through to the app-level HTML 404
 * page — an agent or SDK got 61KB of markup instead of a parseable error.
 * Next.js matches every concrete route first; this only ever sees paths
 * that no real endpoint claims.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { v1Error } from '@/lib/api/v1-response';
import { ErrorCodes } from '@/lib/api/error-responses';

export const dynamic = 'force-dynamic';

const HINTS = {
  documentation: 'https://civdotiq.org/docs/api',
  openapi: 'https://civdotiq.org/openapi.json',
  endpoints: 'https://civdotiq.org/api/v1',
  llms: 'https://civdotiq.org/llms-full.txt',
};

function unknownEndpoint(request: NextRequest): NextResponse {
  const pathname = new URL(request.url).pathname;

  // v1 consumers get the published v1 error envelope; everything else gets
  // the internal ApiError shape. Both are JSON with a code, message, and
  // where-to-look-next hints.
  if (pathname.startsWith('/api/v1/')) {
    const body = v1Error(
      404,
      `Unknown API endpoint: ${pathname}`,
      `No v1 endpoint matches this path. List valid endpoints at ${HINTS.endpoints}, see the OpenAPI spec at ${HINTS.openapi}, or read the docs at ${HINTS.documentation}.`
    );
    return NextResponse.json({ ...body, hints: HINTS }, { status: 404 });
  }

  return NextResponse.json(
    {
      success: false,
      error: {
        code: ErrorCodes.NOT_FOUND,
        message: `Unknown API endpoint: ${pathname}`,
        details: `No endpoint matches this path. See the OpenAPI spec at ${HINTS.openapi} or the docs at ${HINTS.documentation}.`,
      },
      hints: HINTS,
      metadata: { timestamp: new Date().toISOString() },
    },
    { status: 404 }
  );
}

export function GET(request: NextRequest): NextResponse {
  return unknownEndpoint(request);
}

export function POST(request: NextRequest): NextResponse {
  return unknownEndpoint(request);
}

export function PUT(request: NextRequest): NextResponse {
  return unknownEndpoint(request);
}

export function PATCH(request: NextRequest): NextResponse {
  return unknownEndpoint(request);
}

export function DELETE(request: NextRequest): NextResponse {
  return unknownEndpoint(request);
}

export function HEAD(request: NextRequest): NextResponse {
  return unknownEndpoint(request);
}

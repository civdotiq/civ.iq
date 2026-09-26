/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Local Government Lookup API
 *
 * GET /api/local-government/[location]
 *
 * CIV.IQ does not offer local (city/county) government data. There is no
 * national local-government API: roughly 90,000 local governments publish
 * records in their own formats, or not at all, with no shared standard.
 * CIV.IQ intends to add local officials only once a verified public source
 * exists. Until then this route answers every location with
 * dataQuality: 'unavailable' and HTTP 503. It never fabricates officials.
 *
 * See docs/COVERAGE.md for the coverage matrix.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { DataQuality, SourceStatus } from '@/types/backbone-response';

export const dynamic = 'force-dynamic';

interface LocalGovernmentResponse {
  location: string;
  resolvedCity: null;
  dataQuality: DataQuality;
  sourceStatus: SourceStatus[];
  metadata: {
    dataSource: string;
    lastUpdated: string;
    note: string;
    coverageDoc: string;
  };
}

const COVERAGE_DOC_URL = 'https://github.com/civdotiq/civ.iq/blob/main/docs/COVERAGE.md';

const NOT_COVERED_NOTE =
  'Local (city/county) government is not covered. Local records lack a shared standard or central source; CIV.IQ intends to add them only once a verified public source exists. Use /api/representatives for federal officials and /api/states/{state}/legislators for state legislators.';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ location: string }> }
): Promise<NextResponse<LocalGovernmentResponse | { error: string }>> {
  const { location } = await params;

  if (!location) {
    return NextResponse.json({ error: 'Location identifier is required' }, { status: 400 });
  }

  const fetchedAt = new Date().toISOString();
  const response: LocalGovernmentResponse = {
    location,
    resolvedCity: null,
    dataQuality: 'unavailable',
    sourceStatus: [
      {
        source: 'civiq:local-government',
        status: 'not-configured',
        errorMessage:
          'No local government data source is wired. CIV.IQ does not cover local government.',
        fetchedAt,
      },
    ],
    metadata: {
      dataSource: 'civiq:local-government',
      lastUpdated: fetchedAt,
      note: NOT_COVERED_NOTE,
      coverageDoc: COVERAGE_DOC_URL,
    },
  };

  return NextResponse.json(response, {
    status: 503,
    headers: { 'Cache-Control': 'no-cache' },
  });
}

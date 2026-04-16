/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Local Government Lookup API
 *
 * GET /api/local-government/[location]
 *
 * There is no national local-government API in the United States. CIV.IQ
 * supports a pilot list of cities via Legistar (see `lib/local-government/pilot-cities.ts`).
 * For everything else, this route returns dataQuality: 'unavailable' and
 * lists the supported pilot cities. It does not fabricate officials.
 *
 * See docs/COVERAGE.md for the canonical coverage matrix.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';
import { CITY_CONFIGS, getPilotCitySummaries } from '@/lib/local-government/pilot-cities';
import type { DataQuality, SourceStatus } from '@/types/backbone-response';

export const dynamic = 'force-dynamic';

interface PilotCityLink {
  id: string;
  name: string;
  state: string;
  councilEndpoint: string;
}

interface LocalGovernmentResponse {
  location: string;
  resolvedCity: { name: string; state: string } | null;
  dataQuality: DataQuality;
  sourceStatus: SourceStatus[];
  pilotCities: PilotCityLink[];
  metadata: {
    dataSource: string;
    lastUpdated: string;
    note: string;
    coverageDoc: string;
  };
}

const COVERAGE_DOC_URL = 'https://github.com/civdotiq/civic-intel-hub/blob/main/docs/COVERAGE.md';

function buildPilotCityLinks(): PilotCityLink[] {
  return getPilotCitySummaries().map(city => ({
    id: city.id,
    name: city.name,
    state: city.state,
    councilEndpoint: `/api/city/${city.id}/council`,
  }));
}

function parseLocationKey(location: string): string | null {
  const parts = location.toLowerCase().split('-');
  if (parts.length === 0) return null;
  const candidate = parts.slice(0, parts.length > 1 ? -1 : undefined).join('');
  return candidate.replace(/[^a-z]/g, '') || null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ location: string }> }
): Promise<NextResponse<LocalGovernmentResponse | { error: string }>> {
  const { location } = await params;

  if (!location) {
    return NextResponse.json({ error: 'Location identifier is required' }, { status: 400 });
  }

  const lookupKey = parseLocationKey(location);
  const matchedConfig = lookupKey ? CITY_CONFIGS[lookupKey] : undefined;
  const fetchedAt = new Date().toISOString();

  if (matchedConfig) {
    const response: LocalGovernmentResponse = {
      location,
      resolvedCity: { name: matchedConfig.name, state: matchedConfig.state },
      dataQuality: 'partial',
      sourceStatus: [
        {
          source: `legistar:${matchedConfig.apiClient}`,
          status: 'ok',
          fetchedAt,
        },
      ],
      pilotCities: buildPilotCityLinks(),
      metadata: {
        dataSource: 'legistar.com',
        lastUpdated: fetchedAt,
        note: `${matchedConfig.name}, ${matchedConfig.state} is a CIV.IQ pilot city. Fetch council data from /api/city/${matchedConfig.id}/council. This catch-all route does not return officials directly.`,
        coverageDoc: COVERAGE_DOC_URL,
      },
    };

    return NextResponse.json(response);
  }

  logger.info('Local government lookup outside pilot list', {
    location,
    lookupKey,
    pilotCityCount: Object.keys(CITY_CONFIGS).length,
  });

  const response: LocalGovernmentResponse = {
    location,
    resolvedCity: null,
    dataQuality: 'unavailable',
    sourceStatus: [
      {
        source: 'civiq:local-government',
        status: 'not-configured',
        errorMessage:
          'No local government data source is wired for this location. CIV.IQ covers a pilot list of cities only.',
        fetchedAt,
      },
    ],
    pilotCities: buildPilotCityLinks(),
    metadata: {
      dataSource: 'civiq:local-government',
      lastUpdated: fetchedAt,
      note: 'CIV.IQ does not have local-government data for this location. There is no national local-government API; coverage is limited to a pilot list of cities. See pilotCities in this response, or docs/COVERAGE.md.',
      coverageDoc: COVERAGE_DOC_URL,
    },
  };

  return NextResponse.json(response, {
    status: 503,
    headers: { 'Cache-Control': 'no-cache' },
  });
}

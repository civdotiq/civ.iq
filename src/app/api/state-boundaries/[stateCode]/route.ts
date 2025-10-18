/**
 * State Boundaries API
 * Serves TIGER/Line state boundary GeoJSON data for Senator profiles
 *
 * Supports state codes: CA, NY, TX, etc. (all 50 states + DC + territories)
 *
 * Query parameters:
 * - ?detail=simple   (Mobile optimized, 0.1% simplified)
 * - ?detail=standard (Default web, 1% simplified)
 * - ?detail=full     (Full resolution from Census TIGER/Line)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface StateManifest {
  generated: string;
  total_states: number;
  source: string;
  source_url: string;
  extraction_stats: {
    duration_ms: number;
    errors: number;
  };
  states: string[];
  detail_levels: {
    full: string;
    standard: string;
    simple: string;
  };
}

interface StateProperties {
  REGION?: string;
  DIVISION?: string;
  STATEFP?: string;
  STATENS?: string;
  GEOID?: string;
  STUSPS?: string;
  NAME?: string;
  LSAD?: string;
  ALAND?: number;
  AWATER?: number;
  INTPTLAT?: string;
  INTPTLON?: string;
  state_abbr?: string;
  state_name?: string;
  state_fips?: string;
  [key: string]: unknown;
}

interface StateGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: StateProperties & {
    detail_level?: string;
    api_metadata?: {
      normalized_code: string;
      original_request: string;
      file_size_bytes?: number;
    };
  };
}

/**
 * Valid state codes (50 states + DC + territories)
 */
const VALID_STATE_CODES = new Set([
  'AL',
  'AK',
  'AZ',
  'AR',
  'CA',
  'CO',
  'CT',
  'DE',
  'DC',
  'FL',
  'GA',
  'HI',
  'ID',
  'IL',
  'IN',
  'IA',
  'KS',
  'KY',
  'LA',
  'ME',
  'MD',
  'MA',
  'MI',
  'MN',
  'MS',
  'MO',
  'MT',
  'NE',
  'NV',
  'NH',
  'NJ',
  'NM',
  'NY',
  'NC',
  'ND',
  'OH',
  'OK',
  'OR',
  'PA',
  'RI',
  'SC',
  'SD',
  'TN',
  'TX',
  'UT',
  'VT',
  'VA',
  'WA',
  'WV',
  'WI',
  'WY',
  'AS',
  'GU',
  'MP',
  'PR',
  'VI',
]);

/**
 * Normalize state code to uppercase
 */
function normalizeStateCode(stateCode: string): string | null {
  const normalized = stateCode.trim().toUpperCase();
  return VALID_STATE_CODES.has(normalized) ? normalized : null;
}

/**
 * Load and cache the state manifest
 */
let manifestCache: StateManifest | null = null;
async function loadManifest(baseUrl: string): Promise<StateManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  try {
    const manifestUrl = `${baseUrl}/data/states/manifest.json`;
    const response = await fetch(manifestUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch manifest: ${response.statusText}`);
    }
    manifestCache = (await response.json()) as StateManifest;
    return manifestCache;
  } catch (error) {
    throw new Error(
      `Failed to load state manifest: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get file size for a state file (from Content-Length header)
 */
async function getFileSize(fileUrl: string): Promise<number> {
  try {
    const response = await fetch(fileUrl, { method: 'HEAD' });
    const contentLength = response.headers.get('Content-Length');
    return contentLength ? parseInt(contentLength, 10) : 0;
  } catch {
    return 0;
  }
}

/**
 * Main API route handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stateCode: string }> }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { stateCode } = await params;
    const { searchParams } = request.nextUrl;
    const detail = searchParams.get('detail') || 'standard';

    // Validate detail level
    if (!['simple', 'standard', 'full'].includes(detail)) {
      return NextResponse.json(
        {
          error: 'Invalid detail level',
          message: 'Detail must be one of: simple, standard, full',
          example: `/api/state-boundaries/${stateCode}?detail=standard`,
        },
        { status: 400 }
      );
    }

    // Normalize state code
    const normalizedCode = normalizeStateCode(stateCode);
    if (!normalizedCode) {
      return NextResponse.json(
        {
          error: 'Invalid state code',
          message: 'State code must be a valid 2-letter abbreviation',
          examples: ['CA', 'NY', 'TX', 'FL', 'DC', 'PR'],
          provided: stateCode,
        },
        { status: 400 }
      );
    }

    // Get base URL for fetching static files
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    // Load manifest for validation
    const manifest = await loadManifest(baseUrl);

    if (!manifest.states.includes(normalizedCode)) {
      return NextResponse.json(
        {
          error: 'State not found',
          message: `State ${stateCode} (normalized: ${normalizedCode}) not found`,
          available_states: manifest.states.slice(0, 10),
          total_states: manifest.total_states,
        },
        { status: 404 }
      );
    }

    // Load state GeoJSON file
    const fileUrl = `${baseUrl}/data/states/${detail}/${normalizedCode}.json`;

    let geoJson: StateGeoJSON;
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      geoJson = (await response.json()) as StateGeoJSON;
    } catch {
      // File not found or parse error - return helpful message
      return NextResponse.json(
        {
          error: 'State file not found',
          message: `State ${normalizedCode} exists but ${detail} detail file is missing`,
          available_details: Object.keys(manifest.detail_levels),
        },
        { status: 404 }
      );
    }

    // Add API metadata
    const fileSize = await getFileSize(fileUrl);
    geoJson.properties = {
      ...geoJson.properties,
      detail_level: detail,
      api_metadata: {
        normalized_code: normalizedCode,
        original_request: stateCode,
        file_size_bytes: fileSize,
      },
    };

    const processingTime = Date.now() - startTime;

    // Return with optimized cache headers
    return NextResponse.json(geoJson, {
      headers: {
        // Cache for 7 days (state boundaries change rarely)
        'Cache-Control': 'public, max-age=604800, s-maxage=2592000, immutable',
        // ETag for client-side caching
        ETag: `"${normalizedCode}-${detail}-v1"`,
        // CORS for frontend access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Performance metadata
        'X-State-Code': normalizedCode,
        'X-Detail-Level': detail,
        'X-Processing-Time': `${processingTime}ms`,
        'X-File-Size': fileSize.toString(),
        'X-Total-States': manifest.total_states.toString(),
        // Content optimization
        'Content-Type': 'application/json; charset=utf-8',
        Vary: 'Accept-Encoding',
      },
    });
  } catch {
    // Handle unexpected errors gracefully
    const processingTime = Date.now() - startTime;
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'Failed to load state boundaries',
        timestamp: new Date().toISOString(),
        processing_time_ms: processingTime,
      },
      {
        status: 500,
        headers: {
          'X-Processing-Time': `${processingTime}ms`,
        },
      }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

/**
 * Congressional District Boundaries API
 * Phase 3: Production-Ready API with Multi-Format Support
 *
 * Supports multiple district ID formats:
 * - Congressional: CA-12, NY-14, TX-03
 * - GEOID: 06-12, 36-14, 48-03
 * - Full FIPS: 0612, 3614, 4803
 *
 * Query parameters:
 * - ?detail=simple   (Mobile optimized)
 * - ?detail=standard (Default web)
 * - ?detail=full     (Analysis mode)
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import fs from 'fs/promises';
import path from 'path';

interface DistrictManifest {
  total_districts: number;
  districts: string[];
  extraction_stats: {
    duration_ms: number;
    optimizations_created: number;
  };
  detail_levels: {
    full: string;
    standard: string;
    simple: string;
  };
}

interface DistrictProperties {
  GEOID?: string;
  DISTRICTID?: string;
  NAMELSAD?: string;
  STATEFP?: string;
  CD118FP?: string;
  [key: string]: unknown;
}

interface DistrictGeoJSON {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: DistrictProperties & {
    detail_level?: string;
    api_metadata?: {
      normalized_id: string;
      original_request: string;
      file_size_bytes?: number;
    };
  };
}

// State FIPS code mapping for district ID normalization
const STATE_FIPS_MAP: Record<string, string> = {
  AL: '01',
  AK: '02',
  AZ: '04',
  AR: '05',
  CA: '06',
  CO: '08',
  CT: '09',
  DE: '10',
  FL: '12',
  GA: '13',
  HI: '15',
  ID: '16',
  IL: '17',
  IN: '18',
  IA: '19',
  KS: '20',
  KY: '21',
  LA: '22',
  ME: '23',
  MD: '24',
  MA: '25',
  MI: '26',
  MN: '27',
  MS: '28',
  MO: '29',
  MT: '30',
  NE: '31',
  NV: '32',
  NH: '33',
  NJ: '34',
  NM: '35',
  NY: '36',
  NC: '37',
  ND: '38',
  OH: '39',
  OK: '40',
  OR: '41',
  PA: '42',
  RI: '44',
  SC: '45',
  SD: '46',
  TN: '47',
  TX: '48',
  UT: '49',
  VT: '50',
  VA: '51',
  WA: '53',
  WV: '54',
  WI: '55',
  WY: '56',
  AS: '60',
  GU: '66',
  MP: '69',
  PR: '72',
  VI: '78',
};

// Reverse mapping for FIPS to state codes
const FIPS_STATE_MAP = Object.fromEntries(
  Object.entries(STATE_FIPS_MAP).map(([state, fips]) => [fips, state])
);

/**
 * Normalize various district ID formats to our internal format
 * Examples:
 * - "CA-12" -> "0612"
 * - "06-12" -> "0612"
 * - "0612" -> "0612"
 * - "NY-14" -> "3614"
 */
function normalizeDistrictId(districtId: string): string | null {
  // Remove any whitespace
  const cleaned = districtId.trim().toUpperCase();

  // Pattern 1: State-District (CA-12, NY-14)
  const stateDistrictMatch = cleaned.match(/^([A-Z]{2})-(\d{1,2})$/);
  if (stateDistrictMatch && stateDistrictMatch[1] && stateDistrictMatch[2]) {
    const stateCode = stateDistrictMatch[1];
    const district = stateDistrictMatch[2];
    const fips = STATE_FIPS_MAP[stateCode];
    if (fips) {
      return fips + district.padStart(2, '0');
    }
  }

  // Pattern 2: FIPS-District (06-12, 36-14)
  const fipsDistrictMatch = cleaned.match(/^(\d{1,2})-(\d{1,2})$/);
  if (fipsDistrictMatch && fipsDistrictMatch[1] && fipsDistrictMatch[2]) {
    const fips = fipsDistrictMatch[1];
    const district = fipsDistrictMatch[2];
    return fips.padStart(2, '0') + district.padStart(2, '0');
  }

  // Pattern 3: Full FIPS (0612, 3614, 4803)
  const fullFipsMatch = cleaned.match(/^(\d{4})$/);
  if (fullFipsMatch) {
    return cleaned;
  }

  // Pattern 4: Handle special territories and at-large districts
  const specialCodes: Record<string, string> = {
    'AK-00': '0200',
    'DE-00': '1000',
    'MT-00': '3000',
    'ND-00': '3800',
    'SD-00': '4600',
    'VT-00': '5000',
    'WY-00': '5600',
    'DC-00': '1100',
    'PR-00': '7200',
    'VI-00': '7800',
    'GU-00': '6600',
    'AS-00': '6000',
    'MP-00': '6900',
  };

  if (specialCodes[cleaned]) {
    return specialCodes[cleaned];
  }

  return null;
}

/**
 * Load and cache the district manifest
 */
let manifestCache: DistrictManifest | null = null;
async function loadManifest(): Promise<DistrictManifest> {
  if (manifestCache) {
    return manifestCache;
  }

  try {
    const manifestPath = path.join(process.cwd(), 'public/data/districts/manifest.json');
    const manifestData = await fs.readFile(manifestPath, 'utf-8');
    manifestCache = JSON.parse(manifestData) as DistrictManifest;
    return manifestCache;
  } catch (error) {
    throw new Error(
      `Failed to load district manifest: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get file size for a district file
 */
async function getFileSize(filePath: string): Promise<number> {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Main API route handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { districtId: string } }
): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const { districtId } = params;
    const { searchParams } = request.nextUrl;
    const detail = searchParams.get('detail') || 'standard';

    // Validate detail level
    if (!['simple', 'standard', 'full'].includes(detail)) {
      return NextResponse.json(
        {
          error: 'Invalid detail level',
          message: 'Detail must be one of: simple, standard, full',
          example: `/api/district-boundaries/${districtId}?detail=standard`,
        },
        { status: 400 }
      );
    }

    // Normalize district ID
    const normalizedId = normalizeDistrictId(districtId);
    if (!normalizedId) {
      return NextResponse.json(
        {
          error: 'Invalid district ID format',
          message: 'District ID must be in format: CA-12, 06-12, or 0612',
          examples: ['CA-12', 'NY-14', 'TX-03', '06-12', '36-14', '0612', '3614'],
          provided: districtId,
        },
        { status: 400 }
      );
    }

    // Load manifest for validation
    const manifest = await loadManifest();

    if (!manifest.districts.includes(normalizedId)) {
      // Helpful error with similar districts
      const stateFips = normalizedId.slice(0, 2);
      const stateCode = FIPS_STATE_MAP[stateFips];
      const stateDistricts = manifest.districts.filter(id => id.startsWith(stateFips));

      return NextResponse.json(
        {
          error: 'District not found',
          message: `Congressional district ${districtId} (normalized: ${normalizedId}) not found`,
          suggestions: {
            state: stateCode ? `${stateCode} districts` : 'Unknown state',
            available_in_state: stateDistricts.length > 0 ? stateDistricts.slice(0, 5) : [],
            total_districts_available: manifest.total_districts,
          },
          examples: ['CA-12', 'NY-14', 'TX-03'],
        },
        { status: 404 }
      );
    }

    // Load district GeoJSON file
    const filePath = path.join(
      process.cwd(),
      'public/data/districts',
      detail,
      `${normalizedId}.json`
    );

    let geoJson: DistrictGeoJSON;
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      geoJson = JSON.parse(fileContent) as DistrictGeoJSON;
    } catch {
      // File not found or parse error - return helpful message
      return NextResponse.json(
        {
          error: 'District file not found',
          message: `District ${normalizedId} exists but ${detail} detail file is missing`,
          available_details: Object.keys(manifest.detail_levels),
        },
        { status: 404 }
      );
    }

    // Add API metadata
    const fileSize = await getFileSize(filePath);
    geoJson.properties = {
      ...geoJson.properties,
      detail_level: detail,
      api_metadata: {
        normalized_id: normalizedId,
        original_request: districtId,
        file_size_bytes: fileSize,
      },
    };

    const processingTime = Date.now() - startTime;

    // Return with optimized cache headers
    return NextResponse.json(geoJson, {
      headers: {
        // Cache for 24 hours, CDN for 1 week
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
        // ETag for client-side caching
        ETag: `"${normalizedId}-${detail}-v1"`,
        // CORS for frontend access
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Performance metadata
        'X-District-ID': normalizedId,
        'X-Detail-Level': detail,
        'X-Processing-Time': `${processingTime}ms`,
        'X-File-Size': fileSize.toString(),
        'X-Total-Districts': manifest.total_districts.toString(),
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
        message: 'Failed to load district boundaries',
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

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Detroit council-district point lookup.
 *
 * Queries the City of Detroit's own versioned district layer (boundaries
 * effective January 1, 2026, drawn after the 2020 census as the charter
 * requires). The versioned layer is pinned on purpose: the city's
 * "Current" alias gets silently repointed at the next redraw, so pinning
 * plus an explicit effective-date range keeps a stale-map bug from being
 * silent. Re-pin after the post-2030-census redistricting.
 */

import logger from '@/lib/logging/simple-logger';
import { monitorExternalApi } from '@/lib/monitoring/telemetry';

export const DETROIT_DISTRICT_LAYER = {
  url: 'https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/city_council_districts_2026/FeatureServer/0',
  source: 'City of Detroit Open Data (data.detroitmi.gov)',
  boundariesEffective: '2026-01-01',
  verifiedAt: '2026-08-06',
} as const;

interface ArcGisPointQueryResponse {
  features?: Array<{ attributes?: { district_number?: number | null } }>;
  error?: { code?: number; message?: string };
}

export type DistrictLookupResult =
  | { ok: true; district: number | null }
  | { ok: false; error: string };

/**
 * Which Detroit council district contains this point. `district: null`
 * means the point is outside every district polygon — i.e. outside
 * Detroit city limits — which is an answer, not an error.
 */
export async function lookupDetroitCouncilDistrict(
  longitude: number,
  latitude: number
): Promise<DistrictLookupResult> {
  const params = new URLSearchParams({
    geometry: `${longitude},${latitude}`,
    geometryType: 'esriGeometryPoint',
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: 'district_number',
    returnGeometry: 'false',
    f: 'json',
  });

  const monitor = monitorExternalApi(
    'detroit_open_data',
    'council-districts',
    `${longitude},${latitude}`
  );

  try {
    const response = await fetch(`${DETROIT_DISTRICT_LAYER.url}/query?${params}`, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'CivIQ-Hub/1.0 (civic-information-platform)' },
    });

    if (!response.ok) {
      monitor.end(false, response.status);
      return { ok: false, error: `Detroit district layer returned HTTP ${response.status}` };
    }

    const data: ArcGisPointQueryResponse = await response.json();

    // ArcGIS reports errors inside a 200 body
    if (data.error) {
      monitor.end(false, data.error.code ?? 0);
      return { ok: false, error: data.error.message ?? 'Detroit district layer query failed' };
    }

    monitor.end(true, 200);

    const district = data.features?.[0]?.attributes?.district_number;
    return { ok: true, district: typeof district === 'number' ? district : null };
  } catch (error) {
    monitor.end(false, 0);
    logger.error('Detroit district lookup error', error as Error, { longitude, latitude });
    const timedOut = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      error: timedOut
        ? 'Detroit district layer timed out'
        : 'Failed to query Detroit district layer',
    };
  }
}

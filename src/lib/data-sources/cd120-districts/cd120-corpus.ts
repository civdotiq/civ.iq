/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * 120th-Congress district boundary corpus (PLAN-elections-2026-08.md, Phase 0).
 *
 * Why this exists: ten states drew new congressional maps for the 2026
 * election (120th Congress), and the Census Geocoder still classifies
 * addresses into 119th-Congress districts — verified empirically 2026-08-07
 * (Shreveport, LA resolves to LA-06 upstream; its real 2026 district is
 * LA-04). There is no published cutover date, so the app carries its own
 * CD120 polygons and does point-in-polygon locally. The geocoder remains the
 * address→coordinate step only.
 *
 * The corpus covers every state and territory, not just the ten redrawn
 * states: one uniform lookup path, and the 119th-vs-120th comparison then
 * works everywhere instead of relying on a hand-kept "changed states" list.
 */

/** GeoJSON MultiPolygon coordinates: polygons → rings → [lon, lat]. */
export type MultiPolygonCoords = number[][][][];

/** [minLon, minLat, maxLon, maxLat] */
export type Bbox = [number, number, number, number];

export interface Cd120District {
  /** USPS state/territory code, e.g. "LA". */
  state: string;
  /** Two-digit state FIPS, e.g. "22". */
  stateFips: string;
  /** Raw CD120FP code: "01"–"52", "00" (at large) or "98" (delegate seat). */
  code: string;
  /** Display district: "4" for "04", "AL" for at-large and delegate seats. */
  district: string;
  /** Census GEOID (state FIPS + CD120FP), e.g. "2204". */
  geoid: string;
  /** Census NAMELSAD, e.g. "Congressional District 4". */
  name: string;
}

export interface Cd120Row extends Cd120District {
  bbox: Bbox;
  geometry: MultiPolygonCoords;
}

export interface Cd120CorpusFile {
  cdSession: '120';
  generatedAt: string;
  /** URL of the Census geodatabase the polygons were extracted from. */
  source: string;
  /** Douglas-Peucker tolerance (degrees) applied at extraction. */
  toleranceDegrees: number;
  districts: Cd120Row[];
}

/** The geodatabase marks undefined/offshore areas with this pseudo-code. */
const UNDEFINED_DISTRICT_CODE = 'ZZ';

/** At-large codes: "00" (voting at-large seat) and "98" (delegate seat). */
const AT_LARGE_CODES = new Set(['00', '98']);

/** Matches the convention in census-geocoder.ts extractDistrictFromResult. */
export function normalizeDistrictCode(code: string): string {
  if (AT_LARGE_CODES.has(code)) return 'AL';
  return String(parseInt(code, 10));
}

interface OgrFeature {
  properties: {
    STATEFP: string;
    CD120FP: string;
    GEOID: string;
    NAMELSAD: string;
    CDSESSN: string;
  };
  geometry: { type: 'MultiPolygon' | 'Polygon'; coordinates: number[][][] | MultiPolygonCoords };
}

export interface OgrFeatureCollection {
  type: 'FeatureCollection';
  features: OgrFeature[];
}

function computeBbox(geometry: MultiPolygonCoords): Bbox {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const polygon of geometry) {
    for (const ring of polygon) {
      for (const position of ring) {
        const lon = position[0];
        const lat = position[1];
        if (lon === undefined || lat === undefined) continue;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

export interface BuildCd120CorpusInput {
  collection: OgrFeatureCollection;
  fipsToState: Record<string, string>;
  generatedAt: string;
  source: string;
  toleranceDegrees: number;
}

/**
 * Pure corpus builder — the sync script owns all I/O. Throws on anything that
 * would make the corpus lie: an unknown FIPS code, a session that is not 120,
 * or a geometry type ogr2ogr should never emit for this layer.
 */
export function buildCd120Corpus(input: BuildCd120CorpusInput): Cd120CorpusFile {
  const districts: Cd120Row[] = [];

  for (const feature of input.collection.features) {
    const { STATEFP, CD120FP, GEOID, NAMELSAD, CDSESSN } = feature.properties;
    if (CD120FP === UNDEFINED_DISTRICT_CODE) continue;
    if (CDSESSN !== '120') {
      throw new Error(`Expected CDSESSN=120, got ${CDSESSN} for GEOID ${GEOID}`);
    }

    const state = input.fipsToState[STATEFP];
    if (!state) throw new Error(`Unknown state FIPS ${STATEFP} for GEOID ${GEOID}`);

    const geometry: MultiPolygonCoords =
      feature.geometry.type === 'Polygon'
        ? [feature.geometry.coordinates as number[][][]]
        : (feature.geometry.coordinates as MultiPolygonCoords);

    districts.push({
      state,
      stateFips: STATEFP,
      code: CD120FP,
      district: normalizeDistrictCode(CD120FP),
      geoid: GEOID,
      name: NAMELSAD,
      bbox: computeBbox(geometry),
      geometry,
    });
  }

  if (districts.length === 0) throw new Error('No districts parsed from the geodatabase export');
  districts.sort((a, b) => a.geoid.localeCompare(b.geoid));

  return {
    cdSession: '120',
    generatedAt: input.generatedAt,
    source: input.source,
    toleranceDegrees: input.toleranceDegrees,
    districts,
  };
}

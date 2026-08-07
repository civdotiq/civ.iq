/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Ray-casting point-in-polygon over GeoJSON-shaped coordinates. No turf
 * dependency: the corpus lookup needs exactly one predicate, and district
 * polygons at continental-US latitudes are safe for a planar test — the
 * corpus stores plain lon/lat (NAD83, EPSG:4269).
 */

import type { Bbox, MultiPolygonCoords } from './cd120-corpus';

export function bboxContains(bbox: Bbox, lon: number, lat: number): boolean {
  return lon >= bbox[0] && lat >= bbox[1] && lon <= bbox[2] && lat <= bbox[3];
}

/**
 * Even-odd ray cast against one ring. Points exactly on an edge may land on
 * either side — acceptable for this use: the corpus geometry is already
 * simplified to ~20m, so edge-adjacent addresses are inherently uncertain and
 * the caller is expected to treat the geocoder as the coordinate authority.
 */
function ringContains(ring: number[][], lon: number, lat: number): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const xi = pi[0] as number;
    const yi = pi[1] as number;
    const xj = pj[0] as number;
    const yj = pj[1] as number;
    const crosses = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/**
 * True when the point falls inside any polygon of the MultiPolygon, holes
 * respected: within one polygon, an odd number of containing rings (outer +
 * holes) means inside.
 */
export function multiPolygonContains(
  geometry: MultiPolygonCoords,
  lon: number,
  lat: number
): boolean {
  for (const polygon of geometry) {
    let inside = false;
    for (const ring of polygon) {
      if (ringContains(ring, lon, lat)) inside = !inside;
    }
    if (inside) return true;
  }
  return false;
}

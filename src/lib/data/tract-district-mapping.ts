/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Census tract to Congressional District mapping for the 119th Congress (2025-2027).
// Source: Census Bureau CD-to-Tract Relationship File (119th Congress, 2020 tracts)
// Data URL: https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld/tab20_cd11920_tract20_natl.txt
// Generated: 2026-07-08
// Districts: 441 | distinct tracts: 85,522 | tract-district overlaps: 90,526 | split tracts: 4,932
//
// A census tract can straddle a district boundary. For each district we store the
// tract's GEOID and the fraction of the tract's LAND AREA that falls inside the
// district (AREALAND_PART / AREALAND_TRACT_20). Fraction is omitted (implied 1.0)
// for tracts that nest entirely inside one district — the common case.
//
// Server-side only: this JSON is ~1.3 MB. Import it from server code (API routes,
// services), never from a client component.

import districtToTractsJson from './district-to-tracts.json';

const DISTRICT_TO_TRACTS = districtToTractsJson as Record<string, string[]>;

export interface TractWeight {
  /** 11-digit census tract GEOID (state + county + tract). */
  tract: string;
  /**
   * Fraction of the tract's land area inside this district, in (0, 1].
   * Used to apportion a split tract's population weight across districts.
   * 1 for tracts wholly inside the district.
   */
  areaFraction: number;
}

/**
 * Census tracts overlapping a congressional district, each with the fraction of
 * its land area inside the district. Empty array when the district is unknown.
 * @param stateCode Two-letter state code (e.g. "CA")
 * @param districtNumber District number (e.g. 7, or 0 for at-large)
 */
export function getTractsForDistrict(stateCode: string, districtNumber: number): TractWeight[] {
  const key = `${stateCode.toUpperCase()}-${String(districtNumber).padStart(2, '0')}`;
  const entries = DISTRICT_TO_TRACTS[key];
  if (!entries) return [];
  return entries.map(entry => {
    const sep = entry.indexOf(':');
    if (sep === -1) return { tract: entry, areaFraction: 1 };
    const frac = Number(entry.slice(sep + 1));
    return {
      tract: entry.slice(0, sep),
      areaFraction: Number.isFinite(frac) && frac > 0 ? Math.min(1, frac) : 1,
    };
  });
}

export const TRACT_DISTRICT_MAPPING_STATS = {
  totalDistricts: 441,
  distinctTracts: 85522,
  tractDistrictOverlaps: 90526,
  splitTracts: 4932,
  lastUpdated: '2026-07-08',
  dataSource: 'Census Bureau CD-to-Tract Relationship File (119th Congress, 2020 tracts)',
  congressionalSession: '119th Congress (2025-2027)',
};

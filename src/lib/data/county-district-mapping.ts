/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// County to Congressional District mapping for 119th Congress (2025-2027)
// Source: Census Bureau CD-to-County Relationship File
// Data URL: https://www2.census.gov/geo/docs/maps-data/data/rel2020/cd-sld/tab20_cd11920_county20_natl.txt
// Generated: 2026-03-21
// Total counties: 3,234 | Total districts: 441 | Multi-district counties: 409
//
// DATA REFLECTS 119th Congress redistricting boundaries
// Data stored in JSON files, loaded via JSON import (client-safe)

import countyToDistrictsJson from './county-to-districts.json';
import districtToCountiesJson from './district-to-counties.json';

export interface DistrictMapping {
  state: string;
  district: string;
  areaOverlapPercent: number;
}

// Typed lookup maps
const COUNTY_TO_DISTRICTS = countyToDistrictsJson as Record<string, DistrictMapping[]>;
const DISTRICT_TO_COUNTIES = districtToCountiesJson as Record<string, string[]>;

/**
 * Get congressional districts for a county by FIPS code.
 * Returns all districts the county overlaps, sorted by area overlap descending.
 * @param countyFips 5-character FIPS code (e.g., "06037" for Los Angeles County)
 */
export function getDistrictsForCounty(countyFips: string): DistrictMapping[] {
  return COUNTY_TO_DISTRICTS[countyFips] ?? [];
}

/**
 * Get county FIPS codes for a congressional district.
 * @param stateCode Two-letter state code (e.g., "CA")
 * @param districtNumber District number (e.g., 7 or 0 for at-large)
 */
export function getCountiesForDistrict(stateCode: string, districtNumber: number): string[] {
  const key = `${stateCode.toUpperCase()}-${String(districtNumber).padStart(2, '0')}`;
  return DISTRICT_TO_COUNTIES[key] ?? [];
}

/**
 * Check if a county spans multiple congressional districts.
 */
export function isMultiDistrictCounty(countyFips: string): boolean {
  const districts = COUNTY_TO_DISTRICTS[countyFips];
  return Array.isArray(districts) && districts.length > 1;
}

/**
 * Get the primary district for a county (highest area overlap).
 */
export function getPrimaryDistrictForCounty(countyFips: string): DistrictMapping | null {
  const districts = COUNTY_TO_DISTRICTS[countyFips];
  if (!districts || districts.length === 0) return null;
  return districts[0] ?? null;
}

export const COUNTY_DISTRICT_MAPPING_STATS = {
  totalCounties: 3234,
  totalDistricts: 441,
  multiDistrictCounties: 409,
  singleDistrictCounties: 2825,
  lastUpdated: '2026-03-21',
  dataSource: 'Census Bureau CD-to-County Relationship File (119th Congress)',
  congressionalSession: '119th Congress (2025-2027)',
};

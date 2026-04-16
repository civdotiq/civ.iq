/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Comprehensive ZIP to Congressional District mapping for 119th Congress (2023-2025)
//
// Source:        OpenSourceActivismTech/us-zipcodes-congress
// Data URL:      https://github.com/OpenSourceActivismTech/us-zipcodes-congress
// Generated:    2025-08-19T02:03:06.207Z (upstream data: July 30, 2024)
// Reflects:     Post-2023 redistricting (119th Congress boundaries)
//
// Invariants (asserted by src/__tests__/data/zip-district-mapping.test.ts):
//   - Total ZIP entries: 33,778
//   - Multi-district ZIPs: 7,299
//   - Single-district ZIPs: 26,479
// If these numbers drift without explanation, the upstream has been regenerated
// or the JSON has been tampered with — investigate before merging.
//
// Refresh policy:
//   ZIP-to-district boundaries are structurally static between redistricting
//   cycles. Next expected refresh: after the 2030 Census + 2031-2033
//   state redistricting. Until then, this file should NOT change.
// Data stored in zip-district-mapping-119th.json, loaded via JSON import.

import jsonData from './zip-district-mapping-119th.json';

export interface ZipDistrictMapping {
  state: string;
  district: string;
  primary?: boolean; // For ZIPs that span multiple districts
}

// ZIP codes mapped to their congressional districts
export const ZIP_TO_DISTRICT_MAP_119TH = jsonData as Record<
  string,
  ZipDistrictMapping | ZipDistrictMapping[]
>;

/**
 * Get district for ZIP code
 */
export function getDistrictForZip(
  zipCode: string
): ZipDistrictMapping | ZipDistrictMapping[] | null {
  return ZIP_TO_DISTRICT_MAP_119TH[zipCode] || null;
}

/**
 * Get primary district for ZIP code (for multi-district ZIPs)
 */
export function getPrimaryDistrictForZip(zipCode: string): ZipDistrictMapping | null {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
  if (!result) return null;

  if (Array.isArray(result)) {
    return result.find(d => d.primary) || result[0] || null;
  }

  return result;
}

/**
 * Check if ZIP spans multiple districts
 */
export function isMultiDistrictZip(zipCode: string): boolean {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
  return Array.isArray(result);
}

/**
 * Get all districts for a ZIP code
 */
export function getAllDistrictsForZip(zipCode: string): ZipDistrictMapping[] {
  const result = ZIP_TO_DISTRICT_MAP_119TH[zipCode];
  if (!result) return [];

  return Array.isArray(result) ? result : [result];
}

// Export statistics. These values are asserted in tests — if they drift, the
// source JSON has been regenerated or tampered with.
export const ZIP_MAPPING_STATS = {
  totalZips: 33778,
  multiDistrictZips: 7299,
  singleDistrictZips: 26479,
  lastUpdated: '2025-08-19T02:03:06.207Z',
  dataSource: 'OpenSourceActivismTech/us-zipcodes-congress',
  congressionalSession: '119th Congress (2023-2025)',
  redistrictingCycle: 'Post-2023 Redistricting',
  nextExpectedRefresh: 'Post-2031 redistricting (after 2030 Census)',
};

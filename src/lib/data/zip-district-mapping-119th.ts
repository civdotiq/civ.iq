/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Comprehensive ZIP to Congressional District mapping for 119th Congress (2023-2025)
// Source: OpenSourceActivismTech/us-zipcodes-congress
// Data URL: https://github.com/OpenSourceActivismTech/us-zipcodes-congress
// Generated: 2025-08-19T02:03:06.207Z
// Total ZIP codes: 33774
// Multi-district ZIPs: 7299
//
// DATA REFLECTS POST-2023 REDISTRICTING (119th Congress boundaries)
// Updated: July 30, 2024 (per source repository)
// Data stored in zip-district-mapping-119th.json, loaded via JSON import

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

// Export statistics
export const ZIP_MAPPING_STATS = {
  totalZips: 33774,
  multiDistrictZips: 7299,
  singleDistrictZips: 26475,
  lastUpdated: '2025-08-19T02:03:06.207Z',
  dataSource: 'OpenSourceActivismTech/us-zipcodes-congress',
  congressionalSession: '119th Congress (2023-2025)',
  redistrictingCycle: 'Post-2023 Redistricting',
};

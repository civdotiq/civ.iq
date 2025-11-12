/**
 * U.S. States and Territories - Consolidated Reference Data
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * This file is the SINGLE SOURCE OF TRUTH for all state/territory mappings.
 * Includes all 50 states plus DC and 5 territories.
 *
 * Replaces/consolidates:
 * - src/data/state-mappings.json (deprecated)
 * - Inline state mappings scattered across multiple files
 *
 * Update frequency: NEVER (unless new states/territories added)
 */

// ============================================================================
// STATE ABBREVIATION TO FULL NAME
// ============================================================================

export const US_STATES = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  DC: 'District of Columbia',
  PR: 'Puerto Rico',
  VI: 'U.S. Virgin Islands',
  GU: 'Guam',
  AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
} as const;

// ============================================================================
// REVERSE MAPPING: FULL NAME TO ABBREVIATION
// ============================================================================

/**
 * Map full state/territory names to their abbreviations
 * Handles both "Virgin Islands" and "U.S. Virgin Islands" variants
 */
export const STATE_NAME_TO_CODE: Record<string, StateCode> = {
  Alabama: 'AL',
  Alaska: 'AK',
  Arizona: 'AZ',
  Arkansas: 'AR',
  California: 'CA',
  Colorado: 'CO',
  Connecticut: 'CT',
  Delaware: 'DE',
  Florida: 'FL',
  Georgia: 'GA',
  Hawaii: 'HI',
  Idaho: 'ID',
  Illinois: 'IL',
  Indiana: 'IN',
  Iowa: 'IA',
  Kansas: 'KS',
  Kentucky: 'KY',
  Louisiana: 'LA',
  Maine: 'ME',
  Maryland: 'MD',
  Massachusetts: 'MA',
  Michigan: 'MI',
  Minnesota: 'MN',
  Mississippi: 'MS',
  Missouri: 'MO',
  Montana: 'MT',
  Nebraska: 'NE',
  Nevada: 'NV',
  'New Hampshire': 'NH',
  'New Jersey': 'NJ',
  'New Mexico': 'NM',
  'New York': 'NY',
  'North Carolina': 'NC',
  'North Dakota': 'ND',
  Ohio: 'OH',
  Oklahoma: 'OK',
  Oregon: 'OR',
  Pennsylvania: 'PA',
  'Rhode Island': 'RI',
  'South Carolina': 'SC',
  'South Dakota': 'SD',
  Tennessee: 'TN',
  Texas: 'TX',
  Utah: 'UT',
  Vermont: 'VT',
  Virginia: 'VA',
  Washington: 'WA',
  'West Virginia': 'WV',
  Wisconsin: 'WI',
  Wyoming: 'WY',
  'District of Columbia': 'DC',
  'Puerto Rico': 'PR',
  'U.S. Virgin Islands': 'VI',
  'Virgin Islands': 'VI', // Alternate name
  Guam: 'GU',
  'American Samoa': 'AS',
  'Northern Mariana Islands': 'MP',
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type StateCode = keyof typeof US_STATES;
export type StateName = (typeof US_STATES)[StateCode];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get full state name from abbreviation
 * @param code - State abbreviation (e.g., "CA", "NY")
 * @returns Full state name or undefined if not found
 */
export function getStateName(code: string): StateName | undefined {
  const upperCode = code.toUpperCase() as StateCode;
  return US_STATES[upperCode];
}

/**
 * Get state abbreviation from full name
 * @param name - Full state name (e.g., "California", "New York")
 * @returns State abbreviation or undefined if not found
 */
export function getStateCode(name: string): StateCode | undefined {
  return STATE_NAME_TO_CODE[name];
}

/**
 * Check if a string is a valid state code
 * @param code - Potential state code
 * @returns True if valid state code
 */
export function isValidStateCode(code: string): code is StateCode {
  return code.toUpperCase() in US_STATES;
}

/**
 * Check if a string is a valid state name
 * @param name - Potential state name
 * @returns True if valid state name
 */
export function isValidStateName(name: string): boolean {
  return name in STATE_NAME_TO_CODE;
}

/**
 * Get all state codes as an array
 * @returns Array of all state/territory abbreviations
 */
export function getAllStateCodes(): readonly StateCode[] {
  return Object.keys(US_STATES) as StateCode[];
}

/**
 * Get all state names as an array
 * @returns Array of all state/territory full names
 */
export function getAllStateNames(): readonly StateName[] {
  return Object.values(US_STATES);
}

/**
 * Get only the 50 U.S. states (excludes DC and territories)
 * @returns Array of 50 state codes
 */
export function getStatesOnly(): readonly StateCode[] {
  return Object.keys(US_STATES).filter(
    code => !['DC', 'PR', 'VI', 'GU', 'AS', 'MP'].includes(code)
  ) as StateCode[];
}

/**
 * Get territories only (excludes 50 states and DC)
 * @returns Array of territory codes
 */
export function getTerritoriesOnly(): readonly StateCode[] {
  return ['PR', 'VI', 'GU', 'AS', 'MP'] as const;
}

/**
 * Check if a code represents a U.S. territory
 * @param code - State/territory code
 * @returns True if it's a territory
 */
export function isTerritory(code: string): boolean {
  const upperCode = code.toUpperCase();
  return ['PR', 'VI', 'GU', 'AS', 'MP'].includes(upperCode);
}

/**
 * Normalize state identifier to code (handles both codes and full names)
 * @param identifier - State code or full name (case-insensitive)
 * @returns Normalized state code or undefined
 */
export function normalizeStateIdentifier(identifier: string): StateCode | undefined {
  // Try as code first
  if (isValidStateCode(identifier)) {
    return identifier.toUpperCase() as StateCode;
  }

  // Try as full name (case-insensitive)
  const normalizedName = identifier
    .split(/[\s-]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  return getStateCode(normalizedName);
}

// ============================================================================
// LEGISLATURE NAMES BY STATE
// ============================================================================

/**
 * Official names for state legislative bodies
 * Source: National Conference of State Legislatures (NCSL)
 *
 * 27 states: "Legislature" or "State Legislature"
 * 19 states: "General Assembly"
 * 2 states: "General Court" (Massachusetts, New Hampshire)
 * 2 states: "Legislative Assembly" (North Dakota, Oregon)
 */
export const STATE_LEGISLATURE_NAMES: Record<StateCode, string> = {
  // Legislature (27 states)
  AL: 'Alabama Legislature',
  AK: 'Alaska State Legislature',
  AZ: 'Arizona State Legislature',
  CA: 'California State Legislature',
  FL: 'Florida Legislature',
  HI: 'Hawaii State Legislature',
  ID: 'Idaho Legislature',
  KS: 'Kansas Legislature',
  LA: 'Louisiana Legislature',
  ME: 'Maine Legislature',
  MI: 'Michigan Legislature',
  MN: 'Minnesota Legislature',
  MS: 'Mississippi Legislature',
  MT: 'Montana Legislature',
  NE: 'Nebraska Legislature',
  NV: 'Nevada Legislature',
  NJ: 'New Jersey Legislature',
  NM: 'New Mexico Legislature',
  NY: 'New York State Legislature',
  OK: 'Oklahoma Legislature',
  SD: 'South Dakota Legislature',
  TX: 'Texas Legislature',
  UT: 'Utah State Legislature',
  WA: 'Washington State Legislature',
  WV: 'West Virginia Legislature',
  WI: 'Wisconsin Legislature',
  WY: 'Wyoming Legislature',

  // General Assembly (19 states)
  AR: 'Arkansas General Assembly',
  CO: 'Colorado General Assembly',
  CT: 'Connecticut General Assembly',
  DE: 'Delaware General Assembly',
  GA: 'Georgia General Assembly',
  IL: 'Illinois General Assembly',
  IN: 'Indiana General Assembly',
  IA: 'Iowa General Assembly',
  KY: 'Kentucky General Assembly',
  MD: 'Maryland General Assembly',
  MO: 'Missouri General Assembly',
  NC: 'North Carolina General Assembly',
  OH: 'Ohio General Assembly',
  PA: 'Pennsylvania General Assembly',
  RI: 'Rhode Island General Assembly',
  SC: 'South Carolina General Assembly',
  TN: 'Tennessee General Assembly',
  VT: 'Vermont General Assembly',
  VA: 'Virginia General Assembly',

  // General Court (2 states)
  MA: 'Massachusetts General Court',
  NH: 'New Hampshire General Court',

  // Legislative Assembly (2 states)
  ND: 'North Dakota Legislative Assembly',
  OR: 'Oregon Legislative Assembly',

  // District and Territories
  DC: 'Council of the District of Columbia',
  PR: 'Legislative Assembly of Puerto Rico',
  VI: 'Legislature of the Virgin Islands',
  GU: 'Guam Legislature',
  AS: 'American Samoa Fono',
  MP: 'Northern Mariana Islands Commonwealth Legislature',
};

/**
 * Get the official name of a state's legislative body
 * @param stateCode - State abbreviation (e.g., "MI", "MA", "ND")
 * @returns Official legislature name (e.g., "Michigan Legislature", "Massachusetts General Court")
 */
export function getStateLegislatureName(stateCode: string): string | undefined {
  const upperCode = stateCode.toUpperCase() as StateCode;
  return STATE_LEGISLATURE_NAMES[upperCode];
}

/**
 * Get the short form of the legislature name (e.g., "Legislature", "General Assembly")
 * @param stateCode - State abbreviation
 * @returns Short form name (e.g., "Legislature", "General Assembly", "General Court", "Legislative Assembly")
 */
export function getStateLegislatureType(stateCode: string): string {
  const fullName = getStateLegislatureName(stateCode);
  if (!fullName) return 'Legislature';

  // Extract the type from the full name
  if (fullName.includes('General Assembly')) return 'General Assembly';
  if (fullName.includes('General Court')) return 'General Court';
  if (fullName.includes('Legislative Assembly')) return 'Legislative Assembly';
  if (fullName.includes('Council')) return 'Council';
  if (fullName.includes('Fono')) return 'Fono';
  return 'Legislature';
}

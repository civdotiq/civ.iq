/**
 * Static State Legislature Metadata Loader
 *
 * Provides type-safe access to static metadata about all 50 U.S. state legislatures + DC.
 * This data rarely changes and is cached statically to avoid repeated API calls.
 *
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import legislatureData from '@/data/state-legislatures.json';

export interface ChamberInfo {
  name: string;
  seats: number;
  termLength: number; // in years
}

export interface StateLegislatureMetadata {
  name: string;
  chambers: {
    lower: ChamberInfo;
    upper: ChamberInfo;
  };
  sessionType: string; // "Annual", "Biennial (odd years)", etc.
  sessionLength: string; // Description of session duration
  capitolCity: string;
  website: string;
  unicameral: boolean;
  note?: string; // Optional notes (e.g., Nebraska's unicameral note)
}

export interface StateLegislaturesData {
  metadata: {
    lastUpdated: string;
    version: string;
    description: string;
    source: string;
  };
  legislatures: Record<string, StateLegislatureMetadata>;
}

// Cast the imported JSON to the proper type
const typedLegislatureData = legislatureData as StateLegislaturesData;

/**
 * Get metadata for a specific state legislature
 * @param stateCode Two-letter state code (e.g., "CA", "NY", "DC")
 * @returns State legislature metadata or null if not found
 */
export function getStateLegislatureMetadata(stateCode: string): StateLegislatureMetadata | null {
  const upperStateCode = stateCode.toUpperCase();
  return typedLegislatureData.legislatures[upperStateCode] || null;
}

/**
 * Get all state legislature metadata
 * @returns Record of all state legislatures indexed by state code
 */
export function getAllStateLegislatures(): Record<string, StateLegislatureMetadata> {
  return typedLegislatureData.legislatures;
}

/**
 * Get list of all state codes
 * @returns Array of two-letter state codes
 */
export function getAllStateCodes(): string[] {
  return Object.keys(typedLegislatureData.legislatures);
}

/**
 * Check if a state has a unicameral legislature
 * @param stateCode Two-letter state code
 * @returns True if unicameral, false if bicameral, null if state not found
 */
export function isUnicameral(stateCode: string): boolean | null {
  const metadata = getStateLegislatureMetadata(stateCode);
  return metadata ? metadata.unicameral : null;
}

/**
 * Get the total number of legislators in a state
 * @param stateCode Two-letter state code
 * @returns Total number of seats (lower + upper chambers) or null if not found
 */
export function getTotalSeats(stateCode: string): number | null {
  const metadata = getStateLegislatureMetadata(stateCode);
  if (!metadata) return null;

  // For unicameral legislatures, only count one chamber
  if (metadata.unicameral) {
    return metadata.chambers.lower.seats;
  }

  return metadata.chambers.lower.seats + metadata.chambers.upper.seats;
}

/**
 * Get legislature metadata (for backward compatibility)
 */
export function getLegislatureMetadata() {
  return typedLegislatureData.metadata;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

// Bioguide ID to FEC Candidate ID mapping.
// Maps Congressional representatives to their FEC campaign finance records.
// Format: bioguideId -> { fecId, name, state, district?, office, lastUpdated }
//
// Kept current by the weekly `sync-bioguide-fec` GitHub Action, which pulls
// legislators-current.yaml from unitedstates/congress-legislators and falls
// back to Congress.gov + FEC candidate search for members not yet in the
// YAML. Do not edit the JSON by hand — run `npm run sync:bioguide-fec` or
// wait for the scheduled workflow.
//
// Sources:
//   - https://github.com/unitedstates/congress-legislators
//   - https://api.congress.gov/
//   - https://api.open.fec.gov/
// Data stored in bioguide-fec-mapping.json, loaded via JSON import.

import jsonData from '../data/bioguide-fec-mapping.json';

export interface FECMapping {
  fecId: string;
  name: string;
  state: string;
  district?: string;
  office: 'H' | 'S'; // House or Senate
  lastUpdated: string;
}

// Complete mappings for 119th Congress (537 representatives)
export const bioguideToFECMapping: Record<string, FECMapping> = jsonData as Record<
  string,
  FECMapping
>;

// Helper function to get FEC ID from Bioguide ID
export function getFECIdFromBioguide(bioguideId: string): string | null {
  const mapping = bioguideToFECMapping[bioguideId];
  return mapping ? mapping.fecId : null;
}

// Helper function to check if a mapping exists
export function hasFECMapping(bioguideId: string): boolean {
  return bioguideId in bioguideToFECMapping;
}

// Function to add or update a mapping (for future use)
export function addFECMapping(bioguideId: string, mapping: FECMapping): void {
  bioguideToFECMapping[bioguideId] = mapping;
}

// Reverse mapping: FEC Candidate ID -> Bioguide ID (computed once at module load)
const fecToBioguideMapping: Record<string, string> = Object.fromEntries(
  Object.entries(bioguideToFECMapping).map(([bioguideId, mapping]) => [mapping.fecId, bioguideId])
);

// Reverse lookup: get bioguideId from FEC candidate ID
export function getBioguideFromFEC(fecCandidateId: string): string | null {
  return fecToBioguideMapping[fecCandidateId] ?? null;
}

// Get the full mapping entry by FEC candidate ID
export function getMappingByFEC(
  fecCandidateId: string
): (FECMapping & { bioguideId: string }) | null {
  const bioguideId = fecToBioguideMapping[fecCandidateId];
  if (!bioguideId) return null;
  const mapping = bioguideToFECMapping[bioguideId];
  if (!mapping) return null;
  return { ...mapping, bioguideId };
}

// Get mapping statistics
export function getMappingStats(): {
  totalMappings: number;
  houseMembers: number;
  senateMembers: number;
  lastUpdated: string;
} {
  const mappings = Object.values(bioguideToFECMapping);
  return {
    totalMappings: mappings.length,
    houseMembers: mappings.filter(m => m.office === 'H').length,
    senateMembers: mappings.filter(m => m.office === 'S').length,
    lastUpdated: '2025-09-18',
  };
}

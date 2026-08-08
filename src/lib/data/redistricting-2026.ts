/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * States with NEW congressional maps for the 2026 election (Census RDO
 * list, verified 2026-08-07 — see data_cd120-redistricting-geocoder-gap
 * memory and scripts/sync-cd120-districts.ts). The CD120 boundary corpus
 * covers all 56 jurisdictions so address lookups never depend on this
 * list; it exists only so UI surfaces can warn that a district NUMBER on
 * a 2026 ballot may cover different territory than the current district.
 * Re-check on court-ordered redraws.
 */

export const REDRAWN_2026_STATES: ReadonlySet<string> = new Set([
  'AL',
  'CA',
  'FL',
  'LA',
  'MO',
  'NC',
  'OH',
  'TN',
  'TX',
  'UT',
]);

export function isRedrawnFor2026(state: string | null | undefined): boolean {
  return REDRAWN_2026_STATES.has((state ?? '').toUpperCase());
}

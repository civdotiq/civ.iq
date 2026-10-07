/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The congressional district pages that exist: one per House seat in the
 * 119th Congress, plus a statewide `XX-STATE` page for each state's senators.
 * Pure data, no network, so the page can 404 an unknown id before fetching.
 */

/** House seats per state and delegate jurisdiction (119th Congress apportionment). */
export const HOUSE_SEATS_PER_STATE: Readonly<Record<string, number>> = {
  AL: 7,
  AK: 1,
  AZ: 9,
  AR: 4,
  CA: 52,
  CO: 8,
  CT: 5,
  DE: 1,
  FL: 28,
  GA: 14,
  HI: 2,
  ID: 2,
  IL: 17,
  IN: 9,
  IA: 4,
  KS: 4,
  KY: 6,
  LA: 6,
  ME: 2,
  MD: 8,
  MA: 9,
  MI: 13,
  MN: 8,
  MS: 4,
  MO: 8,
  MT: 2,
  NE: 3,
  NV: 4,
  NH: 2,
  NJ: 12,
  NM: 3,
  NY: 26,
  NC: 14,
  ND: 1,
  OH: 15,
  OK: 5,
  OR: 6,
  PA: 17,
  RI: 2,
  SC: 7,
  SD: 1,
  TN: 9,
  TX: 38,
  UT: 4,
  VT: 1,
  VA: 11,
  WA: 10,
  WV: 2,
  WI: 8,
  WY: 1,
  DC: 1,
  PR: 1,
  VI: 1,
  GU: 1,
  AS: 1,
  MP: 1,
};

/** Seats with a delegate or resident commissioner and no senators. */
const NO_SENATE = new Set(['DC', 'PR', 'VI', 'GU', 'AS', 'MP']);

/**
 * The page id for each House seat: `XX-AL` for a state's only seat (and for
 * delegate seats), otherwise `XX-01`… `XX-NN`.
 */
export function houseDistrictIds(): string[] {
  const ids: string[] = [];
  for (const [state, count] of Object.entries(HOUSE_SEATS_PER_STATE)) {
    if (count === 1) {
      ids.push(`${state}-AL`);
      continue;
    }
    for (let i = 1; i <= count; i++) ids.push(`${state}-${String(i).padStart(2, '0')}`);
  }
  return ids;
}

export type DistrictIdCheck =
  | { kind: 'known' }
  /** A state's only seat written as a number (AK-01): the page lives at XX-AL. */
  | { kind: 'at-large'; canonical: string }
  | { kind: 'unknown' };

/**
 * Check a canonical district id (`canonicalizeDistrictId(...).canonical`)
 * against the seat list.
 */
export function checkDistrictId(state: string, district: string): DistrictIdCheck {
  const seats = HOUSE_SEATS_PER_STATE[state];
  if (!seats) return { kind: 'unknown' };

  if (district === 'STATE') return NO_SENATE.has(state) ? { kind: 'unknown' } : { kind: 'known' };
  if (district === 'AL') return seats === 1 ? { kind: 'known' } : { kind: 'unknown' };
  if (!/^\d+$/.test(district)) return { kind: 'unknown' };

  const n = Number(district);
  if (seats === 1)
    return n === 1 ? { kind: 'at-large', canonical: `${state}-AL` } : { kind: 'unknown' };
  return n >= 1 && n <= seats ? { kind: 'known' } : { kind: 'unknown' };
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Shared 2026-ballot district resolution for the address-lookup routes.
 *
 * Both sessions are modeled deliberately (PLAN-elections-2026-08.md, Phase 0):
 * the Census Geocoder's answer is the 119th-Congress district — correct for
 * "who represents this address today" — while the corpus answer is the
 * 120th-Congress district that 2026 ballots use. In the ten redrawn states
 * they differ for many addresses, and the response says so explicitly instead
 * of silently preferring either.
 */

import { normalizeDistrictCode } from './cd120-corpus';
import { lookupDistrict120 } from './load-districts';

export interface BallotDistrict2026 {
  /** Which Congress these boundaries belong to. */
  cdSession: '120';
  state: string;
  /** Normalized district: "4", "13" or "AL". */
  district: string;
  /** Route-compatible id, zero-padded to match district page convention: "LA-04", "AK-AL". */
  districtId: string;
  /** Census district name, e.g. "Congressional District 4". */
  name: string;
  /** True when the 2026-ballot district differs from the current (119th) one. */
  differsFromCurrent: boolean;
  /** Plain-language explanation, present only when the districts differ. */
  note?: string;
}

/** "4" → "LA-04", "AL" → "AK-AL". */
export function toDistrictId(state: string, district: string): string {
  return district === 'AL' ? `${state}-AL` : `${state}-${district.padStart(2, '0')}`;
}

/** Accepts "04", "4", "00", "98" or "AL" and returns the normalized form. */
function normalizeCurrent(district: string): string {
  const upper = district.toUpperCase();
  if (upper === 'AL') return 'AL';
  return normalizeDistrictCode(district);
}

/**
 * The 120th-Congress district for a coordinate, annotated against the current
 * (119th) district when the caller has one. Null when the corpus is
 * unavailable or the point is outside every district — callers omit the field
 * rather than guessing.
 */
export async function resolveBallotDistrict2026(
  longitude: number,
  latitude: number,
  current?: { state: string; district: string }
): Promise<BallotDistrict2026 | null> {
  const hit = await lookupDistrict120(longitude, latitude);
  if (!hit) return null;

  const districtId = toDistrictId(hit.state, hit.district);
  const currentId = current
    ? toDistrictId(current.state.toUpperCase(), normalizeCurrent(current.district))
    : undefined;
  const differsFromCurrent = currentId !== undefined && currentId !== districtId;

  return {
    cdSession: '120',
    state: hit.state,
    district: hit.district,
    districtId,
    name: hit.name,
    differsFromCurrent,
    ...(differsFromCurrent && currentId
      ? {
          note:
            `This address was redistricted for 2026. Its current representative serves ` +
            `${currentId}. On the November 3, 2026 ballot, this address votes in ${districtId}.`,
        }
      : {}),
  };
}

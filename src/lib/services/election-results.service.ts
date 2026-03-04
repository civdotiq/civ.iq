/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Election Results Service
 *
 * Synchronous lookup functions for 2024 election results.
 * All data is imported at module scope — no async, no network calls.
 */

import { HOUSE_RESULTS_2024 } from '@/data/election-results-house';
import { STATEWIDE_RESULTS_2024 } from '@/data/election-results-statewide';
import { STATE_LEG_RESULTS_2024 } from '@/data/election-results-state-leg';
import { ELECTION_2024_METADATA } from '@/data/election-results-metadata';
import type {
  RaceResultFull,
  RaceResultUnavailable,
  RaceResultOrUnavailable,
  ElectionOffice,
} from '@/types/elections';

function stateInDataset(state: string): boolean {
  return !ELECTION_2024_METADATA.missingStates.includes(state.toUpperCase());
}

function toFull(
  raw: {
    dem: number;
    rep: number;
    other: number;
    total: number;
    winner: string;
    margin: number;
    demPct: number;
    repPct: number;
  },
  office: ElectionOffice,
  districtId: string
): RaceResultFull {
  return {
    ...raw,
    winner: raw.winner as 'D' | 'R' | 'L' | 'OTHER',
    year: 2024,
    office,
    districtId,
    dataAvailable: true,
  };
}

function unavailable(
  office: ElectionOffice,
  districtId: string,
  reason: 'state_not_in_dataset' | 'district_not_found'
): RaceResultUnavailable {
  return { year: 2024, office, districtId, dataAvailable: false, reason };
}

/**
 * Look up 2024 US House results for a district.
 * @param state Two-letter state code (e.g., 'PA')
 * @param district District number as string (e.g., '07' or '7')
 */
export function getHouseResult2024(state: string, district: string): RaceResultOrUnavailable {
  const stateUpper = state.toUpperCase();
  const distNorm = String(parseInt(district, 10) || 0).padStart(2, '0');
  const key = `${stateUpper}-${distNorm}`;

  if (!stateInDataset(stateUpper)) {
    return unavailable('US_HOUSE', key, 'state_not_in_dataset');
  }

  const result = HOUSE_RESULTS_2024[key];
  if (!result) {
    return unavailable('US_HOUSE', key, 'district_not_found');
  }

  return toFull(result, 'US_HOUSE', key);
}

/**
 * Look up 2024 statewide race results (President, Senate, Governor).
 * @param state Two-letter state code (e.g., 'GA')
 * @param office One of 'US_PRESIDENT', 'US_SENATE', 'GOVERNOR'
 */
export function getStatewideResult2024(
  state: string,
  office: 'US_PRESIDENT' | 'US_SENATE' | 'GOVERNOR'
): RaceResultOrUnavailable {
  const stateUpper = state.toUpperCase();
  const officeLabel =
    office === 'US_PRESIDENT' ? 'PRESIDENT' : office === 'US_SENATE' ? 'SENATE' : 'GOVERNOR';
  const key = `${stateUpper}-${officeLabel}`;

  if (!stateInDataset(stateUpper)) {
    return unavailable(office, key, 'state_not_in_dataset');
  }

  const result = STATEWIDE_RESULTS_2024[key];
  if (!result) {
    return unavailable(office, key, 'district_not_found');
  }

  return toFull(result, office, key);
}

/**
 * Look up 2024 state legislature race results.
 * @param districtKey Key in format 'STATE-chamber-N' (e.g., 'AL-lower-1')
 */
export function getStateLegResult2024(districtKey: string): RaceResultOrUnavailable {
  const parts = districtKey.split('-');
  const stateUpper = (parts[0] || '').toUpperCase();
  const chamber = parts[1] || '';
  const office: ElectionOffice = chamber === 'upper' ? 'STATE_SENATE' : 'STATE_HOUSE';

  if (!stateInDataset(stateUpper)) {
    return unavailable(office, districtKey, 'state_not_in_dataset');
  }

  const result = STATE_LEG_RESULTS_2024[districtKey];
  if (!result) {
    return unavailable(office, districtKey, 'district_not_found');
  }

  return toFull(result, office, districtKey);
}

export { ELECTION_2024_METADATA };

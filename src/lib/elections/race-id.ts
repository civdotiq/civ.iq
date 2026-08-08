/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Race-id construction for the 2026 cycle. Pure, importable from both
 * server and client code. Id format matches /elections/[id]:
 *   2026-US_SENATE-MI, 2026-US_HOUSE-MI-13, 2026-US_HOUSE-AK-AL
 */

/** Build a 2026 race id from a seat; returns null when inputs are unusable. */
export function raceId2026(
  chamber: 'House' | 'Senate',
  state: string | null | undefined,
  district: string | null | undefined
): string | null {
  const st = (state ?? '').toUpperCase();
  if (!/^[A-Z]{2}$/.test(st)) return null;
  if (chamber === 'Senate') return `2026-US_SENATE-${st}`;
  const raw = (district ?? '').trim();
  if (raw === '' || raw === '0' || raw === '00' || /^at[- ]?large$/i.test(raw) || raw === 'AL') {
    return `2026-US_HOUSE-${st}-AL`;
  }
  if (!/^\d{1,2}$/.test(raw)) return null;
  return `2026-US_HOUSE-${st}-${raw.padStart(2, '0')}`;
}

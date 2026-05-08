/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Pure helpers for the redesigned DistrictPage. Data fetching is done
 * client-side via SWR in DistrictPage.tsx.
 */

import { getStateName } from '@/lib/data/us-states';

const DISTRICT_ID_RE = /^([A-Z]{2})-(\d{1,2}|AL)$/i;

export interface ParsedDistrictId {
  state: string;
  district: string;
  isAtLarge: boolean;
}

/**
 * Parse "NY-08" / "AK-AL" / "ca-12" into normalized parts.
 * Returns null for malformed IDs (the page falls back to the legacy renderer).
 */
export function parseDistrictId(districtId: string): ParsedDistrictId | null {
  const m = districtId.match(DISTRICT_ID_RE);
  if (!m || !m[1] || !m[2]) return null;
  const state = m[1].toUpperCase();
  const districtRaw = m[2].toUpperCase();
  const isAtLarge = districtRaw === 'AL';
  const district = isAtLarge ? 'AL' : districtRaw.padStart(2, '0');
  return { state, district, isAtLarge };
}

export function districtDisplayLabel(parsed: ParsedDistrictId): string {
  return parsed.isAtLarge ? `${parsed.state}-AL` : `${parsed.state}-${parsed.district}`;
}

export function stateLongName(stateCode: string): string {
  return getStateName(stateCode) ?? stateCode;
}

export function formatCompactDollars(n: number): string {
  if (!Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString('en-US')}K`;
  return `$${n.toLocaleString('en-US')}`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function formatPercent(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function isoToReadable(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Two-letter party code → 'd' | 'r' | 'i'. */
export function partyChipVariant(party: string | undefined): 'd' | 'r' | 'i' {
  const upper = (party ?? '').toUpperCase();
  if (upper.startsWith('D')) return 'd';
  if (upper.startsWith('R')) return 'r';
  return 'i';
}

export function partyShort(party: string | undefined): string {
  const v = partyChipVariant(party);
  if (v === 'd') return 'D';
  if (v === 'r') return 'R';
  return 'I';
}

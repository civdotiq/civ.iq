/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Pure helpers for the PAC profile redesigned page (PR 17). Formatters,
 * PAC-type and donor-tier label maps, and party-stripe colour selection.
 * No data fetching here — SWR lives in the client component.
 */

import type { PACType } from './types';

export const DEFAULT_CYCLE = 2026;

export const PAC_TYPE_LABEL: Record<PACType, { line1: string; line2: string }> = {
  superPac: { line1: 'SUPER', line2: 'PAC' },
  leadership: { line1: 'LEAD.', line2: 'PAC' },
  traditional: { line1: 'TRAD.', line2: 'PAC' },
  hybrid: { line1: 'HYBRID', line2: 'PAC' },
};

export const PAC_TYPE_HUMAN: Record<PACType, string> = {
  superPac: 'Super PAC · Independent expenditure',
  leadership: 'Leadership PAC',
  traditional: 'Traditional PAC',
  hybrid: 'Hybrid PAC',
};

export type PartyAlignment = 'd' | 'r' | 'i';

/**
 * Resolve PAC partisan alignment from the FEC `party` field. The FEC
 * `committee.party` column carries the canonical NES party code on
 * party-affiliated committees and is empty on non-partisan or
 * cross-aisle committees. Default is independent ('i').
 */
export function partyAlignment(party: string | null | undefined): PartyAlignment {
  const upper = (party ?? '').trim().toUpperCase();
  if (upper === 'DEM' || upper === 'D') return 'd';
  if (upper === 'REP' || upper === 'R') return 'r';
  return 'i';
}

export function partyAlignmentLabel(p: PartyAlignment): string {
  if (p === 'd') return 'Aligned · Democratic';
  if (p === 'r') return 'Aligned · Republican';
  return 'Nonpartisan or unknown alignment';
}

export function partyStripeVar(p: PartyAlignment): string {
  if (p === 'd') return 'var(--civiq-green)';
  if (p === 'r') return 'var(--civiq-red)';
  return 'var(--ink)';
}

export function chamberScopeLabel(candidateIds: string[]): string {
  if (!candidateIds || candidateIds.length === 0) return 'Federal';
  const senate = candidateIds.some(id => id.startsWith('S'));
  const house = candidateIds.some(id => id.startsWith('H'));
  const president = candidateIds.some(id => id.startsWith('P'));
  const parts: string[] = ['Federal'];
  if (senate) parts.push('Senate');
  if (house) parts.push('House');
  if (president) parts.push('President');
  return parts.join(' · ');
}

export function formatCompactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${n.toLocaleString('en-US')}`;
}

export function formatCount(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US');
}

export function isoToReadable(iso: string | null | undefined): string {
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

/**
 * FEC `by_size` returns 6 canonical buckets keyed on the lower bound:
 * 0 (under $200), 200, 500, 1000, 2000, and 2500/3300. Per-row labels
 * here cover the common cases. The map falls through to a generic
 * "$<size>+" label for unfamiliar thresholds.
 */
export const SIZE_BUCKET_LABEL: Record<number, string> = {
  0: '<$200 donors',
  200: '$200–499',
  500: '$500–999',
  1000: '$1,000–1,999',
  2000: '$2,000–2,499',
  2500: '$2,500–3,299',
  3300: '$3,300+ (max-out)',
};

export function sizeBucketLabel(size: number): string {
  return SIZE_BUCKET_LABEL[size] ?? `$${size.toLocaleString('en-US')}+`;
}

export interface BucketRow {
  size: number;
  label: string;
  total: number;
  count: number;
  pct: number;
}

export function summariseBuckets(buckets: { size: number; total: number; count: number }[]): {
  rows: BucketRow[];
  total: number;
  smallShare: number;
} {
  if (!buckets.length) return { rows: [], total: 0, smallShare: 0 };
  const total = buckets.reduce((s, b) => s + (b.total || 0), 0);
  const rows: BucketRow[] = buckets.map(b => ({
    size: b.size,
    label: sizeBucketLabel(b.size),
    total: b.total,
    count: b.count,
    pct: total > 0 ? Math.round((b.total / total) * 1000) / 10 : 0,
  }));
  const small = buckets.find(b => b.size === 0 || b.size < 200);
  const smallShare = small && total > 0 ? small.total / total : 0;
  return { rows, total, smallShare };
}

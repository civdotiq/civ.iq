/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Pure helpers for the head-to-head election page (PR 19). Race-id
 * parsing, formatters, party color resolver, days-to-election helper,
 * election-day inference. No data fetching here.
 */

import type { ElectionOffice, ElectionRaceId, ElectionRacePartyChair } from '@/types/elections';

const RACE_ID_RE =
  /^(\d{4})-(US_PRESIDENT|US_SENATE|US_HOUSE|GOVERNOR)-([A-Z]{2}|NATIONAL)(?:-(\d{2}|AL|00))?$/;

export function parseRaceId(raw: string): ElectionRaceId | null {
  const m = raw.toUpperCase().match(RACE_ID_RE);
  if (!m) return null;
  const year = parseInt(m[1] ?? '', 10);
  if (!Number.isFinite(year) || year < 1980 || year > 2100) return null;
  const office = m[2] as ElectionOffice;
  const state = m[3] ?? '';
  const district = m[4] ?? null;
  return { year, office, state, district, raceId: raw.toUpperCase() };
}

export function officeLabel(office: ElectionOffice): string {
  switch (office) {
    case 'US_PRESIDENT':
      return 'U.S. President';
    case 'US_SENATE':
      return 'U.S. Senate';
    case 'US_HOUSE':
      return 'U.S. House';
    case 'GOVERNOR':
      return 'Governor';
    default:
      return office;
  }
}

export function raceTitle(parsed: ElectionRaceId): string {
  const office = officeLabel(parsed.office);
  if (parsed.office === 'US_HOUSE' && parsed.district) {
    const dist = parsed.district === 'AL' ? 'AL' : parsed.district.replace(/^0+/, '') || '0';
    return `${parsed.state}-${dist} · ${office}`;
  }
  if (parsed.state === 'NATIONAL') return `${office}`;
  return `${parsed.state} · ${office}`;
}

export function partyColorVar(party: ElectionRacePartyChair): string {
  return party === 'D' ? 'var(--party-democrat)' : 'var(--civiq-red)';
}

export function partyChipVariant(party: ElectionRacePartyChair): 'd' | 'r' {
  return party === 'D' ? 'd' : 'r';
}

/**
 * General-election day for federal races: Tuesday after the first
 * Monday of November in the election year. Sufficient for the ticker
 * — does not handle off-cycle special elections.
 */
export function generalElectionDay(year: number): Date {
  // November is month index 10
  const nov1 = new Date(Date.UTC(year, 10, 1));
  const dow = nov1.getUTCDay(); // 0 = Sunday
  // First Monday of November:
  const firstMondayOffset = (1 - dow + 7) % 7;
  const firstMonday = 1 + firstMondayOffset;
  // Tuesday after first Monday:
  return new Date(Date.UTC(year, 10, firstMonday + 1));
}

export function daysUntil(target: Date, now: Date = new Date()): number {
  const ms = target.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function formatCompactDollars(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  if (n === 0) return '$0';
  const abs = Math.abs(n);
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`;
  return `$${n.toLocaleString('en-US')}`;
}

export function formatPct(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

export function formatDateLong(iso: string | null | undefined): string {
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

export function formatDateLongFromDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function incumbencyLabel(code: 'I' | 'C' | 'O' | null): string {
  if (code === 'I') return 'Incumbent';
  if (code === 'C') return 'Challenger';
  if (code === 'O') return 'Open seat';
  return 'Filing';
}

export function nameSurname(name: string): string {
  // FEC stores names as "LAST, FIRST MI" — display as "Last".
  const trimmed = name.trim();
  if (trimmed.includes(',')) {
    const last = trimmed.split(',')[0]?.trim() ?? trimmed;
    return titleCase(last);
  }
  const parts = trimmed.split(/\s+/);
  return titleCase(parts[parts.length - 1] ?? trimmed);
}

export function displayName(name: string): string {
  // FEC: "MORENO, BERNARD" → "Bernard Moreno"
  const trimmed = name.trim();
  if (trimmed.includes(',')) {
    const [last = '', rest = ''] = trimmed.split(',', 2);
    return titleCase(`${rest.trim()} ${last.trim()}`).trim();
  }
  return titleCase(trimmed);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map(p => (p.length > 0 ? p[0]!.toUpperCase() + p.slice(1) : p))
    .join(' ');
}

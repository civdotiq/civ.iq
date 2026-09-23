/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Pure merge logic for scripts/sync-congress-legislators.ts.
 *
 * data/legislators-current.yaml was a hand-maintained copy of
 * unitedstates/congress-legislators that went six months without a sync:
 * newly seated members were missing, so Senate roll calls stored their LIS
 * ids (S440) where a bioguide id belonged. The sync rebuilds it from
 * upstream plus a small local overlay, and writes the members who left
 * recently to data/legislators-departed.yaml so older roll calls still
 * resolve.
 */

export interface LeadershipRole {
  title: string;
  chamber?: string;
  start?: string;
  end?: string;
}

export interface UpstreamLegislator {
  id: { bioguide: string; lis?: string; [key: string]: unknown };
  name: { first?: string; last?: string; official_full?: string; [key: string]: unknown };
  terms: Array<{ type: 'rep' | 'sen'; start: string; end: string; [key: string]: unknown }>;
  leadership_roles?: LeadershipRole[];
  [key: string]: unknown;
}

export interface OverlayEntry {
  bioguide: string;
  leadership_roles?: LeadershipRole[];
}

/**
 * Start date of the Congress before the one in session on `now`. A Congress
 * starts on January 3 of an odd year; keeping members through the previous
 * Congress means roll calls stay resolvable across a changeover.
 */
export function previousCongressStart(now: Date): string {
  const year = now.getUTCFullYear();
  const beforeJan3 = now.getUTCMonth() === 0 && now.getUTCDate() < 3;
  let currentStart = year % 2 === 1 ? year : year - 1;
  if (year % 2 === 1 && beforeJan3) currentStart -= 2;
  return `${currentStart - 2}-01-03`;
}

/** Historical members whose last term ended on or after `cutoff` and who are not current. */
export function selectDeparted(
  historical: UpstreamLegislator[],
  current: UpstreamLegislator[],
  cutoff: string
): UpstreamLegislator[] {
  const currentIds = new Set(current.map(l => l.id.bioguide));
  return historical.filter(l => {
    const last = l.terms[l.terms.length - 1];
    return last !== undefined && last.end >= cutoff && !currentIds.has(l.id.bioguide);
  });
}

/**
 * Append overlay leadership roles to current members. A role upstream already
 * lists (same title and start) is skipped; an overlay entry for someone not
 * in the current roster is reported, not applied.
 */
export function applyOverlay(
  current: UpstreamLegislator[],
  overlay: OverlayEntry[]
): { legislators: UpstreamLegislator[]; applied: number; unmatched: string[] } {
  const byId = new Map(overlay.map(o => [o.bioguide, o]));
  const seen = new Set<string>();
  let applied = 0;

  const legislators = current.map(l => {
    const entry = byId.get(l.id.bioguide);
    if (!entry?.leadership_roles?.length) return l;
    seen.add(l.id.bioguide);

    const existing = l.leadership_roles ?? [];
    const additions = entry.leadership_roles.filter(
      role => !existing.some(r => r.title === role.title && r.start === role.start)
    );
    if (additions.length === 0) return l;
    applied += additions.length;
    return { ...l, leadership_roles: [...existing, ...additions] };
  });

  const unmatched = overlay.map(o => o.bioguide).filter(id => !seen.has(id));
  return { legislators, applied, unmatched };
}

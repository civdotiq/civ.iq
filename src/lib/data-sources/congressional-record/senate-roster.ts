/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Who sat in the Senate on a given day, and which of them a surname printed in
 * the Congressional Record means.
 *
 * Built from congress-legislators (data/legislators-current.yaml and
 * data/legislators-departed.yaml): each Senate term's start and end dates.
 * congress-legislators sets a departing senator's last term to end on the
 * departure day, so appointees and departures fall out of the dates (Lindsey
 * Graham through 2026-07-11, Darline Graham from 2026-07-14).
 *
 * The Record prints a surname, adding "(ST)" only when two sitting senators
 * share it. A senator's candidate surnames are congress-legislators'
 * `name.last` and the last word of `official_full` (Darline Graham is
 * "Graham Nordone" in `name.last`, "Graham" in the Record). Never guess: a
 * printed name matching no senator, or more than one, is an error.
 */

import { foldForSearch } from '@/lib/utils/fold-for-search';

/** The fields of a congress-legislators entry this module reads. */
export interface RosterLegislator {
  id: { bioguide: string; lis?: string };
  name: { last?: string; official_full?: string };
  terms: Array<{ type: string; start: string; end: string; state?: string; party?: string }>;
}

export interface SenateTerm {
  bioguide: string;
  state: string;
  start: string;
  end: string;
  /** "R", "D" or "I", as stored roll calls write it; '' when the term has no party. */
  party: string;
  /** Folded candidate surnames. */
  surnames: string[];
}

export type NameMatch = { bioguide: string } | { error: string };

const SUFFIX = /^(jr|sr|ii|iii|iv)\.?$/i;

function foldName(s: string): string {
  return foldForSearch(s).replace(/\s+/g, ' ').trim();
}

function candidateSurnames(name: RosterLegislator['name']): string[] {
  const out = new Set<string>();
  if (name.last) out.add(foldName(name.last));
  const words = (name.official_full ?? '').replace(/,/g, ' ').split(/\s+/).filter(Boolean);
  while (words.length > 1 && SUFFIX.test(words[words.length - 1] ?? '')) words.pop();
  const last = words[words.length - 1];
  if (words.length > 1 && last) out.add(foldName(last));
  return [...out];
}

export function senateTerms(legislators: RosterLegislator[]): SenateTerm[] {
  const terms: SenateTerm[] = [];
  for (const l of legislators) {
    const surnames = candidateSurnames(l.name);
    for (const t of l.terms) {
      if (t.type !== 'sen' || !t.state) continue;
      terms.push({
        bioguide: l.id.bioguide,
        state: t.state,
        start: t.start,
        end: t.end,
        party: (t.party ?? '').slice(0, 1).toUpperCase(),
        surnames,
      });
    }
  }
  return terms;
}

/** Senators serving on `date` (YYYY-MM-DD), one entry each. */
export function seatedOn(terms: SenateTerm[], date: string): SenateTerm[] {
  const byId = new Map<string, SenateTerm>();
  for (const t of terms) {
    if (t.start <= date && date <= t.end && !byId.has(t.bioguide)) byId.set(t.bioguide, t);
  }
  return [...byId.values()];
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Whether `date` is a senator's first or last day of a stretch of service.
 * The dates are the appointment or departure day, so a roll call that day can
 * come before the swearing-in or after the departure (2026: Armstrong missed
 * roll 65 on 2026-03-24, Darline Graham roll 194 on 2026-07-14; senate.gov
 * doesn't list them either).
 */
export function isFirstOrLastDay(terms: SenateTerm[], bioguide: string, date: string): boolean {
  const own = terms.filter(t => t.bioguide === bioguide);
  const first = own.some(
    t => t.start === date && !own.some(o => o.end === date || o.end === addDays(date, -1))
  );
  const last = own.some(
    t => t.end === date && !own.some(o => o.start === date || o.start === addDays(date, 1))
  );
  return first || last;
}

/** "Scott (FL)" → the Bioguide ID of the one seated senator it can mean. */
export function matchPrintedName(printed: string, seated: SenateTerm[]): NameMatch {
  const m = /^(.*?)\s*(?:\(([A-Z]{2})\))?$/.exec(printed.trim());
  const surname = foldName(m?.[1] ?? '');
  const state = m?.[2];
  if (!surname) return { error: `empty name "${printed}"` };
  const hits = seated.filter(s => s.surnames.includes(surname) && (!state || s.state === state));
  if (hits.length === 1 && hits[0]) return { bioguide: hits[0].bioguide };
  if (hits.length === 0) return { error: `"${printed}" matches no seated senator` };
  return {
    error: `"${printed}" matches ${hits.length} seated senators (${hits.map(h => h.bioguide).join(', ')})`,
  };
}

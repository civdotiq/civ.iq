/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * When each current member's entry in congress-legislators'
 * legislators-current.yaml last changed: the roster facts a profile shows
 * (name, birthday, and the current term: chamber, state, district, party,
 * dates, office, phone, website). src/data/member-roster-history.json keeps a
 * fingerprint of those facts and the date of the upstream commit that last
 * changed them; scripts/sync-member-roster-history.ts walks upstream's git
 * history to keep it current.
 *
 * It is one input to a profile's "Latest record" date (real-dates plan),
 * mostly for members with no votes yet. IDs (FEC, Wikidata, …) aren't shown
 * as facts, so changes to them don't count.
 */

import { createHash } from 'node:crypto';

export interface RosterEntry {
  id: { bioguide: string };
  name?: Record<string, unknown>;
  bio?: Record<string, unknown>;
  terms?: Array<Record<string, unknown>>;
}

export interface MemberRosterHistory {
  /** The newest upstream commit read, and its date. */
  throughCommit: string;
  throughDate: string;
  source: string;
  members: Record<string, { fingerprint: string; changedOn: string }>;
}

/** JSON with keys sorted at every level, so key order never reads as a change. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The facts a profile shows from the roster entry, hashed. */
export function rosterFingerprint(entry: RosterEntry): string {
  const facts = {
    name: entry.name ?? null,
    birthday: entry.bio?.birthday ?? null,
    currentTerm: entry.terms?.[entry.terms.length - 1] ?? null,
  };
  return createHash('sha256').update(stableJson(facts)).digest('hex').slice(0, 16);
}

/** The calendar day in Washington of a commit time. */
export function easternDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/**
 * Apply one upstream version of the roster: a member whose facts changed (or
 * who is new) is dated by this commit; members no longer listed drop out.
 */
export function applyRosterVersion(
  members: MemberRosterHistory['members'],
  entries: RosterEntry[],
  commitDate: string
): MemberRosterHistory['members'] {
  const day = easternDay(commitDate);
  const next: MemberRosterHistory['members'] = {};
  for (const entry of entries) {
    const id = entry.id?.bioguide;
    if (!id) continue;
    const fingerprint = rosterFingerprint(entry);
    const previous = members[id];
    next[id] =
      previous && previous.fingerprint === fingerprint ? previous : { fingerprint, changedOn: day };
  }
  return next;
}

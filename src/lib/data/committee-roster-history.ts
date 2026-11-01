/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * When each committee's facts in congress-legislators last changed: the
 * entry in committees-current.yaml (name, subcommittees) and its roster in
 * committee-membership-current.yaml (members, titles, ranks, party side).
 * src/data/committee-roster-history.json keeps a fingerprint of those facts
 * per committee and subcommittee ID and the date of the upstream commit that
 * last changed them; scripts/sync-committee-roster-history.ts walks the two
 * files' git history to keep it current.
 *
 * It is the "Latest record" of a committee page (real-dates plan, PR 4):
 * everything the server renders there comes from those two files. Same
 * pattern as member-roster-history.ts.
 */

import { createHash } from 'node:crypto';
import { easternDay, stableJson } from './member-roster-history';

export interface UpstreamCommitteeEntry {
  thomas_id: string;
  name?: string;
  subcommittees?: Array<{ thomas_id: string; name?: string }>;
}

export interface UpstreamMember {
  bioguide?: string;
  title?: string;
  rank?: number;
  party?: string;
}

/** committee-membership-current.yaml: committee or subcommittee ID → members. */
export type UpstreamMembership = Record<string, UpstreamMember[] | undefined>;

export interface CommitteeRosterHistory {
  /** The newest upstream commit read (either file), and its date. */
  throughCommit: string;
  throughDate: string;
  source: string;
  committees: Record<string, { fingerprint: string; changedOn: string }>;
}

function memberFacts(members: UpstreamMember[] | undefined): unknown[] {
  return (members ?? [])
    .filter(m => m.bioguide)
    .map(m => ({
      bioguide: m.bioguide,
      title: m.title ?? null,
      rank: m.rank ?? null,
      party: m.party ?? null,
    }))
    .sort((a, b) => String(a.bioguide).localeCompare(String(b.bioguide)));
}

function hash(facts: unknown): string {
  return createHash('sha256').update(stableJson(facts)).digest('hex').slice(0, 16);
}

/**
 * The facts each committee page shows, hashed, keyed by page ID: the
 * committee's thomas_id ("SSJU") and each subcommittee's full ID ("SSJU01").
 */
export function committeeFingerprints(
  committees: UpstreamCommitteeEntry[],
  membership: UpstreamMembership
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const committee of committees) {
    const id = committee.thomas_id?.toUpperCase();
    if (!id) continue;
    const subcommittees = (committee.subcommittees ?? [])
      .map(s => ({ id: `${id}${s.thomas_id}`, name: s.name ?? null }))
      .sort((a, b) => a.id.localeCompare(b.id));
    out[id] = hash({
      name: committee.name ?? null,
      subcommittees,
      members: memberFacts(membership[id]),
    });
    for (const sub of subcommittees) {
      out[sub.id] = hash({ name: sub.name, members: memberFacts(membership[sub.id]) });
    }
  }
  return out;
}

/**
 * Apply one upstream version: a committee whose facts changed (or that is
 * new) is dated by this commit; committees no longer listed drop out.
 */
export function applyCommitteeVersion(
  previous: CommitteeRosterHistory['committees'],
  committees: UpstreamCommitteeEntry[],
  membership: UpstreamMembership,
  commitDate: string
): CommitteeRosterHistory['committees'] {
  const day = easternDay(commitDate);
  const next: CommitteeRosterHistory['committees'] = {};
  for (const [id, fingerprint] of Object.entries(committeeFingerprints(committees, membership))) {
    const before = previous[id];
    next[id] =
      before && before.fingerprint === fingerprint ? before : { fingerprint, changedOn: day };
  }
  return next;
}

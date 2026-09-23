/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State legislative committee corpus, built from the same openstates/people
 * tarball as the roster corpus (data/<state>/committees/*.yml, CC0-1.0).
 *
 * The committees list and detail pages called the OpenStates v3 /committees
 * endpoint, which pages at 20: a state costs 2-6 requests against a
 * 1,000/day cap the key was already over (1,729 on 2026-09-23). Every
 * committee page then showed "temporarily unavailable" for the rest of the
 * day. Committee YAML carries the same `ocd-organization/<uuid>` ids the API
 * returns, so existing URLs keep working.
 *
 * Encoding mirrors people-corpus.ts: rows grouped per jurisdiction with a
 * slice table, member roles dictionary-encoded. Shape and decoder only, no
 * imports — the builder is build-committees.ts, the reader load-committees.ts.
 */

/** Chamber as upstream classifies it. 'legislature' = joint or unicameral. */
export type CommitteeChamber = 'upper' | 'lower' | 'legislature';

/** [name, roleIdx, personUuid ('' when upstream has no person_id)] */
export type EncodedMember = [string, number, string];

/**
 * One encoded committee. Slots:
 *   0 uuid        — `ocd-organization/` prefix stripped
 *   1 name
 *   2 chamberIdx  — index into `chambers`
 *   3 subcommittee — 1 for a subcommittee, else 0
 *   4 parentUuid  — '' for a top-level committee
 *   5 links       — URLs
 *   6 sources     — URLs
 *   7 members
 */
export type EncodedCommitteeRow = [
  string,
  string,
  number,
  0 | 1,
  string,
  string[],
  string[],
  EncodedMember[],
];

export interface CommitteesCorpusFile {
  version: 1;
  generatedAt: string;
  upstreamCommit: string;
  upstreamCommittedAt: string;
  chambers: CommitteeChamber[];
  /** Distinct upstream member roles, verbatim ('chair', 'member', ...). */
  roles: string[];
  /** `[jurisdiction, offset, count]`, rows contiguous. Jurisdiction is the USPS code. */
  jurisdictions: Array<[string, number, number]>;
  rows: EncodedCommitteeRow[];
  meta: {
    committees: number;
    memberships: number;
    source: string;
    methodology: string;
  };
}

export interface CorpusCommittee {
  /** Full `ocd-organization/<uuid>` — the same id the v3 API returns. */
  id: string;
  name: string;
  chamber: CommitteeChamber;
  classification: 'committee' | 'subcommittee';
  parentId: string | null;
  jurisdiction: string;
  links: string[];
  sources: string[];
  members: Array<{ name: string; role: string; personId: string | null }>;
}

export function decodeCommitteeRow(
  file: CommitteesCorpusFile,
  row: EncodedCommitteeRow,
  jurisdiction: string
): CorpusCommittee {
  return {
    id: `ocd-organization/${row[0]}`,
    name: row[1],
    chamber: file.chambers[row[2]] ?? 'legislature',
    classification: row[3] === 1 ? 'subcommittee' : 'committee',
    parentId: row[4] ? `ocd-organization/${row[4]}` : null,
    jurisdiction,
    links: row[5],
    sources: row[6],
    members: row[7].map(([name, roleIdx, uuid]) => ({
      name,
      role: file.roles[roleIdx] ?? 'member',
      personId: uuid ? `ocd-person/${uuid}` : null,
    })),
  };
}

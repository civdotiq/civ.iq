/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State legislator roster corpus (PLAN-openstates-corpus-2026-08.md).
 *
 * Rosters used to come from the OpenStates v3 `/people` API, which pages at 50.
 * One roster costs 3-9 requests (New Hampshire needs 9), so rendering all 50
 * states once is ~169 of a 1,000/day allowance — before bills, committees or
 * any crawler. Production exhausted the daily cap the day the state fixes
 * shipped: California's legislature page went blank while Michigan and DC were
 * fine, purely on quota luck. A rate limiter paces requests; it does not create
 * capacity. The surface had to stop calling the API for rosters at all.
 *
 * The source is `github.com/openstates/people` (CC0-1.0), one YAML per
 * official, which is *not* the per-session bulk CSV — that ships bills, votes
 * and organizations but no people file. Crucially the YAML `id` is the same
 * `ocd-person/<uuid>` identifier the v3 API returns, so existing URLs, cache
 * keys and cross-links keep working.
 *
 * Encoding: party and chamber are dictionary-encoded because they repeat across
 * every row (17 distinct party names in 7,453 records). Jurisdiction is not a
 * per-row field at all — rows are stored contiguously per jurisdiction and the
 * `jurisdictions` table gives each one's slice, so answering "Michigan's roster"
 * decodes 148 rows rather than walking all 53 jurisdictions.
 *
 * This module holds the shape and the decoder only, with no imports, so the
 * request-time reader does not drag the build-time YAML parser into every
 * consumer. The builder lives in build-corpus.ts.
 */

/** Chamber as upstream classifies it. 'legislature' is the unicameral marker. */
export type CorpusChamber = 'upper' | 'lower' | 'legislature';

/**
 * One encoded person. Slots, in order:
 *
 *   0  uuid          — `ocd-person/` prefix stripped; the decoder restores it
 *   1  name
 *   2  givenName
 *   3  familyName
 *   4  partyIdx      — index into `parties`
 *   5  chamberIdx    — index into `chambers`
 *   6  district
 *   7  startDate     — '' when upstream has none
 *   8  endDate       — '' when the role is open-ended (the normal case)
 *   9  email         — '' when absent
 *   10 phone         — capitol office `voice`, else the first office with one
 *   11 office        — capitol office address, else the first with one
 *   12 image         — '' when absent
 *   13 links         — profile/homepage URLs
 *   14 identifiers   — [scheme, identifier] pairs (twitter, facebook, ...)
 */
export type EncodedPersonRow = [
  string,
  string,
  string,
  string,
  number,
  number,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string[],
  Array<[string, string]>,
];

export interface PeopleCorpusFile {
  version: 1;
  generatedAt: string;
  /**
   * Head commit of openstates/people the corpus was built from, and when it was
   * committed. The content freshness canary: `generatedAt` only says when we
   * ran, not whether upstream had moved.
   */
  upstreamCommit: string;
  upstreamCommittedAt: string;
  /** Distinct upstream party names, verbatim ('Democratic', 'Nonpartisan', ...). */
  parties: string[];
  /** Index space for a row's chamber slot. */
  chambers: CorpusChamber[];
  /** `[jurisdiction, offset, count]`, rows contiguous. Jurisdiction is the USPS code. */
  jurisdictions: Array<[string, number, number]>;
  rows: EncodedPersonRow[];
  meta: {
    people: number;
    /**
     * Records skipped because their only chamber role had already ended — a
     * member who left since upstream last moved them to `retired/`. Two at the
     * time of writing, out of 7,453; a jump here means upstream has stalled.
     */
    departed: number;
    source: string;
    methodology: string;
  };
}

/** A decoded person, materialized on demand by the request-time reader. */
export interface CorpusPerson {
  /** Full `ocd-person/<uuid>` — the same id the v3 API returns. */
  id: string;
  name: string;
  givenName: string;
  familyName: string;
  /** Upstream party name, un-normalized. Nebraska's members are 'Nonpartisan'. */
  party: string;
  chamber: CorpusChamber;
  district: string;
  /** USPS code, from the row's jurisdiction group rather than the row itself. */
  jurisdiction: string;
  startDate: string;
  endDate: string;
  email?: string;
  phone?: string;
  office?: string;
  image?: string;
  links: string[];
  identifiers: Array<{ scheme: string; identifier: string }>;
}

/** Decode one row against its file's dictionaries. */
export function decodePersonRow(
  file: PeopleCorpusFile,
  row: EncodedPersonRow,
  jurisdiction: string
): CorpusPerson {
  return {
    id: `ocd-person/${row[0]}`,
    name: row[1],
    givenName: row[2],
    familyName: row[3],
    party: file.parties[row[4]] ?? '',
    chamber: file.chambers[row[5]] ?? 'lower',
    district: row[6],
    jurisdiction,
    startDate: row[7],
    endDate: row[8],
    email: row[9] || undefined,
    phone: row[10] || undefined,
    office: row[11] || undefined,
    image: row[12] || undefined,
    links: row[13],
    identifiers: row[14].map(([scheme, identifier]) => ({ scheme, identifier })),
  };
}

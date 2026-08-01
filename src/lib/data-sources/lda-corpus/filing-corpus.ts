/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Filing-level LDA corpus (Phase 3 of PLAN-lobbying-corpus-2026-07.md).
 *
 * The aggregate corpus (aggregate.ts) answers "how much was spent on filings
 * touching this committee". Analyzers need the rows themselves — an
 * organization's name, its issue codes, and which committees its filings
 * disclose — so they can join lobbying to contributions and votes. Serving that
 * from the 25-filings-per-quarter API sample gave every analyzer a ~0.09% view.
 *
 * The file is dictionary-encoded rather than an array of objects. The same
 * strings repeat across 137k rows ("SENATE", "HOUSE OF REPRESENTATIVES", issue
 * codes, registrant names), so encoding them once shrinks the artifact by ~9x
 * and, more importantly, lets the request-time reader hold one shared string per
 * distinct value instead of one per row.
 *
 * Committee attribution is resolved at BUILD time (same resolver the aggregates
 * use) because it runs Fuse.js entity resolution — far too slow to repeat over
 * the whole corpus inside a request.
 *
 * This module holds the shape and the decoder only, with no imports: the
 * request-time reader must not drag the build-time committee resolver (and its
 * policy-area tables) into every consumer. The builder lives in
 * build-filing-corpus.ts.
 */

/**
 * One encoded row. Indices point into the file's dictionaries:
 * [clientIdx, registrantIdx, quarterIdx, amount, issueIdxs, entityIdxs, committeeIdxs]
 */
export type EncodedFilingRow = [number, number, number, number, number[], number[], number[]];

export interface FilingCorpusFile {
  version: 1;
  generatedAt: string;
  /** dt_posted of the most recent filing (freshness canary, matches aggregates). */
  latestFilingPosted: string | null;
  /** Quarter keys, oldest first. Index space for a row's quarter slot. */
  quarters: string[];
  /** Distinct client (organization) names. */
  clients: string[];
  /** Distinct registrants as [id, name]. */
  registrants: Array<[string, string]>;
  /** Distinct LDA issue codes. */
  issues: string[];
  /** Distinct disclosed government-entity names. */
  entities: string[];
  /** Distinct committees as [code, name]. */
  committees: Array<[string, string]>;
  rows: EncodedFilingRow[];
  meta: {
    reportFilings: number;
    gatedFilings: number;
    committeeMatch: 'entity-resolution+issue-jurisdiction';
    methodology: string;
  };
}

/** A decoded filing row, materialized on demand by the request-time reader. */
export interface CorpusFiling {
  clientName: string;
  registrantId: string;
  registrantName: string;
  quarter: string;
  /** Gated amount (income or expenses, plausibility-capped); a crank filing is 0. */
  amount: number;
  issueCodes: string[];
  governmentEntities: string[];
  /** Committee codes whose jurisdiction this filing's entities/issues touch. */
  committeeCodes: string[];
}

/** Decode one row against its file's dictionaries. */
export function decodeFilingRow(file: FilingCorpusFile, row: EncodedFilingRow): CorpusFiling {
  const registrant = file.registrants[row[1]] ?? ['', ''];
  return {
    clientName: file.clients[row[0]] ?? '',
    registrantId: registrant[0],
    registrantName: registrant[1],
    quarter: file.quarters[row[2]] ?? '',
    amount: row[3],
    issueCodes: row[4].map(i => file.issues[i] ?? '').filter(Boolean),
    governmentEntities: row[5].map(i => file.entities[i] ?? '').filter(Boolean),
    committeeCodes: row[6].map(i => file.committees[i]?.[0] ?? '').filter(Boolean),
  };
}

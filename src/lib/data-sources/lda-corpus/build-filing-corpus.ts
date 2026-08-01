/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Build-time construction of the filing-level LDA corpus (see filing-corpus.ts
 * for the shape and the decoder). Runs inside scripts/sync-lda-corpus.ts and the
 * weekly mirror workflow, never on a request path — it resolves committee
 * attribution for every filing, which runs Fuse.js entity resolution.
 */

import { dedupeAmendments } from './dedupe';
import { resolveFilingCommittees } from './committee-match';
import type { CompactFiling } from './types';
import type { EncodedFilingRow, FilingCorpusFile } from './filing-corpus';

const METHODOLOGY =
  'Complete Senate LDA quarterly reports (LD-2) for the window, deduped so the latest ' +
  'amendment supersedes the original per registrant+client+period. Amounts gated for ' +
  'plausibility (income <= $5M, expenses <= $50M per filing). Committee attribution ' +
  'resolves each filing’s disclosed government entities and issue-code jurisdiction; a ' +
  'filing touching several committees is attributed to each.';

/** Interning dictionary builder: value → index, preserving insertion order. */
class Dictionary<T> {
  private readonly index = new Map<string, number>();
  readonly values: T[] = [];

  constructor(private readonly keyOf: (value: T) => string) {}

  add(value: T): number {
    const key = this.keyOf(value);
    const existing = this.index.get(key);
    if (existing !== undefined) return existing;
    const next = this.values.length;
    this.index.set(key, next);
    this.values.push(value);
    return next;
  }
}

/**
 * Build the dictionary-encoded filing-level corpus. Filings are deduped the same
 * way the aggregates are, so both artifacts describe the same set of reports.
 */
export function buildFilingCorpus(
  rawFilings: CompactFiling[],
  generatedAt: string
): FilingCorpusFile {
  const filings = dedupeAmendments(rawFilings);

  const clients = new Dictionary<string>(v => v);
  const registrants = new Dictionary<[string, string]>(v => v[0]);
  const issues = new Dictionary<string>(v => v);
  const entities = new Dictionary<string>(v => v);
  const committees = new Dictionary<[string, string]>(v => v[0]);
  const quarters = new Dictionary<string>(v => v);

  const rows: EncodedFilingRow[] = [];
  let gatedFilings = 0;
  let latestFilingPosted: string | null = null;

  for (const f of filings) {
    if (f.gated) gatedFilings += 1;
    if (!latestFilingPosted || Date.parse(f.dtPosted) > Date.parse(latestFilingPosted)) {
      latestFilingPosted = f.dtPosted;
    }
    rows.push([
      clients.add(f.clientName),
      registrants.add([f.registrantId, f.registrantName]),
      quarters.add(f.quarter),
      f.amount,
      f.issueCodes.map(c => issues.add(c)),
      f.governmentEntities.map(e => entities.add(e)),
      resolveFilingCommittees(f).map(c => committees.add([c.committeeCode, c.committeeName])),
    ]);
  }

  // Rows reference quarters by index, so the dictionary cannot be re-sorted
  // after the fact — remap instead of mutating the order in place.
  const sortedQuarters = [...quarters.values].sort((a, b) => a.localeCompare(b));
  const quarterRemap = new Map(quarters.values.map((q, i) => [i, sortedQuarters.indexOf(q)]));
  for (const row of rows) row[2] = quarterRemap.get(row[2])!;

  return {
    version: 1,
    generatedAt,
    latestFilingPosted,
    quarters: sortedQuarters,
    clients: clients.values,
    registrants: registrants.values,
    issues: issues.values,
    entities: entities.values,
    committees: committees.values,
    rows,
    meta: {
      reportFilings: rows.length,
      gatedFilings,
      committeeMatch: 'entity-resolution+issue-jurisdiction',
      methodology: METHODOLOGY,
    },
  };
}

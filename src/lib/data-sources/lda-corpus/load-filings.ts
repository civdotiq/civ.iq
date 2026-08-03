/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the filing-level LDA corpus (Phase 3 of
 * PLAN-lobbying-corpus-2026-07.md). Analyzers used to read lobbying filings
 * from `senateLobbyingAPI.fetchRecentFilings()`, which returns the API's first
 * page — 25 of ~28,000 filings per quarter, about 0.09%. At that coverage the
 * chance an arbitrary row touches a given member's committee AND matches a
 * contribution AND aligns with a vote is effectively zero, which is why the
 * profile influence section was empty for every member.
 *
 * Sources, in order:
 *
 *   1. `LDA_FILINGS_URL` — an external copy, if one is ever needed. The plan
 *      assumed this would be required: an array of filing objects measured
 *      3.8 MB compressed, over the repo's comfortable ceiling. Dictionary
 *      encoding brought the real artifact to roughly a megabyte a quarter, so
 *      it ships in the repo like the aggregates and this stays an escape hatch.
 *   2. `data/lda-filings.json.br` — the committed corpus (the normal path).
 *   3. null — every caller degrades to its existing behaviour rather than
 *      breaking, per the real-data-or-unavailable rule.
 *
 * Amounts: `CorpusFiling.amount` is already the gated figure. The build applies
 * `reportedFilingAmount` and the crank-filing plausibility caps in parse.ts, so
 * consumers read `amount` directly. Re-applying the `lda-filing-amounts.ts`
 * helpers to a corpus row double-gates it — those helpers are for the live-API
 * paths that remain (single-filing lookups, registrant detail).
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import { normalizeCompanyName } from '@civiq/entity-resolution';
import logger from '@/lib/logging/simple-logger';
import { decodeFilingRow } from './filing-corpus';
import type { CorpusFiling, FilingCorpusFile } from './filing-corpus';

const decompress = promisify(brotliDecompress);

const LOCAL_PATH = 'data/lda-filings.json.br';

/**
 * Row positions grouped by one access key, built on first use.
 *
 * Each index is a walk of all ~155k rows and holds a few hundred thousand
 * integers. A consumer that only searches organization names should not pay for
 * the committee walk, so nothing is built at load time — `indexBy` memoizes each
 * one the first time something asks for it.
 */
interface FilingIndex {
  file: FilingCorpusFile;
  /** committee code → row positions. */
  byCommittee?: Map<string, number[]>;
  /** normalized client OR registrant name → row positions. */
  byOrganization?: Map<string, number[]>;
  /** quarter key → row positions. */
  byQuarter?: Map<string, number[]>;
  /** LDA issue code → row positions. */
  byIssue?: Map<string, number[]>;
}

// undefined = not yet loaded; null = corpus unavailable.
let cache: FilingIndex | null | undefined;
let inFlight: Promise<FilingIndex | null> | null = null;

async function readCorpusBytes(): Promise<Buffer | null> {
  const url = process.env.LDA_FILINGS_URL;
  if (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`LDA filings corpus ${res.status} from ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(process.cwd(), LOCAL_PATH));
}

function push(map: Map<string, number[]>, key: string, position: number): void {
  const list = map.get(key);
  if (list) list.push(position);
  else map.set(key, [position]);
}

/** Build the committee index: one entry per committee a filing is attributed to. */
function indexByCommittee(file: FilingCorpusFile): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < file.rows.length; i++) {
    for (const c of file.rows[i]![6]) {
      const code = file.committees[c]?.[0];
      if (code) push(map, code, i);
    }
  }
  return map;
}

/**
 * Build the organization index. A filing is reachable under both its client and
 * its registrant, because callers ask "what did this organization lobby on"
 * without knowing whether it hired a firm or filed for itself. Names are keyed
 * through `normalizeCompanyName` — the same normalizer the influence-chain
 * analyzer keys organizations on, so a lookup there and here agree.
 *
 * The dictionaries are normalized once each (~22k clients, ~13k registrants)
 * rather than per row, so a self-filing organization's two names collapse to one
 * key without normalizing 155k strings twice.
 */
function indexByOrganization(file: FilingCorpusFile): Map<string, number[]> {
  const clientKeys = file.clients.map(orgKey);
  const registrantKeys = file.registrants.map(r => orgKey(r[1]));
  const map = new Map<string, number[]>();

  for (let i = 0; i < file.rows.length; i++) {
    const row = file.rows[i]!;
    const client = clientKeys[row[0]];
    const registrant = registrantKeys[row[1]];
    if (client) push(map, client, i);
    if (registrant && registrant !== client) push(map, registrant, i);
  }
  return map;
}

/** Build the quarter index. Rows are not assumed to be grouped by quarter. */
function indexByQuarter(file: FilingCorpusFile): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < file.rows.length; i++) {
    const quarter = file.quarters[file.rows[i]![2]];
    if (quarter) push(map, quarter, i);
  }
  return map;
}

/** Build the issue index: one entry per issue code a filing reports lobbying on. */
function indexByIssue(file: FilingCorpusFile): Map<string, number[]> {
  const map = new Map<string, number[]>();
  for (let i = 0; i < file.rows.length; i++) {
    for (const c of file.rows[i]![4]) {
      const code = file.issues[c];
      if (code) push(map, code, i);
    }
  }
  return map;
}

/** Normalize an organization name to its index key. Empty when unusable. */
function orgKey(name: string): string {
  return normalizeCompanyName(name) || name.trim().toUpperCase();
}

async function loadIndex(): Promise<FilingIndex | null> {
  if (cache !== undefined) return cache;
  // Concurrent requests on a cold instance must not each fetch and decompress
  // several megabytes — share the first load.
  inFlight ??= (async () => {
    try {
      const bytes = await readCorpusBytes();
      if (!bytes) return null;
      const json = await decompress(bytes);
      const file = JSON.parse(json.toString('utf8')) as FilingCorpusFile;
      logger.info('[LdaFilings] Corpus loaded', {
        rows: file.rows.length,
        quarters: file.quarters.length,
        source: process.env.LDA_FILINGS_URL ? 'url' : 'repo',
      });
      return { file };
    } catch (error) {
      logger.info('[LdaFilings] Corpus unavailable', { error: (error as Error).message });
      return null;
    }
  })().then(result => {
    cache = result;
    inFlight = null;
    return result;
  });
  return inFlight;
}

/** Memoized index accessor — builds the requested index on first use only. */
function indexBy(
  index: FilingIndex,
  key: 'byCommittee' | 'byOrganization' | 'byQuarter' | 'byIssue'
): Map<string, number[]> {
  const existing = index[key];
  if (existing) return existing;

  const started = Date.now();
  const built =
    key === 'byCommittee'
      ? indexByCommittee(index.file)
      : key === 'byOrganization'
        ? indexByOrganization(index.file)
        : key === 'byQuarter'
          ? indexByQuarter(index.file)
          : indexByIssue(index.file);
  index[key] = built;

  logger.info('[LdaFilings] Index built', {
    index: key,
    keys: built.size,
    ms: Date.now() - started,
  });
  return built;
}

/**
 * Visit the rows at these positions, decoded one at a time, skipping repeats.
 *
 * Callback rather than a returned array on purpose: a member on a busy committee
 * selects tens of thousands of rows, and materializing them all at once would
 * allocate far more than the caller needs to hold.
 */
function visitPositions(
  index: FilingIndex,
  positions: Iterable<number[] | undefined>,
  visit: (filing: CorpusFiling) => void
): void {
  const seen = new Set<number>();
  for (const list of positions) {
    if (!list) continue;
    for (const p of list) {
      if (seen.has(p)) continue;
      seen.add(p);
      const row = index.file.rows[p];
      if (row) visit(decodeFilingRow(index.file, row));
    }
  }
}

/**
 * Visit every filing whose disclosed government entities or issue-code
 * jurisdiction resolve to one of these committee codes. A filing touching
 * several of them is visited once.
 *
 * Returns false when the corpus is unavailable, which callers use to fall back —
 * distinct from true with no visits, which means the corpus genuinely has no
 * filings for those committees. Every reader below shares that contract.
 */
export async function forEachFilingForCommittees(
  committeeCodes: string[],
  visit: (filing: CorpusFiling) => void
): Promise<boolean> {
  const index = await loadIndex();
  if (!index) return false;

  const byCommittee = indexBy(index, 'byCommittee');
  visitPositions(
    index,
    committeeCodes.map(code => byCommittee.get(code)),
    visit
  );
  return true;
}

/**
 * Visit every filing this organization appears on, whether it filed for itself
 * or hired a registrant. Names match on `normalizeCompanyName`, so "Acme Corp."
 * and "ACME CORPORATION" reach the same rows.
 */
export async function forEachFilingForOrganization(
  organizationName: string,
  visit: (filing: CorpusFiling) => void
): Promise<boolean> {
  const index = await loadIndex();
  if (!index) return false;

  const key = orgKey(organizationName);
  if (!key) return true;
  visitPositions(index, [indexBy(index, 'byOrganization').get(key)], visit);
  return true;
}

/**
 * Visit every filing in these quarters, oldest quarter first. Quarter keys look
 * like "2026-Q1"; `getFilingCorpusMeta().quarters` lists the ones covered.
 */
export async function forEachFilingForQuarters(
  quarters: string[],
  visit: (filing: CorpusFiling) => void
): Promise<boolean> {
  const index = await loadIndex();
  if (!index) return false;

  const byQuarter = indexBy(index, 'byQuarter');
  visitPositions(
    index,
    quarters.map(q => byQuarter.get(q)),
    visit
  );
  return true;
}

/**
 * Visit every filing reporting lobbying on one of these LDA issue codes. A
 * filing citing several of them is visited once, so counting inside the callback
 * gives a deduped figure rather than the per-issue sum the aggregates carry.
 */
export async function forEachFilingForIssues(
  issueCodes: string[],
  visit: (filing: CorpusFiling) => void
): Promise<boolean> {
  const index = await loadIndex();
  if (!index) return false;

  const byIssue = indexBy(index, 'byIssue');
  visitPositions(
    index,
    issueCodes.map(code => byIssue.get(code)),
    visit
  );
  return true;
}

/**
 * Visit every filing in the corpus. Builds no index — the bulk-export path, for
 * callers that genuinely need the whole table. Anything narrower should use one
 * of the scoped readers above.
 */
export async function forEachFiling(visit: (filing: CorpusFiling) => void): Promise<boolean> {
  const index = await loadIndex();
  if (!index) return false;

  for (const row of index.file.rows) visit(decodeFilingRow(index.file, row));
  return true;
}

/** An organization name as the corpus records it, and how it appears on filings. */
export interface CorpusOrganizationMatch {
  name: string;
  role: 'registrant' | 'client';
}

/**
 * Search organization names without touching a single row. Client and registrant
 * names are dictionary-encoded, so a name search is a scan of ~22k clients and
 * ~13k registrants rather than 155k filings — cheap enough to run per request
 * with no index built at all.
 *
 * A name recorded as both client and registrant is returned once, as a
 * registrant, matching how the LDA presents self-filing organizations.
 */
export async function searchOrganizationNames(
  term: string,
  options: { op?: 'contains' | 'eq'; limit?: number } = {}
): Promise<{ matches: CorpusOrganizationMatch[]; total: number } | null> {
  const index = await loadIndex();
  if (!index) return null;

  const { op = 'contains', limit = 20 } = options;
  const needle = term.trim().toLowerCase();
  if (!needle) return { matches: [], total: 0 };

  const hit = (name: string): boolean => {
    const lower = name.toLowerCase();
    return op === 'eq' ? lower === needle : lower.includes(needle);
  };

  const seen = new Set<string>();
  const matches: CorpusOrganizationMatch[] = [];

  for (const [, name] of index.file.registrants) {
    if (!hit(name) || seen.has(name)) continue;
    seen.add(name);
    matches.push({ name, role: 'registrant' });
  }
  for (const name of index.file.clients) {
    if (!hit(name) || seen.has(name)) continue;
    seen.add(name);
    matches.push({ name, role: 'client' });
  }

  return { matches: matches.slice(0, limit), total: matches.length };
}

/**
 * The committees the corpus attributes filings to, as code → name. Callers
 * resolving a committee name or topic to a corpus code need to know which codes
 * exist; a code the corpus has never seen means no data, not zero spending.
 */
export async function getFilingCorpusCommittees(): Promise<Map<string, string> | null> {
  const index = await loadIndex();
  if (!index) return null;
  return new Map(index.file.committees);
}

export interface FilingCorpusMeta {
  generatedAt: string;
  latestFilingPosted: string | null;
  quarters: string[];
  rows: number;
  methodology: string;
}

/** Corpus provenance for methodology strings and the freshness canary. */
export async function getFilingCorpusMeta(): Promise<FilingCorpusMeta | null> {
  const index = await loadIndex();
  if (!index) return null;
  const { generatedAt, latestFilingPosted, quarters, rows, meta } = index.file;
  return {
    generatedAt,
    latestFilingPosted,
    quarters,
    rows: rows.length,
    methodology: meta.methodology,
  };
}

/** Test-only: reset the module cache between cases. */
export function __resetFilingCorpusCache(): void {
  cache = undefined;
  inFlight = null;
}

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
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { decodeFilingRow } from './filing-corpus';
import type { CorpusFiling, FilingCorpusFile } from './filing-corpus';

const decompress = promisify(brotliDecompress);

const LOCAL_PATH = 'data/lda-filings.json.br';

interface FilingIndex {
  file: FilingCorpusFile;
  /** committee code → row positions. */
  byCommittee: Map<string, number[]>;
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

function buildIndex(file: FilingCorpusFile): FilingIndex {
  const byCommittee = new Map<string, number[]>();

  for (let i = 0; i < file.rows.length; i++) {
    for (const c of file.rows[i]![6]) {
      const code = file.committees[c]?.[0];
      if (!code) continue;
      const list = byCommittee.get(code);
      if (list) list.push(i);
      else byCommittee.set(code, [i]);
    }
  }

  return { file, byCommittee };
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
      const index = buildIndex(file);
      logger.info('[LdaFilings] Corpus loaded', {
        rows: file.rows.length,
        committees: index.byCommittee.size,
        source: process.env.LDA_FILINGS_URL ? 'url' : 'repo',
      });
      return index;
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

/**
 * Visit every filing whose disclosed government entities or issue-code
 * jurisdiction resolve to one of these committee codes. A filing touching
 * several of them is visited once.
 *
 * Callback rather than a returned array on purpose: a member on a busy
 * committee selects tens of thousands of rows, and materializing them all at
 * once would allocate far more than the caller needs to hold. Rows are decoded
 * one at a time and collected by the caller.
 *
 * Returns false when the corpus is unavailable, which callers use to fall back —
 * distinct from true with no visits, which means the corpus genuinely has no
 * filings for those committees.
 */
export async function forEachFilingForCommittees(
  committeeCodes: string[],
  visit: (filing: CorpusFiling) => void
): Promise<boolean> {
  const index = await loadIndex();
  if (!index) return false;

  const seen = new Set<number>();
  for (const code of committeeCodes) {
    const positions = index.byCommittee.get(code);
    if (!positions) continue;
    for (const p of positions) {
      if (seen.has(p)) continue;
      seen.add(p);
      const row = index.file.rows[p];
      if (row) visit(decodeFilingRow(index.file, row));
    }
  }
  return true;
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

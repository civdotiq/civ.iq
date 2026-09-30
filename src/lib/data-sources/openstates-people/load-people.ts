/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the state legislator roster corpus
 * (PLAN-openstates-corpus-2026-08.md).
 *
 * Sources, in order:
 *
 *   1. `OPENSTATES_PEOPLE_URL` — an external copy, if one is ever needed.
 *      The artifact is small enough to ship in the repo, so this is an escape
 *      hatch rather than the normal path.
 *   2. `data/openstates-people.json.br` — the committed corpus (the normal path).
 *   3. null — callers fall back to the live API rather than breaking, per the
 *      real-data-or-unavailable rule.
 *
 * Why this exists rather than a rate limiter: see people-corpus.ts. The short
 * version is that one roster costs 3-9 API requests against a 1,000/day cap,
 * and the state surface structurally exceeds it.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { decodePersonRow, personIdSuffix } from './people-corpus';
import type { CorpusPerson, PeopleCorpusFile } from './people-corpus';

const decompress = promisify(brotliDecompress);

const LOCAL_PATH = 'data/openstates-people.json.br';

interface PeopleIndex {
  file: PeopleCorpusFile;
  /** USPS code → the jurisdiction's contiguous row slice. */
  slices: Map<string, { offset: number; count: number }>;
  /**
   * uuid → row position, and the jurisdiction it belongs to. Built on first
   * use: a caller asking for one state's roster should not pay to walk all
   * 7,000-odd rows, which is the whole point of storing them grouped.
   */
  byId?: Map<string, { position: number; jurisdiction: string }>;
  /** id suffix (first 8 hex digits) → uuid. Built on first use. */
  bySuffix?: Map<string, string>;
}

// undefined = not yet loaded; null = corpus unavailable.
let cache: PeopleIndex | null | undefined;
let inFlight: Promise<PeopleIndex | null> | null = null;

async function readCorpusBytes(): Promise<Buffer | null> {
  const url = process.env.OPENSTATES_PEOPLE_URL;
  if (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!res.ok) throw new Error(`OpenStates people corpus ${res.status} from ${url}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return readFile(join(process.cwd(), LOCAL_PATH));
}

async function loadIndex(): Promise<PeopleIndex | null> {
  if (cache !== undefined) return cache;
  // Concurrent requests on a cold instance must not each fetch and decompress
  // the corpus — share the first load.
  inFlight ??= (async () => {
    try {
      const bytes = await readCorpusBytes();
      if (!bytes) return null;
      const json = await decompress(bytes);
      const file = JSON.parse(json.toString('utf8')) as PeopleCorpusFile;
      const slices = new Map(
        file.jurisdictions.map(([code, offset, count]) => [code, { offset, count }])
      );
      logger.info('[OpenStatesPeople] Corpus loaded', {
        people: file.rows.length,
        jurisdictions: slices.size,
        upstreamCommit: file.upstreamCommit.slice(0, 8),
        source: process.env.OPENSTATES_PEOPLE_URL ? 'url' : 'repo',
      });
      return { file, slices };
    } catch (error) {
      logger.info('[OpenStatesPeople] Corpus unavailable', {
        error: (error as Error).message,
      });
      return null;
    }
  })().then(result => {
    cache = result;
    inFlight = null;
    return result;
  });
  return inFlight;
}

/** Memoized id index — one walk of every row, built only if something asks. */
function indexById(index: PeopleIndex): NonNullable<PeopleIndex['byId']> {
  if (index.byId) return index.byId;

  const started = Date.now();
  const map = new Map<string, { position: number; jurisdiction: string }>();
  for (const [jurisdiction, offset, count] of index.file.jurisdictions) {
    for (let p = offset; p < offset + count; p++) {
      const row = index.file.rows[p];
      if (row) map.set(row[0], { position: p, jurisdiction });
    }
  }
  index.byId = map;

  logger.info('[OpenStatesPeople] Id index built', { keys: map.size, ms: Date.now() - started });
  return map;
}

/**
 * Every sitting member of a jurisdiction's legislature, or null when the corpus
 * is unavailable. Null and empty are deliberately different: null means "ask the
 * API", an empty array would mean "this jurisdiction has no legislators", and
 * only the first is ever true.
 */
export async function getJurisdictionRoster(state: string): Promise<CorpusPerson[] | null> {
  const index = await loadIndex();
  if (!index) return null;

  const code = state.toUpperCase();
  const slice = index.slices.get(code);
  if (!slice) return null;

  const people: CorpusPerson[] = [];
  for (let p = slice.offset; p < slice.offset + slice.count; p++) {
    const row = index.file.rows[p];
    if (row) people.push(decodePersonRow(index.file, row, code));
  }
  return people;
}

/**
 * Every sitting member in every jurisdiction, with the corpus's upstream commit
 * date for sitemap lastmod. Null when the corpus is unavailable.
 */
export async function getAllPeople(): Promise<{
  people: CorpusPerson[];
  upstreamCommittedAt: string;
} | null> {
  const index = await loadIndex();
  if (!index) return null;

  const people: CorpusPerson[] = [];
  for (const [jurisdiction, offset, count] of index.file.jurisdictions) {
    for (let p = offset; p < offset + count; p++) {
      const row = index.file.rows[p];
      if (row) people.push(decodePersonRow(index.file, row, jurisdiction));
    }
  }
  return { people, upstreamCommittedAt: index.file.upstreamCommittedAt };
}

/**
 * One member by `ocd-person/<uuid>` id — the same identifier the v3 API returns,
 * so a caller holding an id from either source can look it up here.
 */
export async function getPersonById(personId: string): Promise<CorpusPerson | null> {
  const index = await loadIndex();
  if (!index) return null;

  const uuid = personId.replace(/^ocd-person\//, '');
  const hit = indexById(index).get(uuid);
  if (!hit) return null;

  const row = index.file.rows[hit.position];
  return row ? decodePersonRow(index.file, row, hit.jurisdiction) : null;
}

/** Memoized suffix index, the lookup behind readable legislator URLs. */
function indexBySuffix(index: PeopleIndex): NonNullable<PeopleIndex['bySuffix']> {
  if (index.bySuffix) return index.bySuffix;
  const map = new Map<string, string>();
  for (const uuid of indexById(index).keys()) map.set(personIdSuffix(uuid), uuid);
  index.bySuffix = map;
  return map;
}

/**
 * One member by the id suffix at the end of a readable URL
 * (`angela-rigas-2a1a6b8f` → `2a1a6b8f`). The build guarantees suffixes are
 * unique; null means no sitting member has it, not that the corpus is missing.
 */
export async function getPersonByIdSuffix(suffix: string): Promise<CorpusPerson | null> {
  const index = await loadIndex();
  if (!index) return null;
  const uuid = indexBySuffix(index).get(suffix.toLowerCase());
  return uuid ? getPersonById(uuid) : null;
}

export interface PeopleCorpusStatus {
  generatedAt: string;
  upstreamCommit: string;
  upstreamCommittedAt: string;
  people: number;
  jurisdictions: number;
}

/** Provenance for status routes and health canaries. Null when unavailable. */
export async function getPeopleCorpusStatus(): Promise<PeopleCorpusStatus | null> {
  const index = await loadIndex();
  if (!index) return null;
  const { generatedAt, upstreamCommit, upstreamCommittedAt, rows, jurisdictions } = index.file;
  return {
    generatedAt,
    upstreamCommit,
    upstreamCommittedAt,
    people: rows.length,
    jurisdictions: jurisdictions.length,
  };
}

/** Test seam: drop the memoized corpus so the next call re-reads it. */
export function __resetPeopleCorpusCache(): void {
  cache = undefined;
  inFlight = null;
}

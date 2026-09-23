/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the state committee corpus
 * (data/openstates-committees.json.br). Returns null when the corpus is
 * unavailable or does not cover a jurisdiction, so callers fall back to the
 * live API — null means "ask the API", never "this state has no committees".
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { decodeCommitteeRow } from './committees-corpus';
import type { CommitteesCorpusFile, CorpusCommittee } from './committees-corpus';

const decompress = promisify(brotliDecompress);

const LOCAL_PATH = 'data/openstates-committees.json.br';

interface CommitteesIndex {
  file: CommitteesCorpusFile;
  slices: Map<string, { offset: number; count: number }>;
}

// undefined = not yet loaded; null = corpus unavailable.
let cache: CommitteesIndex | null | undefined;
let inFlight: Promise<CommitteesIndex | null> | null = null;

async function loadIndex(): Promise<CommitteesIndex | null> {
  if (cache !== undefined) return cache;
  inFlight ??= (async () => {
    try {
      const json = await decompress(await readFile(join(process.cwd(), LOCAL_PATH)));
      const file = JSON.parse(json.toString('utf8')) as CommitteesCorpusFile;
      const slices = new Map(
        file.jurisdictions.map(([code, offset, count]) => [code, { offset, count }])
      );
      logger.info('[OpenStatesCommittees] Corpus loaded', {
        committees: file.rows.length,
        jurisdictions: slices.size,
        upstreamCommit: file.upstreamCommit.slice(0, 8),
      });
      return { file, slices };
    } catch (error) {
      logger.info('[OpenStatesCommittees] Corpus unavailable', {
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

/** Every committee in a jurisdiction, or null when the corpus cannot answer. */
export async function getJurisdictionCommittees(state: string): Promise<CorpusCommittee[] | null> {
  const index = await loadIndex();
  if (!index) return null;

  const code = state.toUpperCase();
  const slice = index.slices.get(code);
  if (!slice) return null;

  const committees: CorpusCommittee[] = [];
  for (let p = slice.offset; p < slice.offset + slice.count; p++) {
    const row = index.file.rows[p];
    if (row) committees.push(decodeCommitteeRow(index.file, row, code));
  }
  return committees;
}

export interface CommitteesCorpusStatus {
  generatedAt: string;
  upstreamCommit: string;
  upstreamCommittedAt: string;
  committees: number;
  jurisdictions: number;
}

/** Provenance for status routes and health canaries. Null when unavailable. */
export async function getCommitteesCorpusStatus(): Promise<CommitteesCorpusStatus | null> {
  const index = await loadIndex();
  if (!index) return null;
  const { generatedAt, upstreamCommit, upstreamCommittedAt, rows, jurisdictions } = index.file;
  return {
    generatedAt,
    upstreamCommit,
    upstreamCommittedAt,
    committees: rows.length,
    jurisdictions: jurisdictions.length,
  };
}

/** Test seam: drop the memoized corpus so the next call re-reads it. */
export function __resetCommitteesCorpusCache(): void {
  cache = undefined;
  inFlight = null;
}

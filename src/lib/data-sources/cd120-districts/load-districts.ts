/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the CD120 district-boundary corpus
 * (data/cd120-districts.json.br, built by scripts/sync-cd120-districts.ts).
 *
 * Callers hand it a coordinate (from the Census Geocoder, which stays the
 * address→lat/lon authority) and get back the 120th-Congress district — the
 * one 2026 ballots use. Null means "corpus unavailable or point outside every
 * district polygon"; callers fall back to showing only the geocoder's
 * 119th-Congress answer rather than guessing, per the real-data-or-unavailable
 * rule.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { bboxContains, multiPolygonContains } from './point-in-multipolygon';
import type { Cd120CorpusFile, Cd120District } from './cd120-corpus';

const decompress = promisify(brotliDecompress);

const LOCAL_PATH = 'data/cd120-districts.json.br';

// undefined = not yet loaded; null = corpus unavailable.
let cache: Cd120CorpusFile | null | undefined;
let inFlight: Promise<Cd120CorpusFile | null> | null = null;

async function loadCorpus(): Promise<Cd120CorpusFile | null> {
  if (cache !== undefined) return cache;
  // Concurrent requests on a cold instance share the first decompress.
  inFlight ??= (async () => {
    try {
      const bytes = await readFile(join(process.cwd(), LOCAL_PATH));
      const json = await decompress(bytes);
      const file = JSON.parse(json.toString('utf8')) as Cd120CorpusFile;
      logger.info('[Cd120Districts] Corpus loaded', {
        districts: file.districts.length,
        generatedAt: file.generatedAt,
      });
      return file;
    } catch (error) {
      logger.info('[Cd120Districts] Corpus unavailable', {
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

/**
 * The 120th-Congress (2026 ballot) district containing a point, or null when
 * the corpus is missing or the point is outside every district polygon
 * (offshore, or a foreign coordinate). Bbox prefilter keeps the ray cast to a
 * handful of candidates.
 */
export async function lookupDistrict120(lon: number, lat: number): Promise<Cd120District | null> {
  const corpus = await loadCorpus();
  if (!corpus) return null;

  for (const row of corpus.districts) {
    if (!bboxContains(row.bbox, lon, lat)) continue;
    if (multiPolygonContains(row.geometry, lon, lat)) {
      const { state, stateFips, code, district, geoid, name } = row;
      return { state, stateFips, code, district, geoid, name };
    }
  }
  return null;
}

export interface Cd120CorpusStatus {
  cdSession: '120';
  generatedAt: string;
  source: string;
  districts: number;
}

/** Provenance for status routes and health canaries. Null when unavailable. */
export async function getCd120CorpusStatus(): Promise<Cd120CorpusStatus | null> {
  const corpus = await loadCorpus();
  if (!corpus) return null;
  return {
    cdSession: corpus.cdSession,
    generatedAt: corpus.generatedAt,
    source: corpus.source,
    districts: corpus.districts.length,
  };
}

/** Test seam: drop the memoized corpus so the next call re-reads it. */
export function __resetCd120Cache(): void {
  cache = undefined;
  inFlight = null;
}

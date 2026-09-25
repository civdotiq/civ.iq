/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the committed member sponsored-counts corpus
 * (data/member-sponsored-counts.json, built by scripts/sync-bill-policy-areas.ts).
 * Loads once per process. Returns null when the corpus is unavailable, per the
 * real-data-or-unavailable rule.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import logger from '@/lib/logging/simple-logger';
import type { MemberSponsoredCountsFile } from './corpus';

const LOCAL_PATH = 'data/member-sponsored-counts.json';

// undefined = not yet loaded; null = corpus unavailable.
let cache: MemberSponsoredCountsFile | null | undefined;
let inFlight: Promise<MemberSponsoredCountsFile | null> | null = null;

export async function getMemberSponsoredCounts(): Promise<MemberSponsoredCountsFile | null> {
  if (cache !== undefined) return cache;
  // Concurrent cold requests share one read.
  inFlight ??= (async () => {
    try {
      const raw = await readFile(join(process.cwd(), LOCAL_PATH), 'utf8');
      return JSON.parse(raw) as MemberSponsoredCountsFile;
    } catch (error) {
      logger.info('[MemberSponsoredCounts] Corpus unavailable', {
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

/** Test seam: drop the memoized corpus so the next call re-reads it. */
export function __resetMemberSponsoredCountsCache(): void {
  cache = undefined;
  inFlight = null;
}

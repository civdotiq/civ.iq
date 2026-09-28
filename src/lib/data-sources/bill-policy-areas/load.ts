/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Request-time reader for the committed bill → policy-area corpus
 * (data/bill-policy-areas.json.br, built by scripts/sync-bill-policy-areas.ts).
 * Loads once per process and indexes rows by policy area, most recent latest
 * action first. Returns null when the corpus is unavailable, per the
 * real-data-or-unavailable rule.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { decodeBillRow } from './corpus';
import type { BillPolicyAreaCorpusFile, CorpusBill } from './corpus';

const decompress = promisify(brotliDecompress);

const LOCAL_PATH = 'data/bill-policy-areas.json.br';

interface CorpusIndex {
  file: BillPolicyAreaCorpusFile;
  /** Lowercased policy area → bills, latest action first. */
  byArea: Map<string, CorpusBill[]>;
}

// undefined = not yet loaded; null = corpus unavailable.
let cache: CorpusIndex | null | undefined;
let inFlight: Promise<CorpusIndex | null> | null = null;

function sortKey(b: CorpusBill): string {
  return b.latestActionDate ?? b.introducedDate;
}

async function loadIndex(): Promise<CorpusIndex | null> {
  if (cache !== undefined) return cache;
  // Concurrent cold requests share one read + decompress.
  inFlight ??= (async () => {
    try {
      const bytes = await readFile(join(process.cwd(), LOCAL_PATH));
      const file = JSON.parse(
        (await decompress(bytes)).toString('utf8')
      ) as BillPolicyAreaCorpusFile;
      const byArea = new Map<string, CorpusBill[]>();
      for (const row of file.rows) {
        const bill = decodeBillRow(file, row);
        const key = bill.policyArea.toLowerCase();
        const list = byArea.get(key) ?? [];
        list.push(bill);
        byArea.set(key, list);
      }
      for (const list of byArea.values()) {
        list.sort((a, b) => sortKey(b).localeCompare(sortKey(a)) || b.number - a.number);
      }
      return { file, byArea };
    } catch (error) {
      logger.info('[BillPolicyAreas] Corpus unavailable', { error: (error as Error).message });
      return null;
    }
  })().then(result => {
    cache = result;
    inFlight = null;
    return result;
  });
  return inFlight;
}

export interface PolicyAreaBills {
  /** Every bill in the area this Congress — the population, not the page. */
  total: number;
  bills: CorpusBill[];
  congress: number;
  generatedAt: string;
}

/**
 * Bills CRS has filed under a policy area, most recent action first, capped at
 * `limit`. Null when the corpus is unavailable; an empty list means the area
 * genuinely has no bills this Congress.
 */
export async function getBillsByPolicyArea(
  policyArea: string,
  limit: number
): Promise<PolicyAreaBills | null> {
  const index = await loadIndex();
  if (!index) return null;
  const all = index.byArea.get(policyArea.toLowerCase()) ?? [];
  return {
    total: all.length,
    bills: all.slice(0, Math.max(0, limit)),
    congress: index.file.congress,
    generatedAt: index.file.generatedAt,
  };
}

/** Test seam: drop the memoized corpus so the next call re-reads it. */
export function __resetBillPolicyAreaCache(): void {
  cache = undefined;
  inFlight = null;
}

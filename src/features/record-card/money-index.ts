/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Fundraising index: one Redis hash row per member holding the Record Card's
 * "Total raised this cycle", so search can filter all 535 members with a
 * single HGETALL instead of 535 reads. The warm-record-money cron writes a row
 * each time it visits a member (~every 14h); it never writes when the FEC is
 * unreachable, so a row is always the member's last good answer.
 *
 * Every chamber reads the same FEC 2-year cycle (`/candidate/{id}/totals/
 * ?cycle=N` returns the 2-year row for senators too, verified 2026-09-25), so
 * House and Senate totals cover the same window. Their latest report dates
 * differ: senators not on the ballot file semiannually. `coverageEnd` carries
 * that per member.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { getCurrentElectionCycle } from '@/lib/fec/election-cycle';
import logger from '@/lib/logging/simple-logger';

const INDEX_KEY = 'record-card:money-index:v1';
const READ_TTL_MS = 5 * 60 * 1000;

export interface MoneyIndexEntry {
  /** FEC total receipts this cycle; null when the FEC reports none. */
  raised: number | null;
  /** 'none' = no FEC receipts or no FEC id; the card shows no money section. */
  status: 'ok' | 'none';
  cycle: number;
  /** End of the latest FEC report period (YYYY-MM-DD), when known. */
  coverageEnd: string | null;
  /** When the cron wrote this row. */
  asOf: string;
}

export interface FundraisingIndex {
  cycle: number;
  /** Current-cycle rows only; rows from a past cycle are dropped. */
  entries: Map<string, MoneyIndexEntry>;
}

export async function writeMoneyIndexEntry(
  bioguideId: string,
  entry: MoneyIndexEntry
): Promise<void> {
  await getRedisCache().hashSet(INDEX_KEY, bioguideId, JSON.stringify(entry));
}

function parseEntry(raw: string): MoneyIndexEntry | null {
  try {
    const e = JSON.parse(raw) as Partial<MoneyIndexEntry>;
    if (typeof e.cycle !== 'number' || typeof e.asOf !== 'string') return null;
    if (e.status === 'ok' && typeof e.raised === 'number' && e.raised > 0) {
      return {
        raised: e.raised,
        status: 'ok',
        cycle: e.cycle,
        coverageEnd: e.coverageEnd ?? null,
        asOf: e.asOf,
      };
    }
    if (e.status === 'none') {
      return { raised: null, status: 'none', cycle: e.cycle, coverageEnd: null, asOf: e.asOf };
    }
    return null;
  } catch {
    return null;
  }
}

let memo: { at: number; index: FundraisingIndex } | null = null;

/**
 * The current-cycle index, cached per instance for 5 minutes so a burst of
 * searches costs one Redis command. Null when Redis could not be read —
 * callers must show "unavailable", never treat members as $0.
 */
export async function getFundraisingIndex(): Promise<FundraisingIndex | null> {
  const cycle = getCurrentElectionCycle();
  if (memo && memo.index.cycle === cycle && Date.now() - memo.at < READ_TTL_MS) {
    return memo.index;
  }

  let raw: Record<string, string> | null = null;
  try {
    raw = await getRedisCache().hashGetAll(INDEX_KEY);
  } catch (error) {
    logger.warn('Fundraising index read failed', { error });
  }
  if (!raw) {
    logger.warn('Fundraising index unavailable');
    return null;
  }

  const entries = new Map<string, MoneyIndexEntry>();
  for (const [bioguideId, value] of Object.entries(raw)) {
    const entry = parseEntry(value);
    if (entry && entry.cycle === cycle) entries.set(bioguideId, entry);
  }
  const index = { cycle, entries };
  memo = { at: Date.now(), index };
  return index;
}

/** Test hook: forget the per-instance copy. */
export function resetFundraisingIndexMemo(): void {
  memo = null;
}

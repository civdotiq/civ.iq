/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Committed copy of the Senate roll-call corpus (data/senate-votes-{congress}.json.br,
 * written by scripts/snapshot-senate-votes.ts).
 *
 * Why: the corpus lives in Redis with a 90-day TTL, and only the senate.gov
 * mirror rewrites it. senate.gov has blocked the mirror since 2026-10-23
 * (issue #300), so without this copy every stored Senate vote would expire.
 * Those votes can't be downloaded again from senate.gov, and data that can't
 * be downloaded again must never live only in something that expires.
 *
 * Readers keep reading Redis. The daily chamber-baselines cron calls
 * restoreSenateCorpusFromSnapshot, which puts back any roll call missing from
 * Redis and rewrites any whose TTL is running low. Rolls are immutable, so
 * rewriting one from the snapshot never changes what it says.
 */

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { brotliDecompress } from 'node:zlib';
import { promisify } from 'node:util';
import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import {
  READ_BATCH,
  ROLL_TTL_SECONDS,
  rollKey,
  senateMenuKey,
  type CompactRollCall,
  type SenateMenuEntry,
  type SenateVoteMenu,
} from './roll-call-corpus';

const decompress = promisify(brotliDecompress);

/** Rewrite a key once fewer than this many seconds of its TTL remain. */
export const RESTORE_BELOW_TTL_SECONDS = 30 * 24 * 60 * 60;

export interface SenateVotesSnapshotFile {
  congress: number;
  /** When the snapshot was read out of Redis. */
  generatedAt: string;
  /** Where the votes came from, in words. */
  source: string;
  /** The mirrored vote menu, verbatim (measure tags kept). */
  menu: SenateVoteMenu;
  /** Every roll call the menu lists, in the stored compact form. */
  rolls: CompactRollCall[];
}

export function snapshotPath(congress: number): string {
  return `data/senate-votes-${congress}.json.br`;
}

export async function loadSenateVotesSnapshot(
  congress: number
): Promise<SenateVotesSnapshotFile | null> {
  try {
    const bytes = await readFile(join(process.cwd(), snapshotPath(congress)));
    const file = JSON.parse((await decompress(bytes)).toString('utf8')) as SenateVotesSnapshotFile;
    return file.congress === congress ? file : null;
  } catch (error) {
    logger.info('[SenateSnapshot] Snapshot unavailable', {
      congress,
      error: (error as Error).message,
    });
    return null;
  }
}

/** Snapshot entries plus any newer entries already in Redis, by roll number;
 *  Redis wins where both have a roll (it may carry later corrections). */
export function mergeMenus(
  snapshot: SenateVoteMenu,
  current: SenateVoteMenu | null
): SenateVoteMenu {
  if (!current) return snapshot;
  const sessions: SenateVoteMenu['sessions'] = {};
  const sessionIds = new Set([
    ...Object.keys(snapshot.sessions ?? {}),
    ...Object.keys(current.sessions ?? {}),
  ]);
  for (const session of sessionIds) {
    const byRoll = new Map<number, SenateMenuEntry>();
    for (const e of snapshot.sessions?.[session] ?? []) byRoll.set(e.n, e);
    for (const e of current.sessions?.[session] ?? []) byRoll.set(e.n, e);
    sessions[session] = [...byRoll.values()].sort((a, b) => b.n - a.n);
  }
  const updatedAt =
    (current.updatedAt ?? '') > (snapshot.updatedAt ?? '') ? current.updatedAt : snapshot.updatedAt;
  return { congress: snapshot.congress, sessions, updatedAt };
}

export interface SnapshotRestoreResult {
  congress: number;
  rollsInSnapshot: number;
  rollsRestored: number;
  menuRestored: boolean;
}

/**
 * Put back missing roll calls and renew low-TTL ones from the committed
 * snapshot. Null when there is no snapshot for this Congress. ttl() returns
 * null both for a missing key and for a read failure; either way the write
 * is safe, because the snapshot holds the same immutable roll.
 */
export async function restoreSenateCorpusFromSnapshot(
  congress: number
): Promise<SnapshotRestoreResult | null> {
  const snapshot = await loadSenateVotesSnapshot(congress);
  if (!snapshot) return null;
  const redis = getRedisCache();

  let rollsRestored = 0;
  for (let i = 0; i < snapshot.rolls.length; i += READ_BATCH) {
    const batch = snapshot.rolls.slice(i, i + READ_BATCH);
    const keys = batch.map(r => rollKey('senate', congress, r.session, r.rollCallNumber));
    const ttls = await Promise.all(keys.map(k => redis.ttl(k)));
    const writes = batch.flatMap((roll, j) => {
      const ttl = ttls[j];
      const key = keys[j];
      if (!key || (ttl !== null && ttl !== undefined && ttl >= RESTORE_BELOW_TTL_SECONDS)) {
        return [];
      }
      return [redis.set(key, roll, ROLL_TTL_SECONDS)];
    });
    rollsRestored += (await Promise.all(writes)).filter(Boolean).length;
  }

  // The menu can be newer in Redis than in the snapshot, so it is merged,
  // never replaced.
  let menuRestored = false;
  const menuKey = senateMenuKey(congress);
  const menuTtl = await redis.ttl(menuKey);
  if (menuTtl === null || menuTtl < RESTORE_BELOW_TTL_SECONDS) {
    const current = await redis.get<SenateVoteMenu>(menuKey);
    menuRestored = await redis.set(menuKey, mergeMenus(snapshot.menu, current), ROLL_TTL_SECONDS);
  }

  const result = {
    congress,
    rollsInSnapshot: snapshot.rolls.length,
    rollsRestored,
    menuRestored,
  };
  if (rollsRestored > 0 || menuRestored) {
    logger.info('[SenateSnapshot] Restored Senate corpus from snapshot', result);
  }
  return result;
}

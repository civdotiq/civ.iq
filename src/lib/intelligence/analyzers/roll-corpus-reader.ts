/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Read-only access to the roll-call corpus for request-time analyzers.
 *
 * The corpus (see roll-call-corpus.ts) holds every roll call of the current
 * Congress with full per-member positions and parties. House rolls are filled
 * by the chamber-baselines cron; Senate rolls arrive through the MR10 mirror.
 * This reader NEVER fills gaps — request paths must not fetch roll calls
 * upstream. Callers check `coverage` and decline to analyze a partial corpus.
 */

import logger from '@/lib/logging/simple-logger';
import { getRedisCache } from '@/lib/cache/redis-client';
import { batchVotingService } from '@/features/representatives/services/batch-voting-service';
import type { StandardizedVote } from '@/features/representatives/services/batch-voting-service';
import {
  expandRoll,
  getSenateCorpusRollCalls,
  getSenateVoteMenu,
  rollKey,
  type CompactRollCall,
} from '@/features/representatives/services/roll-call-corpus';

/** Same floor the chamber-baselines builder uses before trusting a corpus. */
export const MIN_CORPUS_COVERAGE = 0.9;

/** Matches the chamber-baselines House sweep limit. */
const HOUSE_LIST_LIMIT = 1500;

/** Keys per MGET; Upstash REST puts them in the URL path. */
const MGET_CHUNK_SIZE = 100;

export interface ChamberCorpus {
  rolls: StandardizedVote[];
  /** Roll calls the chamber has held this Congress (from the vote list / menu). */
  expected: number;
  /** rolls.length / expected, 0 when nothing is expected. */
  coverage: number;
}

function sessionForDate(date: string): number {
  const year = new Date(date).getFullYear();
  return Number.isFinite(year) && year % 2 === 1 ? 1 : 2;
}

async function readHouseCorpus(congress: number): Promise<ChamberCorpus> {
  // One vote-list call covers both sessions (Congress.gov /house-vote/{congress}).
  const list = await batchVotingService.getHouseVoteListItems(
    congress,
    undefined,
    HOUSE_LIST_LIMIT
  );
  if (list.length === 0) return { rolls: [], expected: 0, coverage: 0 };

  const keys = list.map(item =>
    rollKey('house', congress, sessionForDate(item.date), item.rollCallNumber)
  );
  const rolls: StandardizedVote[] = [];
  for (let i = 0; i < keys.length; i += MGET_CHUNK_SIZE) {
    const values = await getRedisCache().mget<CompactRollCall>(keys.slice(i, i + MGET_CHUNK_SIZE));
    for (const value of values) {
      if (value) rolls.push(expandRoll(value, congress, 'House'));
    }
  }

  return { rolls, expected: list.length, coverage: rolls.length / list.length };
}

async function readSenateCorpus(congress: number): Promise<ChamberCorpus> {
  const menu = await getSenateVoteMenu(congress);
  if (!menu) return { rolls: [], expected: 0, coverage: 0 };

  const expected = Object.values(menu.sessions).reduce((sum, entries) => sum + entries.length, 0);
  if (expected === 0) return { rolls: [], expected: 0, coverage: 0 };

  const rolls = await getSenateCorpusRollCalls(congress, expected);
  return { rolls, expected, coverage: rolls.length / expected };
}

/**
 * All roll calls of `congress` held in the corpus for one chamber, plus how
 * much of the chamber's vote list they cover. Never throws; returns an empty
 * corpus on failure.
 */
export async function readChamberCorpus(
  chamber: 'House' | 'Senate',
  congress: number
): Promise<ChamberCorpus> {
  try {
    const corpus =
      chamber === 'House' ? await readHouseCorpus(congress) : await readSenateCorpus(congress);
    logger.info('[RollCorpus] Read chamber corpus', {
      chamber,
      congress,
      rolls: corpus.rolls.length,
      expected: corpus.expected,
      coveragePct: Math.round(corpus.coverage * 100),
    });
    return corpus;
  } catch (error) {
    logger.warn('[RollCorpus] Chamber corpus read failed', {
      chamber,
      congress,
      error: (error as Error).message,
    });
    return { rolls: [], expected: 0, coverage: 0 };
  }
}

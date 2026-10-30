/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Vote pages for the sitemap, from the real lists: every Senate roll call in
 * the stored vote menu, and every House roll call Congress.gov lists, for
 * each session of the sitting Congress so far. Each is dated by the day it
 * was held. (The sitemap used to emit senate rolls 1-200 and house rolls
 * 1-300 of the current session from a fallback guess, because the
 * /api/votes/recent it asked doesn't exist.) A list that can't be read is
 * left out, never guessed.
 */

import { cachedFetch } from '@/lib/cache';
import logger from '@/lib/logging/simple-logger';
import { getSenateVoteMenu } from '@/features/representatives/services/roll-call-corpus';

const CONGRESS_API = 'https://api.congress.gov/v3';
const PAGE = 250;

export interface VoteUrl {
  path: string;
  /** YYYY-MM-DD the vote was held. */
  date: string;
}

/** Sessions of a Congress that have begun by `now` (1 = odd year, 2 = even). */
export function startedSessions(congress: number, now: Date): number[] {
  const firstYear = 1789 + (congress - 1) * 2;
  return [1, 2].filter(session => firstYear + session - 1 <= now.getUTCFullYear());
}

export async function senateVoteUrls(congress: number, now: Date): Promise<VoteUrl[]> {
  const menu = await getSenateVoteMenu(congress);
  if (!menu) return [];
  return startedSessions(congress, now).flatMap(session =>
    (menu.sessions[String(session)] ?? [])
      .filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.d))
      .map(e => ({ path: `/vote/senate-${congress}-${session}-${e.n}`, date: e.d }))
  );
}

interface HouseVoteListPage {
  houseRollCallVotes?: Array<{ rollCallNumber?: number; startDate?: string }>;
  pagination?: { count?: number };
}

/** Every House roll call of one session with its date, or [] when the list can't be read whole. */
async function houseSessionVotes(
  apiKey: string,
  congress: number,
  session: number
): Promise<Array<{ roll: number; date: string }>> {
  const votes: Array<{ roll: number; date: string }> = [];
  for (let offset = 0; ; offset += PAGE) {
    const response = await fetch(
      `${CONGRESS_API}/house-vote/${congress}/${session}?limit=${PAGE}&offset=${offset}&format=json`,
      { headers: { 'X-API-Key': apiKey }, signal: AbortSignal.timeout(20_000) }
    );
    if (!response.ok) throw new Error(`Congress.gov house-vote HTTP ${response.status}`);
    const page = (await response.json()) as HouseVoteListPage;
    const items = page.houseRollCallVotes ?? [];
    for (const v of items) {
      // startDate is Washington time ("2026-02-24T14:18:00-05:00"): its date is the day held.
      const date = v.startDate?.slice(0, 10) ?? '';
      if (v.rollCallNumber && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
        votes.push({ roll: v.rollCallNumber, date });
      }
    }
    const count = page.pagination?.count ?? 0;
    if (items.length < PAGE || offset + PAGE >= count) {
      if (votes.length < count) throw new Error(`house-vote listed ${votes.length} of ${count}`);
      return votes;
    }
  }
}

export async function houseVoteUrls(congress: number, now: Date): Promise<VoteUrl[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return [];
  const urls: VoteUrl[] = [];
  for (const session of startedSessions(congress, now)) {
    try {
      const votes = await cachedFetch(
        `sitemap:house-votes:${congress}:${session}`,
        () => houseSessionVotes(apiKey, congress, session),
        6 * 60 * 60
      );
      for (const v of votes) {
        urls.push({ path: `/vote/house-${congress}-${session}-${v.roll}`, date: v.date });
      }
    } catch (error) {
      logger.warn('[Sitemap] House vote list unavailable', {
        congress,
        session,
        error: (error as Error).message,
      });
    }
  }
  return urls;
}

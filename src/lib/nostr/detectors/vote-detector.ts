/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Event Detector
 * Detects new House roll call votes from the Congress.gov house-vote API,
 * and new Senate roll calls from the MR10 mirror corpus (senate.gov XML is
 * Akamai-blocked from servers, so Senate data is read from Redis only).
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import {
  getSenateVoteMenu,
  rollKey,
  type CompactRollCall,
} from '@/features/representatives/services/roll-call-corpus';
import { nostrConfig } from '@/config/nostr.config';
import type { CivicEvent, VoteRecordEvent } from '@/types/nostr';
import type { HouseVoteListResponse, HouseVoteDetailResponse } from './types';
import logger from '@/lib/logging/simple-logger';

const CONGRESS_API = 'https://api.congress.gov/v3';

/** Only publish votes taken this recently; older rolls are not news. */
const MAX_VOTE_AGE_DAYS = 7;

/** Upper bound on detail fetches per run. */
const MAX_ROLLS_PER_RUN = 10;

/** House sessions map to calendar years: odd year = session 1, even = 2. */
export function currentHouseSession(now = new Date()): number {
  return now.getUTCFullYear() % 2 === 0 ? 2 : 1;
}

function congressHeaders(apiKey: string): HeadersInit {
  return { 'X-API-Key': apiKey };
}

/**
 * The house-vote list endpoint ignores sort parameters and returns votes in
 * arbitrary order, but roll call numbers are sequential per session — so
 * pagination.count IS the latest roll number. We take the count, then fetch
 * details for the trailing rolls directly.
 */
async function fetchLatestRollNumber(
  apiKey: string,
  congress: string,
  session: number
): Promise<number> {
  const url = `${CONGRESS_API}/house-vote/${congress}/${session}?limit=1&format=json`;
  const response = await fetch(url, {
    headers: congressHeaders(apiKey),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Congress house-vote list error: HTTP ${response.status}`);
  }

  const data = (await response.json()) as HouseVoteListResponse;
  return data.pagination?.count ?? 0;
}

/** Detect new vote events from the Congress.gov house-vote API */
export async function detectVoteEvents(): Promise<CivicEvent[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) return [];

  const congress = process.env.CURRENT_CONGRESS || '119';
  const session = currentHouseSession();
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const latestRoll = await fetchLatestRollNumber(congressApiKey, congress, session);

    logger.info(`Latest House roll call is #${latestRoll} for Nostr publishing`, {
      congress,
      session,
      operation: 'nostr_publisher',
    });

    for (let roll = latestRoll; roll > Math.max(0, latestRoll - MAX_ROLLS_PER_RUN); roll--) {
      const voteId = `house-${congress}-${session}-${roll}`;
      const dedupKey = `${nostrConfig.dedupPrefix}vote-${voteId}`;
      if (await cache.exists(dedupKey)) continue;

      const detailUrl = `${CONGRESS_API}/house-vote/${congress}/${session}/${roll}?format=json`;
      const response = await fetch(detailUrl, {
        headers: congressHeaders(congressApiKey),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        logger.warn('Congress house-vote detail error', {
          roll,
          status: response.status,
          operation: 'nostr_publisher',
        });
        continue;
      }

      const detail = (await response.json()) as HouseVoteDetailResponse;
      const vote = detail.houseRollCallVote;
      if (!vote?.startDate || !vote.result) continue;

      const ageMs = Date.now() - new Date(vote.startDate).getTime();
      if (ageMs > MAX_VOTE_AGE_DAYS * 24 * 60 * 60 * 1000) continue;

      let yeas = 0;
      let nays = 0;
      let notVoting = 0;
      for (const partyTotal of vote.votePartyTotal ?? []) {
        yeas += partyTotal.yeaTotal || 0;
        nays += partyTotal.nayTotal || 0;
        notVoting += partyTotal.notVotingTotal || 0;
      }

      const legislation =
        vote.legislationType && vote.legislationNumber
          ? `${vote.legislationType} ${vote.legislationNumber}`
          : null;
      const question =
        vote.voteQuestion || (legislation ? `On ${legislation}` : `Roll Call ${roll}`);

      const voteData: VoteRecordEvent = {
        voteId,
        chamber: 'House',
        rollNumber: roll,
        question,
        result: vote.result,
        date: vote.startDate,
        yeas,
        nays,
        notVoting,
      };

      events.push({
        type: 'vote-record',
        id: `vote-${voteId}`,
        timestamp: Math.floor(new Date(vote.startDate).getTime() / 1000),
        title: `House Vote #${roll}: ${question}`,
        summary: `House Roll Call #${roll} — ${question}. Result: ${vote.result} (${yeas} yea, ${nays} nay).`,
        tags: ['vote', 'house'],
        source: {
          url: vote.legislationUrl || vote.sourceDataURL || detailUrl,
          api: 'congress.gov',
        },
        data: voteData,
      });
    }
  } catch (error) {
    logger.error('Failed to detect vote events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/**
 * Detect new Senate roll call votes from the GH-Actions mirror corpus (MR10).
 * senate.gov XML is Akamai-blocked from cloud IPs, so this reads ONLY the
 * mirrored vote menu + compact rolls in Redis — it never fetches senate.gov.
 * Menu entries whose roll call hasn't been ingested yet are skipped and
 * picked up on a later run once the mirror fills the gap.
 */
export async function detectSenateVoteEvents(): Promise<CivicEvent[]> {
  const congress = parseInt(process.env.CURRENT_CONGRESS || '119', 10);
  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const menu = await getSenateVoteMenu(congress);
    if (!menu) {
      logger.info('Senate vote menu absent (mirror not run) — no Senate vote events', {
        congress,
        operation: 'nostr_publisher',
      });
      return [];
    }

    const cutoff = Date.now() - MAX_VOTE_AGE_DAYS * 24 * 60 * 60 * 1000;
    const recent = Object.entries(menu.sessions)
      .flatMap(([session, entries]) =>
        entries.map(entry => ({ session: parseInt(session, 10), entry }))
      )
      .filter(({ entry }) => {
        const t = new Date(entry.d).getTime();
        return !Number.isNaN(t) && t >= cutoff;
      })
      .sort((a, b) => b.session - a.session || b.entry.n - a.entry.n)
      .slice(0, MAX_ROLLS_PER_RUN);

    for (const { session, entry } of recent) {
      const voteId = `senate-${congress}-${session}-${entry.n}`;
      const dedupKey = `${nostrConfig.dedupPrefix}vote-${voteId}`;
      if (await cache.exists(dedupKey)) continue;

      const compact = await cache.get<CompactRollCall>(
        rollKey('senate', congress, session, entry.n)
      );
      if (!compact) continue; // menu is ahead of the mirrored rolls — defer

      let yeas = 0;
      let nays = 0;
      let notVoting = 0;
      for (const v of compact.votes) {
        if (v.v === 'Y') yeas++;
        else if (v.v === 'N') nays++;
        else if (v.v === 'X') notVoting++;
      }

      const question = entry.i ? `${entry.q} — ${entry.i}` : entry.q;
      const padded = String(entry.n).padStart(5, '0');
      const sourceUrl = `https://www.senate.gov/legislative/LIS/roll_call_votes/vote${congress}${session}/vote_${congress}_${session}_${padded}.htm`;

      const voteData: VoteRecordEvent = {
        voteId,
        chamber: 'Senate',
        rollNumber: entry.n,
        question,
        result: entry.r,
        date: entry.d,
        yeas,
        nays,
        notVoting,
      };

      events.push({
        type: 'vote-record',
        id: `vote-${voteId}`,
        timestamp: Math.floor(new Date(entry.d).getTime() / 1000),
        title: `Senate Vote #${entry.n}: ${question}`,
        summary: `Senate Roll Call #${entry.n} — ${entry.t || question}. Result: ${entry.r} (${yeas} yea, ${nays} nay).`,
        tags: ['vote', 'senate'],
        source: {
          url: sourceUrl,
          api: 'senate.gov (mirrored corpus)',
        },
        data: voteData,
      });
    }
  } catch (error) {
    logger.error('Failed to detect Senate vote events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

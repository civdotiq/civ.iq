/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Vote Event Detector
 * Detects new roll call votes from Congress.gov API.
 */

import { getRedisCache } from '@/lib/cache/redis-client';
import { nostrConfig } from '@/config/nostr.config';
import type { CivicEvent, VoteRecordEvent } from '@/types/nostr';
import type { CongressVoteApiResponse } from './types';
import logger from '@/lib/logging/simple-logger';

/** Detect new vote events from Congress.gov API */
export async function detectVoteEvents(): Promise<CivicEvent[]> {
  const congressApiKey = process.env.CONGRESS_API_KEY;
  if (!congressApiKey) return [];

  const cache = getRedisCache();
  const events: CivicEvent[] = [];

  try {
    const url = 'https://api.congress.gov/v3/vote?limit=20&sort=date+desc&format=json';
    const response = await fetch(url, {
      headers: { 'X-API-Key': congressApiKey },
    });

    if (!response.ok) {
      logger.error('Congress Vote API error', new Error(`HTTP ${response.status}`), {
        operation: 'nostr_publisher',
      });
      return [];
    }

    const data = (await response.json()) as CongressVoteApiResponse;
    const votes = data.votes || [];

    logger.info(`Fetched ${votes.length} recent votes for Nostr publishing`, {
      operation: 'nostr_publisher',
    });

    for (const vote of votes) {
      const chamber = vote.chamber === 'Senate' ? 'Senate' : 'House';
      const dedupKey = `${nostrConfig.dedupPrefix}vote-${chamber.toLowerCase()}-${vote.congress}-${vote.number}`;
      const alreadyPublished = await cache.exists(dedupKey);

      if (!alreadyPublished) {
        const voteData: VoteRecordEvent = {
          voteId: `${chamber.toLowerCase()}-${vote.congress}-${vote.number}`,
          chamber: chamber as 'House' | 'Senate',
          rollNumber: vote.number,
          question: vote.question,
          result: vote.result,
          date: vote.date,
          yeas: vote.total?.yea ?? 0,
          nays: vote.total?.nay ?? 0,
          notVoting: vote.total?.not_voting ?? 0,
        };

        events.push({
          type: 'vote-record',
          id: `vote-${chamber.toLowerCase()}-${vote.congress}-${vote.number}`,
          timestamp: Math.floor(new Date(vote.date).getTime() / 1000),
          title: `${chamber} Vote #${vote.number}: ${vote.question}`,
          summary: `${chamber} Roll Call #${vote.number} — ${vote.question}. Result: ${vote.result}`,
          tags: ['vote', chamber.toLowerCase()],
          source: {
            url:
              vote.url ||
              `https://www.congress.gov/roll-call-vote/${vote.congress}/${chamber.toLowerCase()}/${vote.number}`,
            api: 'congress.gov',
          },
          data: voteData,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to detect vote events', error as Error, {
      operation: 'nostr_publisher',
    });
  }

  return events;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Relay Reader
 * Queries relays for CIV.IQ-signed events to verify publishing integrity
 */

import './websocket-polyfill';
import { SimplePool } from 'nostr-tools/pool';
import type { Filter } from 'nostr-tools/filter';
import { nostrConfig } from '@/config/nostr.config';
import logger from '@/lib/logging/simple-logger';

export interface RelayQueryResult {
  url: string;
  status: 'ok' | 'timeout' | 'error';
  eventsFound: number;
  error?: string;
}

export interface RelayReadResult {
  totalUniqueEvents: number;
  relayResults: RelayQueryResult[];
  eventIds: string[];
}

/** Query a single relay for events matching the filter */
async function queryRelay(
  pool: SimplePool,
  url: string,
  filter: Filter,
  timeout: number
): Promise<RelayQueryResult> {
  try {
    const events = await Promise.race([
      pool.querySync([url], filter),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Query timeout')), timeout);
      }),
    ]);

    return {
      url,
      status: 'ok',
      eventsFound: events.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message.includes('timeout') ? 'timeout' : 'error';

    return {
      url,
      status,
      eventsFound: 0,
      error: message,
    };
  }
}

/** Query all configured relays for CIV.IQ-signed events */
export async function queryRelays(
  pubkey: string,
  kind?: number,
  limit?: number
): Promise<RelayReadResult> {
  const relays = nostrConfig.relays;
  const pool = new SimplePool();
  const eventKind = kind ?? nostrConfig.eventKind;

  const filter: Filter = {
    authors: [pubkey],
    kinds: [eventKind],
    limit: limit ?? 500,
  };

  try {
    // Query each relay independently
    const results = await Promise.allSettled(
      relays.map(url => queryRelay(pool, url, filter, nostrConfig.publishTimeout))
    );

    const relayResults: RelayQueryResult[] = results.map((result, i) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        url: relays[i]!,
        status: 'error' as const,
        eventsFound: 0,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown',
      };
    });

    // Get unique event IDs across all relays
    let allEvents: { id: string }[] = [];
    try {
      allEvents = await Promise.race([
        pool.querySync(relays, filter),
        new Promise<never>((_, reject) => {
          setTimeout(
            () => reject(new Error('Aggregate query timeout')),
            nostrConfig.publishTimeout * 2
          );
        }),
      ]);
    } catch {
      // Fall back to sum of relay results if aggregate fails
      logger.warn('Aggregate relay query failed, using per-relay counts', {
        operation: 'nostr_verify',
      });
    }

    const uniqueEventIds = [...new Set(allEvents.map(e => e.id))];

    return {
      totalUniqueEvents:
        uniqueEventIds.length || Math.max(...relayResults.map(r => r.eventsFound), 0),
      relayResults,
      eventIds: uniqueEventIds,
    };
  } finally {
    pool.destroy();
  }
}

// ── Reach measurement & content freshness ────────────────────────────

export interface EngagementMetrics {
  /** Unique pubkeys whose kind-3 contact list includes ours. */
  followers: number;
  /** Kind-1 notes tagging our pubkey (replies + mentions). */
  replies: number;
  /** Kind-6 reposts of our events. */
  reposts: number;
  /** Kind-7 reactions to our events. */
  reactions: number;
  /** Kind-9735 zap receipts referencing our pubkey. */
  zaps: number;
  /** Unique pubkeys across replies/reposts/reactions/zaps. */
  uniqueEngagers: number;
  measuredAt: string;
}

export interface ContentFreshness {
  /** ISO timestamp of the newest content event found on relays, or null. */
  newestEventAt: string | null;
  ageHours: number | null;
  /** True when no content event is newer than the stale threshold — the
   *  canary that catches metadata-only publishing (July 2026 outage mode). */
  stale: boolean;
  staleAfterHours: number;
}

/** Aggregate querySync across relays with a timeout; [] on failure. */
async function querySyncSafe(
  pool: SimplePool,
  relays: string[],
  filter: Filter,
  timeout: number,
  label: string
): Promise<Array<{ id: string; pubkey: string; kind: number; created_at: number }>> {
  try {
    return await Promise.race([
      pool.querySync(relays, filter),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${label} query timeout`)), timeout);
      }),
    ]);
  } catch (error) {
    logger.warn(`Relay ${label} query failed`, {
      error: error instanceof Error ? error.message : 'Unknown',
      operation: 'nostr_status',
    });
    return [];
  }
}

/**
 * Measure how widely the feed is actually seen: followers plus events
 * referencing our pubkey. Relay `#p` queries are capped at limit 1000, so
 * counts are floors once engagement exceeds relay limits — the decision
 * these numbers inform is "is anyone listening at all", where a floor is
 * exactly as useful as a total.
 */
export async function measureEngagement(pubkey: string): Promise<EngagementMetrics> {
  const relays = nostrConfig.relays;
  const pool = new SimplePool();
  const timeout = nostrConfig.publishTimeout * 2;

  try {
    const [followerEvents, engagementEvents] = await Promise.all([
      querySyncSafe(pool, relays, { kinds: [3], '#p': [pubkey], limit: 1000 }, timeout, 'follower'),
      querySyncSafe(
        pool,
        relays,
        { kinds: [1, 6, 7, 9735], '#p': [pubkey], limit: 1000 },
        timeout,
        'engagement'
      ),
    ]);

    const followers = new Set(followerEvents.map(e => e.pubkey)).size;

    let replies = 0;
    let reposts = 0;
    let reactions = 0;
    let zaps = 0;
    const engagers = new Set<string>();
    const seenIds = new Set<string>();
    for (const event of engagementEvents) {
      if (seenIds.has(event.id) || event.pubkey === pubkey) continue;
      seenIds.add(event.id);
      if (event.kind === 1) replies++;
      else if (event.kind === 6) reposts++;
      else if (event.kind === 7) reactions++;
      else if (event.kind === 9735) zaps++;
      engagers.add(event.pubkey);
    }

    return {
      followers,
      replies,
      reposts,
      reactions,
      zaps,
      uniqueEngagers: engagers.size,
      measuredAt: new Date().toISOString(),
    };
  } finally {
    pool.destroy();
  }
}

/**
 * Age of the newest content event (Kind 30023 article) on the relays.
 * Metadata kinds (0/10002) are deliberately excluded: they publish before
 * detection every run, which is why the status endpoint stayed green
 * through a two-day content outage.
 */
export async function getContentFreshness(
  pubkey: string,
  staleAfterHours = nostrConfig.staleContentHours
): Promise<ContentFreshness> {
  const pool = new SimplePool();
  const timeout = nostrConfig.publishTimeout * 2;

  try {
    const events = await querySyncSafe(
      pool,
      nostrConfig.relays,
      { authors: [pubkey], kinds: [nostrConfig.eventKind], limit: 25 },
      timeout,
      'freshness'
    );

    if (events.length === 0) {
      return { newestEventAt: null, ageHours: null, stale: true, staleAfterHours };
    }

    const newest = Math.max(...events.map(e => e.created_at));
    const ageHours = (Date.now() / 1000 - newest) / 3600;

    return {
      newestEventAt: new Date(newest * 1000).toISOString(),
      ageHours: Math.round(ageHours * 10) / 10,
      stale: ageHours > staleAfterHours,
      staleAfterHours,
    };
  } finally {
    pool.destroy();
  }
}

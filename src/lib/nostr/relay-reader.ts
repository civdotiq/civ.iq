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
    pool.close(relays);
  }
}

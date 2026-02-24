/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Multi-Relay Publishing
 * Publishes signed events to multiple Nostr relays with timeout per relay
 */

import './websocket-polyfill';
import { SimplePool } from 'nostr-tools/pool';
import type { VerifiedEvent } from 'nostr-tools/pure';
import type { RelayPublishResult } from '@/types/nostr';
import { nostrConfig } from '@/config/nostr.config';
import logger from '@/lib/logging/simple-logger';

/** Publish a signed event to multiple relays with timeout per relay */
export async function publishToRelays(
  event: VerifiedEvent,
  relayUrls?: string[]
): Promise<RelayPublishResult> {
  const relays = relayUrls || nostrConfig.relays;
  const pool = new SimplePool();
  const successes: string[] = [];
  const failures: Array<{ url: string; error: string }> = [];

  try {
    const results = await Promise.allSettled(
      relays.map(async url => {
        await Promise.race([
          pool.publish([url], event),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Publish timeout')), nostrConfig.publishTimeout);
          }),
        ]);
        return url;
      })
    );

    for (const [i, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        successes.push(result.value);
      } else {
        failures.push({
          url: relays[i]!,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown',
        });
      }
    }

    if (successes.length < nostrConfig.minRelaySuccess) {
      logger.warn('Nostr publish below minimum threshold', {
        required: nostrConfig.minRelaySuccess,
        achieved: successes.length,
        eventId: event.id,
      });
    }

    return {
      successCount: successes.length,
      failureCount: failures.length,
      successes,
      failures,
      eventId: event.id,
    };
  } finally {
    pool.close(relays);
  }
}

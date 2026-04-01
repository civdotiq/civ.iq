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
import { filterCapableRelays } from './relay-info';
import logger from '@/lib/logging/simple-logger';

export interface PublishOptions {
  skipNip11Check?: boolean;
}

/** Publish a signed event to multiple relays with timeout per relay */
export async function publishToRelays(
  event: VerifiedEvent,
  relayUrls?: string[],
  options?: PublishOptions
): Promise<RelayPublishResult> {
  let relays = relayUrls || nostrConfig.relays;

  // Pre-filter relays via NIP-11 capability check
  if (nostrConfig.enableNip11Check && !options?.skipNip11Check) {
    const payloadSize = JSON.stringify(event).length;
    relays = await filterCapableRelays(relays, payloadSize);
  }
  const pool = new SimplePool();
  const successes: string[] = [];
  const failures: Array<{ url: string; error: string }> = [];

  try {
    const results = await Promise.allSettled(
      relays.map(async url => {
        const promises = pool.publish([url], event);
        await Promise.race([
          Promise.all(promises),
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
    pool.destroy();
  }
}

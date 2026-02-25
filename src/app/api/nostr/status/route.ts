/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/nostr/status
 *
 * Returns Nostr publishing layer status: configuration, relay list,
 * recent publish activity from Redis dedup cache.
 */

import { NextResponse } from 'next/server';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getNostrKeypair } from '@/lib/nostr';
import { nostrConfig } from '@/config/nostr.config';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keypair = getNostrKeypair();
    const configured = keypair !== null;

    // Count recent publishes by scanning dedup keys
    let recentPublishes = 0;
    const eventTypeCounts: Record<string, number> = {};

    if (configured) {
      try {
        const cache = getRedisCache();
        const dedupKeys = await cache.keys(`${nostrConfig.dedupPrefix}*`);
        recentPublishes = dedupKeys.length;

        // Categorize by event type from key patterns
        for (const key of dedupKeys) {
          const suffix = key.replace(nostrConfig.dedupPrefix, '');
          let eventType = 'unknown';

          if (suffix.startsWith('state-vote-')) eventType = 'state-vote';
          else if (suffix.startsWith('state-bill-intro-')) eventType = 'state-bill-introduced';
          else if (suffix.startsWith('state-bill-action-')) eventType = 'state-bill-action';
          else if (suffix.startsWith('vote-')) eventType = 'vote-record';
          else if (suffix.startsWith('eo-')) eventType = 'executive-order';
          else if (suffix.startsWith('comment-')) eventType = 'comment-period';
          else if (suffix.startsWith('hearing-')) eventType = 'hearing';
          else if (suffix.includes('-introduced')) eventType = 'bill-introduced';
          else if (suffix.includes('-action-')) eventType = 'bill-action';

          eventTypeCounts[eventType] = (eventTypeCounts[eventType] ?? 0) + 1;
        }
      } catch {
        // Redis unavailable — report what we can without it
      }
    }

    const response = {
      status: configured ? 'active' : 'disabled',
      configured,
      publicKey: configured ? keypair.publicKey : null,
      relays: nostrConfig.relays,
      publishing: {
        eventKind: nostrConfig.eventKind,
        minRelaySuccess: nostrConfig.minRelaySuccess,
        publishTimeout: nostrConfig.publishTimeout,
        dedupTTLDays: nostrConfig.dedupTTL / (24 * 60 * 60),
      },
      recentActivity: {
        publishedEvents: recentPublishes,
        byType: eventTypeCounts,
      },
      eventTypes: [
        'bill-action',
        'bill-introduced',
        'vote-record',
        'executive-order',
        'comment-period',
        'hearing',
        'state-bill-introduced',
        'state-bill-action',
        'state-vote',
      ],
      metadata: {
        endpoint: '/api/nostr/status',
        generatedAt: new Date().toISOString(),
      },
    };

    logger.info('Nostr status requested', {
      configured,
      recentPublishes,
      operation: 'nostr_status',
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error retrieving Nostr status', error as Error, {
      endpoint: '/api/nostr/status',
    });

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          endpoint: '/api/nostr/status',
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

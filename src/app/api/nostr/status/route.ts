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
import { getNostrKeypair } from '@/lib/nostr';
import { queryRelays } from '@/lib/nostr/relay-reader';
import { nostrConfig } from '@/config/nostr.config';
import { getFollowerCount } from '@/lib/activitypub/followers';
import { getOutboxItems } from '@/lib/activitypub/outbox';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keypair = getNostrKeypair();
    const configured = keypair !== null;

    // Query relays directly for the authoritative event count
    let confirmedOnRelays = 0;
    let relaysResponding = 0;
    if (configured) {
      try {
        const relayResult = await queryRelays(keypair.publicKey);
        confirmedOnRelays = relayResult.totalUniqueEvents;
        relaysResponding = relayResult.relayResults.filter(r => r.status === 'ok').length;
      } catch {
        // Relay queries failed — report 0
      }
    }

    // Get ActivityPub outbox count
    let outboxItems = 0;
    try {
      const { total } = await getOutboxItems(0, 0);
      outboxItems = total;
    } catch {
      // Redis unavailable
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
        confirmedOnRelays,
        relaysResponding,
        outboxItems,
      },
      statesCovered: {
        count: nostrConfig.enabledStates.length,
        states: nostrConfig.enabledStates,
      },
      contentFormat: 'markdown',
      nip65RelayList: true,
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
      activityPub: {
        followers: await getFollowerCount().catch(() => 0),
        delivery: true,
        activityTypes: ['Create', 'Update'],
      },
      metadata: {
        endpoint: '/api/nostr/status',
        generatedAt: new Date().toISOString(),
      },
    };

    logger.info('Nostr status requested', {
      configured,
      confirmedOnRelays,
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

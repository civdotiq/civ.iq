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
import {
  queryRelays,
  measureEngagement,
  getContentFreshness,
  type EngagementMetrics,
  type ContentFreshness,
} from '@/lib/nostr/relay-reader';
import { nostrConfig } from '@/config/nostr.config';
import { getFollowerCount } from '@/lib/activitypub/followers';
import { getOutboxItems } from '@/lib/activitypub/outbox';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keypair = getNostrKeypair();
    const configured = keypair !== null;

    // Query relays concurrently: event count, reach, content freshness
    let confirmedOnRelays = 0;
    let relaysResponding = 0;
    let engagement: EngagementMetrics | null = null;
    let contentFreshness: ContentFreshness | null = null;
    if (configured) {
      const [relayResult, engagementResult, freshnessResult] = await Promise.allSettled([
        queryRelays(keypair.publicKey),
        measureEngagement(keypair.publicKey),
        getContentFreshness(keypair.publicKey),
      ]);
      if (relayResult.status === 'fulfilled') {
        confirmedOnRelays = relayResult.value.totalUniqueEvents;
        relaysResponding = relayResult.value.relayResults.filter(r => r.status === 'ok').length;
      }
      if (engagementResult.status === 'fulfilled') engagement = engagementResult.value;
      if (freshnessResult.status === 'fulfilled') contentFreshness = freshnessResult.value;
    }

    // Get ActivityPub outbox count
    let outboxItems = 0;
    try {
      const { total } = await getOutboxItems(0, 0);
      outboxItems = total;
    } catch {
      // Redis unavailable
    }

    // health is the canary: 'stale-content' means metadata may still be
    // publishing while no content event has landed within the threshold.
    const health = !configured
      ? 'disabled'
      : contentFreshness === null
        ? 'unknown'
        : contentFreshness.stale
          ? 'stale-content'
          : 'ok';

    const response = {
      status: configured ? 'active' : 'disabled',
      health,
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
      contentFreshness,
      engagement,
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

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
    });
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

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * GET /api/nostr/verify
 *
 * Queries all configured relays for CIV.IQ-signed events and compares
 * against Redis publishing records. Closes the write-only gap — the system
 * can now prove its records survive independently on the Nostr network.
 */

import { NextResponse } from 'next/server';
import { getRedisCache } from '@/lib/cache/redis-client';
import { getNostrKeypair } from '@/lib/nostr';
import { queryRelays } from '@/lib/nostr/relay-reader';
import { nostrConfig } from '@/config/nostr.config';
import logger from '@/lib/logging/simple-logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const keypair = getNostrKeypair();

    if (!keypair) {
      return NextResponse.json(
        {
          status: 'unhealthy',
          error: 'Nostr not configured — NOSTR_PRIVATE_KEY missing',
          metadata: {
            endpoint: '/api/nostr/verify',
            generatedAt: new Date().toISOString(),
          },
        },
        { status: 503 }
      );
    }

    // Count published events from Redis dedup keys
    let publishedCount = 0;
    let publishedEventIds: string[] = [];
    try {
      const cache = getRedisCache();
      const dedupKeys = await cache.keys(`${nostrConfig.dedupPrefix}*`);
      publishedCount = dedupKeys.length;
      publishedEventIds = dedupKeys.map(k => k.replace(nostrConfig.dedupPrefix, ''));
    } catch {
      // Redis unavailable — continue with relay-only data
    }

    // Query relays for CIV.IQ-signed events
    const relayResult = await queryRelays(keypair.publicKey);

    // Find discrepancies: events in Redis but not found on any relay
    const relayEventIdSet = new Set(relayResult.eventIds);
    const discrepancies: string[] = [];

    if (relayResult.eventIds.length > 0 && publishedEventIds.length > 0) {
      // We can only compare d-tags if we have both sources
      // Redis stores civic event IDs, relays store Nostr event IDs (hashes)
      // So discrepancy detection is count-based
      if (publishedCount > relayResult.totalUniqueEvents) {
        const missing = publishedCount - relayResult.totalUniqueEvents;
        discrepancies.push(`${missing} event(s) in Redis dedup cache not confirmed on any relay`);
      }
    }

    // Determine overall health
    const okRelays = relayResult.relayResults.filter(r => r.status === 'ok').length;
    const totalRelays = relayResult.relayResults.length;
    let status: 'healthy' | 'degraded' | 'unhealthy';

    if (okRelays >= nostrConfig.minRelaySuccess && discrepancies.length === 0) {
      status = 'healthy';
    } else if (okRelays > 0) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const response = {
      status,
      published: publishedCount,
      confirmedOnRelays: relayResult.totalUniqueEvents,
      relayHealth: relayResult.relayResults.map(r => ({
        url: r.url,
        status: r.status,
        eventsFound: r.eventsFound,
        ...(r.error ? { error: r.error } : {}),
      })),
      discrepancies,
      verifiedAt: new Date().toISOString(),
      metadata: {
        endpoint: '/api/nostr/verify',
        publicKey: keypair.publicKey,
        relaysQueried: totalRelays,
        relaysResponding: okRelays,
        generatedAt: new Date().toISOString(),
      },
    };

    logger.info('Nostr verification completed', {
      status,
      published: publishedCount,
      confirmed: relayResult.totalUniqueEvents,
      okRelays,
      totalRelays,
      operation: 'nostr_verify',
    });

    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (error) {
    logger.error('Nostr verification failed', error as Error, {
      endpoint: '/api/nostr/verify',
    });

    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Verification failed',
        metadata: {
          endpoint: '/api/nostr/verify',
          generatedAt: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

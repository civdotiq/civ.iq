/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Configuration
 * Centralized configuration for Nostr relay publishing
 */

export const nostrConfig = {
  // Default relays (proven set from ECHOLOCK)
  relays:
    (process.env.NOSTR_RELAYS ?? '').split(',').filter(Boolean).length > 0
      ? (process.env.NOSTR_RELAYS ?? '')
          .split(',')
          .map(r => r.trim())
          .filter(Boolean)
      : [
          'wss://relay.damus.io',
          'wss://relay.snort.social',
          'wss://nos.lol',
          'wss://relay.nostr.band',
          'wss://nostr.wine',
          'wss://relay.nostr.bg',
          'wss://nostr-pub.wellorder.net',
        ],

  // Publishing thresholds. publishTimeout bounds the SLOWEST relay per
  // publish (healthy relays answer in <1s), so it is effectively per-event
  // wall time — every event must fit under the cron's 300s maxDuration.
  minRelaySuccess: 3,
  publishTimeout: 3500,

  // NIP-23: Long-form content (parameterized replaceable)
  eventKind: 30023 as const,

  // Kind 1: Short text notes for social timeline visibility
  alertEventKind: 1 as const,

  // Publish both Kind 30023 (article) and Kind 1 (alert) for each event
  enableDualPublish: (process.env.NOSTR_DUAL_PUBLISH ?? 'true') !== 'false',

  // Redis dedup key prefix and TTL
  dedupPrefix: 'nostr:published:',
  dedupTTL: 30 * 24 * 60 * 60,

  // Content-freshness canary: hours without a new Kind 30023 content event
  // before /api/nostr/status reports stale. 72h absorbs weekends and short
  // recesses while still catching multi-day publish outages.
  staleContentHours: parseInt(process.env.NOSTR_STALE_CONTENT_HOURS ?? '72', 10),

  // NIP-11 relay capability negotiation
  enableNip11Check: (process.env.NOSTR_NIP11_CHECK ?? 'true') !== 'false',
  nip11CacheTTL: 24 * 60 * 60, // 24 hours in seconds

  // State legislature event detection (most reliable OpenStates coverage)
  enabledStates: [
    'ca',
    'ny',
    'tx',
    'il',
    'fl',
    'pa',
    'oh',
    'ga',
    'wa',
    'mi',
    'nj',
    'va',
    'ma',
    'az',
    'co',
  ] as string[],
} as const;

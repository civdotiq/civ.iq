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
    (process.env.NOSTR_RELAYS || '').split(',').filter(Boolean).length > 0
      ? process.env
          .NOSTR_RELAYS!.split(',')
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

  // Publishing thresholds
  minRelaySuccess: 3,
  publishTimeout: 10000,

  // NIP-23: Long-form content (parameterized replaceable)
  eventKind: 30023 as const,

  // Redis dedup key prefix and TTL
  dedupPrefix: 'nostr:published:',
  dedupTTL: 30 * 24 * 60 * 60,

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

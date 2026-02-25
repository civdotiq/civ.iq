/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Nostr Verification Endpoint Tests
 *
 * Tests the read-back verification endpoint that compares
 * Redis publishing records against relay query results.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('nostr-tools/pure', () => ({
  generateSecretKey: () => new Uint8Array(32),
  getPublicKey: () => 'a'.repeat(64),
  finalizeEvent: (event: Record<string, unknown>) => ({
    ...event,
    id: 'mock-event-id',
    pubkey: 'mock-pubkey',
    sig: 'mock-sig',
  }),
}));

jest.mock('nostr-tools/pool', () => ({
  SimplePool: jest.fn().mockImplementation(() => ({
    publish: jest.fn().mockResolvedValue(undefined),
    querySync: jest.fn().mockResolvedValue([]),
    close: jest.fn(),
  })),
}));

jest.mock('ws', () => jest.fn());

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: jest.fn().mockReturnValue({
    keys: jest.fn().mockResolvedValue([]),
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  }),
}));

jest.mock('@/lib/nostr/relay-reader', () => ({
  queryRelays: jest.fn().mockResolvedValue({
    totalUniqueEvents: 0,
    relayResults: [],
    eventIds: [],
  }),
}));

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('GET /api/nostr/verify', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns 503 when Nostr is not configured', async () => {
    delete process.env.NOSTR_PRIVATE_KEY;

    const { GET } = require('@/app/api/nostr/verify/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.error).toContain('NOSTR_PRIVATE_KEY');
  });

  test('returns healthy status when relays respond and counts match', async () => {
    process.env.NOSTR_PRIVATE_KEY = 'a'.repeat(64);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    queryRelays.mockResolvedValue({
      totalUniqueEvents: 5,
      relayResults: [
        { url: 'wss://relay1.example.com', status: 'ok', eventsFound: 5 },
        { url: 'wss://relay2.example.com', status: 'ok', eventsFound: 4 },
        { url: 'wss://relay3.example.com', status: 'ok', eventsFound: 5 },
      ],
      eventIds: ['e1', 'e2', 'e3', 'e4', 'e5'],
    });

    const { getRedisCache } = require('@/lib/cache/redis-client');
    getRedisCache.mockReturnValue({
      keys: jest
        .fn()
        .mockResolvedValue([
          'nostr:published:bill1',
          'nostr:published:bill2',
          'nostr:published:bill3',
          'nostr:published:vote1',
          'nostr:published:eo1',
        ]),
    });

    const { GET } = require('@/app/api/nostr/verify/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.published).toBe(5);
    expect(data.confirmedOnRelays).toBe(5);
    expect(data.relayHealth).toHaveLength(3);
    expect(data.discrepancies).toHaveLength(0);
    expect(data.verifiedAt).toBeDefined();
  });

  test('returns degraded when some relays fail', async () => {
    process.env.NOSTR_PRIVATE_KEY = 'a'.repeat(64);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    queryRelays.mockResolvedValue({
      totalUniqueEvents: 3,
      relayResults: [
        { url: 'wss://relay1.example.com', status: 'ok', eventsFound: 3 },
        { url: 'wss://relay2.example.com', status: 'timeout', eventsFound: 0 },
        { url: 'wss://relay3.example.com', status: 'error', eventsFound: 0 },
      ],
      eventIds: ['e1', 'e2', 'e3'],
    });

    const { getRedisCache } = require('@/lib/cache/redis-client');
    getRedisCache.mockReturnValue({
      keys: jest
        .fn()
        .mockResolvedValue([
          'nostr:published:bill1',
          'nostr:published:bill2',
          'nostr:published:bill3',
        ]),
    });

    const { GET } = require('@/app/api/nostr/verify/route');
    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('degraded');
  });

  test('reports discrepancies when Redis count exceeds relay count', async () => {
    process.env.NOSTR_PRIVATE_KEY = 'a'.repeat(64);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    queryRelays.mockResolvedValue({
      totalUniqueEvents: 2,
      relayResults: [
        { url: 'wss://relay1.example.com', status: 'ok', eventsFound: 2 },
        { url: 'wss://relay2.example.com', status: 'ok', eventsFound: 2 },
        { url: 'wss://relay3.example.com', status: 'ok', eventsFound: 1 },
      ],
      eventIds: ['e1', 'e2'],
    });

    const { getRedisCache } = require('@/lib/cache/redis-client');
    getRedisCache.mockReturnValue({
      keys: jest
        .fn()
        .mockResolvedValue([
          'nostr:published:bill1',
          'nostr:published:bill2',
          'nostr:published:bill3',
          'nostr:published:bill4',
          'nostr:published:bill5',
        ]),
    });

    const { GET } = require('@/app/api/nostr/verify/route');
    const response = await GET();
    const data = await response.json();

    expect(data.discrepancies).toHaveLength(1);
    expect(data.discrepancies[0]).toContain('3 event(s)');
  });

  test('includes metadata with endpoint and timestamps', async () => {
    process.env.NOSTR_PRIVATE_KEY = 'a'.repeat(64);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    queryRelays.mockResolvedValue({
      totalUniqueEvents: 0,
      relayResults: [
        { url: 'wss://relay1.example.com', status: 'ok', eventsFound: 0 },
        { url: 'wss://relay2.example.com', status: 'ok', eventsFound: 0 },
        { url: 'wss://relay3.example.com', status: 'ok', eventsFound: 0 },
      ],
      eventIds: [],
    });

    const { GET } = require('@/app/api/nostr/verify/route');
    const response = await GET();
    const data = await response.json();

    expect(data.metadata.endpoint).toBe('/api/nostr/verify');
    expect(data.metadata.publicKey).toBeDefined();
    expect(data.metadata.generatedAt).toBeDefined();
  });
});

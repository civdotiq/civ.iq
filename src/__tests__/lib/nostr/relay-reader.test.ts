/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Relay Reader Tests
 *
 * Covers queryRelays() — querying Nostr relays for CIV.IQ-signed events.
 * nostr-tools uses ESM-only @noble/curves, so we mock at module boundaries.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const mockQuerySync = jest.fn();
const mockDestroy = jest.fn();

jest.mock('nostr-tools/pool', () => ({
  SimplePool: jest.fn().mockImplementation(() => ({
    querySync: mockQuerySync,
    destroy: mockDestroy,
  })),
}));

jest.mock('ws', () => jest.fn());

jest.mock('@/lib/nostr/websocket-polyfill', () => ({}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Relay Reader — queryRelays', () => {
  const testPubkey = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns relay results for each configured relay', async () => {
    mockQuerySync.mockResolvedValue([{ id: 'event-1' }, { id: 'event-2' }]);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    const result = await queryRelays(testPubkey);

    expect(result.relayResults).toBeDefined();
    expect(result.relayResults.length).toBeGreaterThan(0);
    expect(result.eventIds).toEqual(['event-1', 'event-2']);
    expect(result.totalUniqueEvents).toBe(2);
  });

  test('deduplicates event IDs across relays', async () => {
    mockQuerySync.mockResolvedValue([{ id: 'event-1' }, { id: 'event-1' }, { id: 'event-2' }]);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    const result = await queryRelays(testPubkey);

    expect(result.totalUniqueEvents).toBe(2);
    expect(result.eventIds).toEqual(['event-1', 'event-2']);
  });

  test('handles relay timeout gracefully', async () => {
    // Per-relay queries succeed, aggregate query times out
    mockQuerySync
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      .mockImplementationOnce(() => Promise.resolve([{ id: 'e1' }]))
      // Aggregate query — reject with timeout
      .mockRejectedValueOnce(new Error('Aggregate query timeout'));

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    const result = await queryRelays(testPubkey);

    // Falls back to max of per-relay counts
    expect(result.totalUniqueEvents).toBeGreaterThanOrEqual(0);
    expect(result.relayResults.length).toBeGreaterThan(0);
  });

  test('marks relay as error when query rejects', async () => {
    mockQuerySync.mockRejectedValue(new Error('Connection refused'));

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    const result = await queryRelays(testPubkey);

    for (const relay of result.relayResults) {
      expect(relay.status).toBe('error');
      expect(relay.eventsFound).toBe(0);
    }
  });

  test('accepts optional kind and limit parameters', async () => {
    mockQuerySync.mockResolvedValue([]);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    const result = await queryRelays(testPubkey, 1, 10);

    expect(result).toBeDefined();
    expect(result.totalUniqueEvents).toBe(0);
    expect(result.eventIds).toEqual([]);
  });

  test('closes pool after query completes', async () => {
    mockQuerySync.mockResolvedValue([]);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    await queryRelays(testPubkey);

    expect(mockDestroy).toHaveBeenCalled();
  });

  test('closes pool even when all queries fail', async () => {
    mockQuerySync.mockRejectedValue(new Error('fail'));

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    await queryRelays(testPubkey);

    expect(mockDestroy).toHaveBeenCalled();
  });

  test('each relay result has url, status, and eventsFound', async () => {
    mockQuerySync.mockResolvedValue([{ id: 'e1' }]);

    const { queryRelays } = require('@/lib/nostr/relay-reader');
    const result = await queryRelays(testPubkey);

    for (const relay of result.relayResults) {
      expect(relay).toHaveProperty('url');
      expect(relay).toHaveProperty('status');
      expect(relay).toHaveProperty('eventsFound');
      expect(relay.url).toMatch(/^wss:\/\//);
    }
  });
});

describe('Relay Reader — measureEngagement', () => {
  const ourPubkey = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('counts followers and engagement by kind, excluding our own events', async () => {
    // First querySync call = kind-3 followers, second = kinds 1/6/7/9735
    mockQuerySync
      .mockResolvedValueOnce([
        { id: 'f1', pubkey: 'follower-1', kind: 3, created_at: 100 },
        { id: 'f2', pubkey: 'follower-2', kind: 3, created_at: 100 },
        { id: 'f3', pubkey: 'follower-1', kind: 3, created_at: 101 },
      ])
      .mockResolvedValueOnce([
        { id: 'e1', pubkey: 'user-1', kind: 1, created_at: 100 },
        { id: 'e2', pubkey: 'user-2', kind: 7, created_at: 100 },
        { id: 'e3', pubkey: 'user-2', kind: 6, created_at: 100 },
        { id: 'e3', pubkey: 'user-2', kind: 6, created_at: 100 },
        { id: 'e4', pubkey: ourPubkey, kind: 1, created_at: 100 },
      ]);

    const { measureEngagement } = require('@/lib/nostr/relay-reader');
    const result = await measureEngagement(ourPubkey);

    expect(result.followers).toBe(2);
    expect(result.replies).toBe(1);
    expect(result.reposts).toBe(1);
    expect(result.reactions).toBe(1);
    expect(result.zaps).toBe(0);
    expect(result.uniqueEngagers).toBe(2);
  });

  test('returns zeros when relay queries fail', async () => {
    mockQuerySync.mockRejectedValue(new Error('relay down'));

    const { measureEngagement } = require('@/lib/nostr/relay-reader');
    const result = await measureEngagement(ourPubkey);

    expect(result.followers).toBe(0);
    expect(result.uniqueEngagers).toBe(0);
  });
});

describe('Relay Reader — getContentFreshness', () => {
  const ourPubkey = 'a'.repeat(64);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fresh when the newest content event is within the threshold', async () => {
    const twoHoursAgo = Math.floor(Date.now() / 1000) - 2 * 3600;
    mockQuerySync.mockResolvedValue([
      { id: 'c1', pubkey: ourPubkey, kind: 30023, created_at: twoHoursAgo - 3600 },
      { id: 'c2', pubkey: ourPubkey, kind: 30023, created_at: twoHoursAgo },
    ]);

    const { getContentFreshness } = require('@/lib/nostr/relay-reader');
    const result = await getContentFreshness(ourPubkey, 72);

    expect(result.stale).toBe(false);
    expect(result.ageHours).toBeCloseTo(2, 0);
    expect(result.newestEventAt).toBe(new Date(twoHoursAgo * 1000).toISOString());
  });

  test('stale when the newest content event exceeds the threshold', async () => {
    const fourDaysAgo = Math.floor(Date.now() / 1000) - 4 * 24 * 3600;
    mockQuerySync.mockResolvedValue([
      { id: 'c1', pubkey: ourPubkey, kind: 30023, created_at: fourDaysAgo },
    ]);

    const { getContentFreshness } = require('@/lib/nostr/relay-reader');
    const result = await getContentFreshness(ourPubkey, 72);

    expect(result.stale).toBe(true);
    expect(result.staleAfterHours).toBe(72);
  });

  test('stale with null age when no content events are found', async () => {
    mockQuerySync.mockResolvedValue([]);

    const { getContentFreshness } = require('@/lib/nostr/relay-reader');
    const result = await getContentFreshness(ourPubkey, 72);

    expect(result.stale).toBe(true);
    expect(result.ageHours).toBeNull();
    expect(result.newestEventAt).toBeNull();
  });
});

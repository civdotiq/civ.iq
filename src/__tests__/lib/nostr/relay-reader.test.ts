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

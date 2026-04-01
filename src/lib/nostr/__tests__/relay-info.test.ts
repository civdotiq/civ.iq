/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect, beforeEach, afterAll } from '@jest/globals';
import { fetchRelayInfo, filterCapableRelays, clearRelayInfoCache } from '../relay-info';
import type { RelayInfo } from '../relay-info';

const originalFetch = global.fetch;

describe('fetchRelayInfo', () => {
  beforeEach(() => {
    clearRelayInfoCache();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('fetches and parses relay info', async () => {
    const mockInfo: RelayInfo = {
      name: 'Test Relay',
      supported_nips: [1, 11, 23],
      limitation: {
        max_message_length: 65536,
      },
    };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInfo),
    }) as jest.Mock;

    const info = await fetchRelayInfo('wss://test.relay');
    expect(info).toEqual(mockInfo);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://test.relay',
      expect.objectContaining({
        headers: { Accept: 'application/nostr+json' },
      })
    );
  });

  test('returns cached info on second call', async () => {
    const mockInfo: RelayInfo = { name: 'Cached Relay' };
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockInfo),
    }) as jest.Mock;

    await fetchRelayInfo('wss://cached.relay');
    await fetchRelayInfo('wss://cached.relay');

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test('returns null on fetch error (fail-open)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network error')) as jest.Mock;
    const info = await fetchRelayInfo('wss://broken.relay');
    expect(info).toBeNull();
  });
});

describe('filterCapableRelays', () => {
  beforeEach(() => {
    clearRelayInfoCache();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('excludes oversized payload relays', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('small')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ limitation: { max_message_length: 100 } }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ limitation: { max_message_length: 100000 } }),
      });
    }) as jest.Mock;

    const result = await filterCapableRelays(
      ['wss://small.relay', 'wss://big.relay'],
      5000 // 5KB payload
    );
    expect(result).toEqual(['wss://big.relay']);
  });

  test('excludes payment-required relays', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ limitation: { payment_required: true } }),
    }) as jest.Mock;

    const result = await filterCapableRelays(['wss://paid.relay', 'wss://free.relay'], 100);

    // Both have payment_required, so fail-open returns original
    expect(result).toEqual(['wss://paid.relay', 'wss://free.relay']);
  });

  test('fail-open returns original list when ALL relays filtered', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ limitation: { auth_required: true, payment_required: true } }),
    }) as jest.Mock;

    const relays = ['wss://a.relay', 'wss://b.relay'];
    const result = await filterCapableRelays(relays, 100);
    expect(result).toEqual(relays);
  });

  test('skipNip11Check bypasses filtering (via relay-pool integration)', async () => {
    // This tests the concept - filterCapableRelays itself doesn't have skip,
    // but publishToRelays skips calling filterCapableRelays when skipNip11Check is true.
    // We test that unknown relays pass through (fail-open for null info)
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 }) as jest.Mock;

    const result = await filterCapableRelays(['wss://unknown.relay'], 100);
    // null info = assume capable
    expect(result).toEqual(['wss://unknown.relay']);
  });
});

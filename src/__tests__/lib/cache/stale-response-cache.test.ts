/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: jest.fn().mockReturnValue({
    get: mockGet,
    set: mockSet,
  }),
}));

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Stale Response Cache', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGet.mockReset();
    mockSet.mockReset().mockResolvedValue(true);
  });

  test('storeResponse saves data with timestamp', async () => {
    const { storeResponse } = require('@/lib/cache/stale-response-cache');
    const data = { bills: [{ id: '1', title: 'Test Bill' }] };

    await storeResponse('test-endpoint', data, 'congress.gov');

    expect(mockSet).toHaveBeenCalledTimes(1);
    const [key, entry, ttl] = mockSet.mock.calls[0];
    expect(key).toBe('stale:response:test-endpoint');
    expect(entry.data).toEqual(data);
    expect(entry.source).toBe('congress.gov');
    expect(entry.fetchedAt).toBeDefined();
    expect(ttl).toBe(7 * 24 * 60 * 60);
  });

  test('getStaleResponse returns cached entry', async () => {
    const staleEntry = {
      data: { bills: [] },
      fetchedAt: '2025-02-20T10:00:00.000Z',
      source: 'congress.gov',
    };
    mockGet.mockResolvedValue(staleEntry);

    const { getStaleResponse } = require('@/lib/cache/stale-response-cache');
    const result = await getStaleResponse('test-endpoint');

    expect(result).toEqual(staleEntry);
    expect(mockGet).toHaveBeenCalledWith('stale:response:test-endpoint');
  });

  test('getStaleResponse returns null when no cached entry', async () => {
    mockGet.mockResolvedValue(null);

    const { getStaleResponse } = require('@/lib/cache/stale-response-cache');
    const result = await getStaleResponse('test-endpoint');

    expect(result).toBeNull();
  });

  test('fetchWithStaleFallback returns fresh data on success', async () => {
    const freshData = { bills: [{ id: '1' }] };

    const { fetchWithStaleFallback } = require('@/lib/cache/stale-response-cache');
    const result = await fetchWithStaleFallback(
      'test',
      () => Promise.resolve(freshData),
      'congress.gov'
    );

    expect(result).toEqual({ data: freshData, stale: false });
  });

  test('fetchWithStaleFallback returns stale data on failure', async () => {
    const staleEntry = {
      data: { bills: [] },
      fetchedAt: '2025-02-20T10:00:00.000Z',
      source: 'congress.gov',
    };
    mockGet.mockResolvedValue(staleEntry);

    const { fetchWithStaleFallback } = require('@/lib/cache/stale-response-cache');
    const result = await fetchWithStaleFallback(
      'test',
      () => Promise.reject(new Error('API down')),
      'congress.gov'
    );

    expect(result).toEqual({
      data: staleEntry.data,
      stale: true,
      staleSince: staleEntry.fetchedAt,
    });
  });

  test('fetchWithStaleFallback returns null when both fail', async () => {
    mockGet.mockResolvedValue(null);

    const { fetchWithStaleFallback } = require('@/lib/cache/stale-response-cache');
    const result = await fetchWithStaleFallback(
      'test',
      () => Promise.reject(new Error('API down')),
      'congress.gov'
    );

    expect(result).toBeNull();
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Regression tests for the empty-cache poisoning bug that took down
 * production representative search on 2026-05-12. A transient upstream
 * failure cached an empty array; the read-side `if (cached)` check
 * treated [] as truthy and every subsequent request served []. The fix
 * adds empty-result guards at both the cachedFetch helper and the
 * unifiedCache service so neither layer can be poisoned again.
 */

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockKeys = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: jest.fn().mockReturnValue({
    get: mockGet,
    set: mockSet,
    delete: mockDelete,
    keys: mockKeys,
    getStatus: jest.fn().mockReturnValue({ connected: true }),
    flush: jest.fn().mockResolvedValue(true),
    exists: jest.fn().mockResolvedValue(false),
  }),
}));

jest.mock('@/lib/monitoring/telemetry', () => ({
  monitorCache: jest.fn().mockReturnValue({
    end: jest.fn(),
  }),
}));

import { describe, test, expect, beforeEach } from '@jest/globals';

describe('Empty-result cache poisoning guard', () => {
  beforeEach(() => {
    jest.resetModules();
    mockGet.mockReset();
    mockSet.mockReset().mockResolvedValue(true);
    mockDelete.mockReset().mockResolvedValue(true);
    mockKeys.mockReset();
  });

  describe('cachedFetch (src/lib/cache.ts)', () => {
    test('treats an empty-array cache hit as a miss and refetches', async () => {
      // Simulate the poisoned cache state: an empty array was previously stored.
      mockGet.mockResolvedValue([]);
      const fetchFn = jest.fn().mockResolvedValue([{ id: 'A' }, { id: 'B' }]);

      const { cachedFetch } = require('@/lib/cache');
      const result = await cachedFetch('representatives-key', fetchFn, 3600);

      expect(fetchFn).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 'A' }, { id: 'B' }]);
    });

    test('skips the cache write when fetchFn returns an empty array', async () => {
      mockGet.mockResolvedValue(null);
      const fetchFn = jest.fn().mockResolvedValue([]);

      const { cachedFetch } = require('@/lib/cache');
      const result = await cachedFetch('representatives-key', fetchFn, 3600);

      expect(result).toEqual([]);
      expect(mockSet).not.toHaveBeenCalled();
    });

    test('returns a non-empty cached array (control case)', async () => {
      const cached = [{ id: 'A' }];
      mockGet.mockResolvedValue(cached);
      const fetchFn = jest.fn();

      const { cachedFetch } = require('@/lib/cache');
      const result = await cachedFetch('representatives-key', fetchFn, 3600);

      expect(fetchFn).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    test('caches a non-empty fetch result (control case)', async () => {
      mockGet.mockResolvedValue(null);
      const fresh = [{ id: 'A' }];
      const fetchFn = jest.fn().mockResolvedValue(fresh);

      const { cachedFetch } = require('@/lib/cache');
      const result = await cachedFetch('representatives-key', fetchFn, 3600);

      expect(result).toEqual(fresh);
      expect(mockSet).toHaveBeenCalledTimes(1);
      const [setKey, setValue] = mockSet.mock.calls[0];
      expect(setKey).toBe('representatives-key');
      expect(setValue).toEqual(fresh);
    });
  });

  describe('UnifiedCacheService (src/services/cache/unified-cache.service.ts)', () => {
    test('returns null and deletes the key when Redis holds an empty-array entry', async () => {
      const poisonedEntry = {
        data: [],
        timestamp: Date.now(),
        source: 'test',
        expiresAt: Date.now() + 60_000,
      };
      mockGet.mockResolvedValue(poisonedEntry);

      const { unifiedCache } = require('@/services/cache/unified-cache.service');
      const result = await unifiedCache.get('core:all-representatives');

      expect(result).toBeNull();
      // The poisoned entry should also be evicted so the next caller
      // doesn't pay the same redundant lookup cost.
      expect(mockDelete).toHaveBeenCalledWith('core:all-representatives');
    });

    test('skips both Redis and fallback writes when data is an empty array', async () => {
      const { unifiedCache } = require('@/services/cache/unified-cache.service');
      await unifiedCache.set('core:all-representatives', [], {
        dataType: 'representatives',
        source: 'test',
      });

      expect(mockSet).not.toHaveBeenCalled();

      // Confirm the fallback cache also did not record the empty value:
      // a subsequent get with Redis returning null should yield null.
      mockGet.mockResolvedValue(null);
      const after = await unifiedCache.get('core:all-representatives');
      expect(after).toBeNull();
    });

    test('returns the cached entry when data is non-empty (control case)', async () => {
      const entry = {
        data: [{ id: 'A' }],
        timestamp: Date.now(),
        source: 'test',
        expiresAt: Date.now() + 60_000,
      };
      mockGet.mockResolvedValue(entry);

      const { unifiedCache } = require('@/services/cache/unified-cache.service');
      const result = await unifiedCache.get('core:all-representatives');

      expect(result).toEqual([{ id: 'A' }]);
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });
});

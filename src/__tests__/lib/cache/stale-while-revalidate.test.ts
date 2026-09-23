/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * cachedStaleWhileRevalidate: fresh entries are served untouched, stale ones
 * are served while exactly one background refresh runs (after() + Redis lock),
 * and misses fetch inline. Fetch errors are never cached.
 */

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockDelete = jest.fn();
const mockSetIfAbsent = jest.fn();
const afterTasks: Array<() => Promise<void>> = [];

// Wrappers defer the mock lookups: the cache singleton calls getRedisCache()
// while the (hoisted) imports run, before the consts above are initialised.
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: (...args: unknown[]) => mockGet(...args),
    set: (...args: unknown[]) => mockSet(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
    setIfAbsent: (...args: unknown[]) => mockSetIfAbsent(...args),
    keys: async () => [],
    getStatus: () => ({ connected: true }),
  }),
}));

jest.mock('next/server', () => ({
  after: (task: () => Promise<void>) => {
    afterTasks.push(task);
  },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  cachedStaleWhileRevalidate,
  refreshStaleWhileRevalidate,
} from '@/services/cache/unified-cache.service';

const MINUTE = 60 * 1000;
const OPTIONS = { freshMs: 30 * MINUTE, maxStaleMs: 7 * 24 * 60 * MINUTE, source: 'test' };

function envelope(ageMs: number, data: unknown = { value: 'cached' }) {
  return { data, fetchedAt: Date.now() - ageMs, source: 'test' };
}

describe('cachedStaleWhileRevalidate', () => {
  beforeEach(() => {
    afterTasks.length = 0;
    mockGet.mockReset();
    mockSet.mockReset().mockResolvedValue(true);
    mockDelete.mockReset().mockResolvedValue(true);
    mockSetIfAbsent.mockReset().mockResolvedValue(true);
  });

  test('fresh: serves the cache without fetching or scheduling a refresh', async () => {
    mockGet.mockResolvedValue(envelope(5 * MINUTE));
    const fetcher = jest.fn(async () => ({ value: 'fresh' }));

    const result = await cachedStaleWhileRevalidate('k', fetcher, OPTIONS);

    expect(result.state).toBe('fresh');
    expect(result.data).toEqual({ value: 'cached' });
    expect(fetcher).not.toHaveBeenCalled();
    expect(afterTasks).toHaveLength(0);
  });

  test('stale: serves the cache, then refreshes once under a lock', async () => {
    mockGet.mockResolvedValue(envelope(2 * 60 * MINUTE));
    const fetcher = jest.fn(async () => ({ value: 'new' }));

    const result = await cachedStaleWhileRevalidate('k', fetcher, OPTIONS);

    expect(result.state).toBe('stale');
    expect(result.data).toEqual({ value: 'cached' });
    expect(fetcher).not.toHaveBeenCalled();
    expect(afterTasks).toHaveLength(1);

    await afterTasks[0]!();

    expect(mockSetIfAbsent).toHaveBeenCalledWith('k:swr-lock', '1', 120);
    expect(fetcher).toHaveBeenCalledTimes(1);
    const [key, written, ttl] = mockSet.mock.calls[0] as [string, { data: unknown }, number];
    expect(key).toBe('k');
    expect(written.data).toEqual({ value: 'new' });
    expect(ttl).toBe(7 * 24 * 60 * 60);
    expect(mockDelete).toHaveBeenCalledWith('k:swr-lock');
  });

  test('stale: skips the refresh when another instance holds the lock', async () => {
    mockGet.mockResolvedValue(envelope(2 * 60 * MINUTE));
    mockSetIfAbsent.mockResolvedValue(false);
    const fetcher = jest.fn(async () => ({ value: 'new' }));

    await cachedStaleWhileRevalidate('k', fetcher, OPTIONS);
    await afterTasks[0]!();

    expect(fetcher).not.toHaveBeenCalled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  test('stale: a failed background refresh keeps the old copy and releases the lock', async () => {
    mockGet.mockResolvedValue(envelope(2 * 60 * MINUTE));
    const fetcher = jest.fn(async () => {
      throw new Error('429');
    });

    await cachedStaleWhileRevalidate('k', fetcher, OPTIONS);
    await afterTasks[0]!();

    expect(mockSet).not.toHaveBeenCalled();
    expect(mockDelete).toHaveBeenCalledWith('k:swr-lock');
  });

  test("stale with staleMode 'refetch': fetches inline", async () => {
    mockGet.mockResolvedValue(envelope(2 * 60 * MINUTE));
    const fetcher = jest.fn(async () => ({ value: 'new' }));

    const result = await cachedStaleWhileRevalidate('k', fetcher, {
      ...OPTIONS,
      staleMode: 'refetch',
    });

    expect(result.state).toBe('miss');
    expect(result.data).toEqual({ value: 'new' });
    expect(afterTasks).toHaveLength(0);
  });

  test('miss: fetches inline and stores an envelope', async () => {
    mockGet.mockResolvedValue(null);
    const fetcher = jest.fn(async () => ({ value: 'new' }));

    const result = await cachedStaleWhileRevalidate('k', fetcher, OPTIONS);

    expect(result.state).toBe('miss');
    expect(result.data).toEqual({ value: 'new' });
    expect(mockSet).toHaveBeenCalledTimes(1);
  });

  test('miss: a fetch error propagates and nothing is cached', async () => {
    mockGet.mockResolvedValue(null);
    const fetcher = jest.fn(async () => {
      throw new Error('upstream down');
    });

    await expect(cachedStaleWhileRevalidate('k', fetcher, OPTIONS)).rejects.toThrow(
      'upstream down'
    );
    expect(mockSet).not.toHaveBeenCalled();
  });

  test('entries older than maxStaleMs are refetched inline', async () => {
    mockGet.mockResolvedValue(envelope(8 * 24 * 60 * MINUTE));
    const fetcher = jest.fn(async () => ({ value: 'new' }));

    const result = await cachedStaleWhileRevalidate('k', fetcher, OPTIONS);

    expect(result.state).toBe('miss');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('refreshStaleWhileRevalidate', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockSet.mockReset().mockResolvedValue(true);
    mockDelete.mockReset().mockResolvedValue(true);
    mockSetIfAbsent.mockReset().mockResolvedValue(true);
  });

  test('skips a fresh entry', async () => {
    mockGet.mockResolvedValue(envelope(MINUTE));
    const fetcher = jest.fn(async () => ({ value: 'new' }));

    await expect(refreshStaleWhileRevalidate('k', fetcher, OPTIONS)).resolves.toBe('fresh');
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('refreshes a stale entry and surfaces fetch errors', async () => {
    mockGet.mockResolvedValue(envelope(2 * 60 * MINUTE));
    await expect(
      refreshStaleWhileRevalidate('k', async () => ({ value: 'new' }), OPTIONS)
    ).resolves.toBe('refreshed');

    await expect(
      refreshStaleWhileRevalidate(
        'k',
        async () => {
          throw new Error('429');
        },
        OPTIONS
      )
    ).rejects.toThrow('429');
    expect(mockDelete).toHaveBeenLastCalledWith('k:swr-lock');
  });
});

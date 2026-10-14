/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 *
 * The bill page 404s on `not_found`. That outcome must come only from
 * Congress.gov's own 404; an outage or odd response is `unavailable`, and
 * neither miss may be cached in place of a real bill.
 *
 * A 429 anywhere in the fan-out must also make the whole lookup unavailable:
 * a bill whose cosponsors call was rate limited would otherwise be cached for
 * a day with zero cosponsors. And once Congress.gov has said 429, further
 * lookups skip it until the pause ends.
 */

import { lookupBill } from '@/lib/services/bill.service';
import { cachedFetch } from '@/lib/cache';
import { _resetForTesting } from '@/lib/services/congress-rate-limit';

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn(
    async (
      _key: string,
      fn: () => Promise<unknown>,
      _ttl: number,
      shouldCache: (data: unknown) => boolean
    ) => {
      const data = await fn();
      mockCacheWrites.push(shouldCache(data));
      return data;
    }
  ),
}));

const mockCacheWrites: boolean[] = [];
const mockRedis = new Map<string, unknown>();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: async (key: string) => mockRedis.get(key) ?? null,
    set: async (key: string, value: unknown) => {
      mockRedis.set(key, value);
      return true;
    },
  }),
}));

function respondWith(status: number, body: unknown = {}) {
  global.fetch = jest.fn(
    async () =>
      ({
        ok: status >= 200 && status < 300,
        status,
        url: 'https://api.congress.gov/v3/bill/119/hr/99999',
        json: async () => body,
      }) as Response
  );
}

describe('lookupBill outcomes', () => {
  beforeEach(() => {
    mockCacheWrites.length = 0;
    mockRedis.clear();
    _resetForTesting();
    (cachedFetch as jest.Mock).mockClear();
  });

  it('is not_found only when Congress.gov answers 404', async () => {
    respondWith(404, { error: 'No Bill matches the given query.' });
    await expect(lookupBill('119-hr-99999')).resolves.toEqual({ status: 'not_found' });
    expect(mockCacheWrites).toEqual([false]);
  });

  it.each([500, 503, 429])('is unavailable when Congress.gov answers %i', async status => {
    respondWith(status);
    await expect(lookupBill('119-hr-4')).resolves.toEqual({ status: 'unavailable' });
    expect(mockCacheWrites).toEqual([false]);
  });

  it('is unavailable when a 200 carries no bill', async () => {
    respondWith(200, {});
    await expect(lookupBill('119-hr-4')).resolves.toEqual({ status: 'unavailable' });
  });

  it('is unavailable when the request itself fails', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('ECONNRESET');
    });
    await expect(lookupBill('119-hr-4')).resolves.toEqual({ status: 'unavailable' });
  });

  it('is unavailable, and not cached, when only a sub-request is rate limited', async () => {
    global.fetch = jest.fn(
      async (url: string) =>
        ({
          ok: !url.includes('/cosponsors'),
          status: url.includes('/cosponsors') ? 429 : 200,
          url,
          headers: new Headers(url.includes('/cosponsors') ? { 'retry-after': '900' } : {}),
          json: async () => ({
            bill: { congress: 119, type: 'HR', number: '4', originChamber: 'House' },
          }),
        }) as unknown as Response
    ) as unknown as typeof fetch;

    await expect(lookupBill('119-hr-4')).resolves.toEqual({ status: 'unavailable' });
    expect(mockCacheWrites).toEqual([false]);
  });

  it('skips Congress.gov entirely after a 429 until the pause ends', async () => {
    respondWith(429);
    await expect(lookupBill('119-hr-4')).resolves.toEqual({ status: 'unavailable' });

    // A fresh instance learns of the pause from Redis, not its own memory.
    _resetForTesting();
    respondWith(200, { bill: { congress: 119, type: 'HR', number: '5' } });
    await expect(lookupBill('119-hr-5')).resolves.toEqual({ status: 'unavailable' });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * The bill page 404s on `not_found`. That outcome must come only from
 * Congress.gov's own 404; an outage or odd response is `unavailable`, and
 * neither miss may be cached in place of a real bill.
 */

import { lookupBill } from '@/lib/services/bill.service';
import { cachedFetch } from '@/lib/cache';

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
});

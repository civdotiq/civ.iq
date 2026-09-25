/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

import { fetchDistrictBiography, isRetryableStatus } from '@/lib/api/wikipedia';

describe('Wikipedia fetch retry policy', () => {
  it('retries only rate limits and server errors', () => {
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(503)).toBe(true);
  });

  it('does not retry a missing district article (was ~7s of backoff per page)', async () => {
    const calls: string[] = [];
    global.fetch = jest.fn(async (url: string | URL) => {
      calls.push(String(url));
      if (String(url).includes('opensearch')) {
        return { ok: true, status: 200, json: async () => ['q', [], [], []] };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    }) as unknown as typeof fetch;

    const started = Date.now();
    const bio = await fetchDistrictBiography('Michigan', 1, 'lower');

    expect(bio).toBeNull();
    expect(calls.filter(u => u.includes('/page/summary/'))).toHaveLength(1);
    expect(Date.now() - started).toBeLessThan(500);
  }, 15000);
});

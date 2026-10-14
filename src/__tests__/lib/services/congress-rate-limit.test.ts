/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 *
 * A Congress.gov 429 pauses upstream calls for Retry-After seconds (clamped
 * to 1–60 minutes), shared through Redis, and the pause ends on its own.
 */

import {
  CongressRateLimitError,
  _resetForTesting,
  isCongressRateLimited,
  throwIfCongressRateLimited,
} from '@/lib/services/congress-rate-limit';

const mockSets: Array<{ key: string; value: unknown; ttl: number }> = [];
const mockRedis = new Map<string, unknown>();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: async (key: string) => mockRedis.get(key) ?? null,
    set: async (key: string, value: unknown, ttl: number) => {
      mockSets.push({ key, value, ttl });
      mockRedis.set(key, value);
      return true;
    },
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const response = (status: number, retryAfter?: string) =>
  ({
    status,
    headers: new Headers(retryAfter ? { 'retry-after': retryAfter } : {}),
  }) as Response;

beforeEach(() => {
  mockSets.length = 0;
  mockRedis.clear();
  _resetForTesting();
});

describe('Congress.gov rate-limit breaker', () => {
  it('lets non-429 responses through without setting the flag', async () => {
    await expect(throwIfCongressRateLimited(response(200))).resolves.toBeUndefined();
    await expect(throwIfCongressRateLimited(response(500))).resolves.toBeUndefined();
    expect(mockSets).toEqual([]);
    await expect(isCongressRateLimited()).resolves.toBe(false);
  });

  it.each([
    ['1730', 1730],
    ['5', 60],
    ['99999', 3600],
    [undefined, 600],
    ['soon', 600],
  ])('pauses for Retry-After %s as %i seconds', async (retryAfter, seconds) => {
    await expect(throwIfCongressRateLimited(response(429, retryAfter))).rejects.toBeInstanceOf(
      CongressRateLimitError
    );
    expect(mockSets).toHaveLength(1);
    expect(mockSets[0]?.key).toBe('congress:rate-limited');
    expect(mockSets[0]?.ttl).toBe(seconds);
  });

  it('ends the pause once its time has passed', async () => {
    await expect(throwIfCongressRateLimited(response(429, '120'))).rejects.toThrow();
    const until = mockSets[0]?.value as number;

    await expect(isCongressRateLimited(until - 1)).resolves.toBe(true);
    _resetForTesting();
    await expect(isCongressRateLimited(until + 1)).resolves.toBe(false);
  });
});

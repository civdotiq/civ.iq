/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Fundraising index reader: current-cycle rows only, malformed rows skipped,
 * an unreadable Redis is null (never an empty index), one read per 5 minutes.
 */

const mockHashGetAll = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ hashGetAll: (...args: unknown[]) => mockHashGetAll(...args) }),
}));

jest.mock('@/lib/fec/election-cycle', () => ({
  getCurrentElectionCycle: () => 2026,
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getFundraisingIndex, resetFundraisingIndexMemo } from '@/features/record-card/money-index';

const row = (o: Record<string, unknown>) =>
  JSON.stringify({ cycle: 2026, asOf: '2026-09-25T00:00:00Z', coverageEnd: null, ...o });

beforeEach(() => {
  resetFundraisingIndexMemo();
  mockHashGetAll.mockReset();
});

describe('getFundraisingIndex', () => {
  test('keeps current-cycle ok and none rows; drops stale and malformed rows', async () => {
    mockHashGetAll.mockResolvedValue({
      A000001: row({ raised: 1500, status: 'ok', coverageEnd: '2026-06-30' }),
      A000002: row({ raised: null, status: 'none' }),
      A000003: row({ raised: 900, status: 'ok', cycle: 2024 }),
      A000004: '{not json',
      A000005: row({ raised: 0, status: 'ok' }),
    });
    const index = await getFundraisingIndex();
    expect(index?.cycle).toBe(2026);
    expect([...(index?.entries.keys() ?? [])]).toEqual(['A000001', 'A000002']);
    expect(index?.entries.get('A000001')).toMatchObject({
      raised: 1500,
      coverageEnd: '2026-06-30',
    });
    expect(index?.entries.get('A000002')).toMatchObject({ raised: null, status: 'none' });
  });

  test('an unreadable Redis is null, not an empty index', async () => {
    mockHashGetAll.mockResolvedValue(null);
    await expect(getFundraisingIndex()).resolves.toBeNull();
  });

  test('a Redis error is null, never a thrown search failure', async () => {
    mockHashGetAll.mockRejectedValue(new Error('ECONNRESET'));
    await expect(getFundraisingIndex()).resolves.toBeNull();
  });

  test('a burst of searches costs one Redis read', async () => {
    mockHashGetAll.mockResolvedValue({});
    await getFundraisingIndex();
    await getFundraisingIndex();
    expect(mockHashGetAll).toHaveBeenCalledTimes(1);
  });
});

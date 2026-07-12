/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    exists: jest.fn().mockResolvedValue(false),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect } from '@jest/globals';
import { currentHouseSession, detectVoteEvents } from '../vote-detector';

describe('currentHouseSession', () => {
  test('even years are session 2', () => {
    expect(currentHouseSession(new Date('2026-07-12T00:00:00Z'))).toBe(2);
  });

  test('odd years are session 1', () => {
    expect(currentHouseSession(new Date('2025-03-01T00:00:00Z'))).toBe(1);
  });
});

describe('detectVoteEvents', () => {
  test('returns empty array when API key missing', async () => {
    const saved = process.env.CONGRESS_API_KEY;
    delete process.env.CONGRESS_API_KEY;
    try {
      expect(await detectVoteEvents()).toEqual([]);
    } finally {
      if (saved) process.env.CONGRESS_API_KEY = saved;
    }
  });
});

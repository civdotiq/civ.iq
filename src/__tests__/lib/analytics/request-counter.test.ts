/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Request Counter Tests
 *
 * Tests path normalization logic and fire-and-forget counter behavior.
 * Redis operations are mocked since we can't rely on Upstash in tests.
 */

// We need to test the normalizePath function which is private.
// We'll test it indirectly through incrementRequestCounter behavior,
// and directly by importing the module and checking key patterns.

// Mock @upstash/redis before importing
const mockIncr = jest.fn().mockResolvedValue(1);
const mockExpire = jest.fn().mockResolvedValue(true);
const mockKeys = jest.fn().mockResolvedValue([]);
const mockGet = jest.fn().mockResolvedValue(null);
const mockMget = jest.fn().mockResolvedValue([]);

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
    keys: mockKeys,
    get: mockGet,
    mget: mockMget,
  })),
}));

// Set env vars before importing the module
process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io';
process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';

import { incrementRequestCounter, getRequestCounts } from '@/lib/analytics/request-counter';

describe('Request Counter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('incrementRequestCounter()', () => {
    it('should call Redis INCR with formatted key', () => {
      incrementRequestCounter('/api/v1/representatives', 'GET', 200);

      expect(mockIncr).toHaveBeenCalledTimes(1);
      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toMatch(
        /^analytics:requests:\d{4}-\d{2}-\d{2}:\/api\/v1\/representatives:GET:200$/
      );
    });

    it('should set TTL on first increment (value = 1)', async () => {
      mockIncr.mockResolvedValueOnce(1);
      incrementRequestCounter('/api/v1/bills', 'GET', 200);

      // Let the promise chain resolve
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockExpire).toHaveBeenCalledTimes(1);
      // TTL should be 30 days in seconds
      const ttl = mockExpire.mock.calls[0]![1] as number;
      expect(ttl).toBe(30 * 24 * 60 * 60);
    });

    it('should NOT set TTL on subsequent increments (value > 1)', async () => {
      mockIncr.mockResolvedValueOnce(5);
      incrementRequestCounter('/api/v1/bills', 'GET', 200);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockExpire).not.toHaveBeenCalled();
    });

    it('should normalize bioguide IDs in path', () => {
      incrementRequestCounter('/api/v1/representatives/P000197', 'GET', 200);

      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toContain('/api/v1/representatives/:id');
      expect(key).not.toContain('P000197');
    });

    it('should normalize bill IDs in path', () => {
      incrementRequestCounter('/api/v1/bills/119-hr-1', 'GET', 200);

      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toContain('/api/v1/bills/:billId');
      expect(key).not.toContain('119-hr-1');
    });

    it('should normalize district IDs in path', () => {
      incrementRequestCounter('/api/v1/districts/MI-12', 'GET', 200);

      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toContain('/api/v1/districts/:districtId');
      expect(key).not.toContain('MI-12');
    });

    it('should normalize vote IDs in path', () => {
      incrementRequestCounter('/api/v1/votes/house-119-116', 'GET', 200);

      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toContain('/api/v1/votes/:voteId');
      expect(key).not.toContain('house-119-116');
    });

    it('should not throw on Redis errors', () => {
      mockIncr.mockRejectedValueOnce(new Error('Redis down'));
      expect(() => {
        incrementRequestCounter('/api/v1/representatives', 'GET', 500);
      }).not.toThrow();
    });

    it('should include status code in key', () => {
      incrementRequestCounter('/api/v1/representatives', 'GET', 404);

      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toMatch(/:404$/);
    });

    it('should include HTTP method in key', () => {
      incrementRequestCounter('/api/v1/representatives', 'POST', 200);

      const key = mockIncr.mock.calls[0]![0] as string;
      expect(key).toContain(':POST:');
    });
  });

  describe('getRequestCounts()', () => {
    it('should return empty object when no keys found', async () => {
      mockKeys.mockResolvedValue([]);
      const counts = await getRequestCounts('2025-01-01', '2025-01-01');
      expect(counts).toEqual({});
    });

    it('should aggregate counts by path', async () => {
      mockKeys.mockResolvedValue([
        'analytics:requests:2025-01-01:/api/v1/representatives:GET:200',
        'analytics:requests:2025-01-01:/api/v1/bills:GET:200',
      ]);
      mockMget.mockResolvedValueOnce([42, 18]);

      const counts = await getRequestCounts('2025-01-01', '2025-01-01');
      expect(counts['/api/v1/representatives']).toBe(42);
      expect(counts['/api/v1/bills']).toBe(18);
    });

    it('reads a day in one batch rather than one call per key', async () => {
      const keys = Array.from(
        { length: 120 },
        (_, i) => `analytics:requests:2025-01-01:/api/v1/bills/${i}:GET:200`
      );
      mockKeys.mockResolvedValue(keys);
      mockMget.mockResolvedValueOnce(keys.map(() => 1));

      await getRequestCounts('2025-01-01', '2025-01-01');

      // One MGET for the whole day, and no per-key GET. The old loop issued
      // 120 sequential round-trips for this same data.
      expect(mockMget).toHaveBeenCalledTimes(1);
      expect(mockMget).toHaveBeenCalledWith(keys);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should handle multi-day ranges', async () => {
      // Day 1
      mockKeys
        .mockResolvedValueOnce(['analytics:requests:2025-01-01:/api/v1/bills:GET:200'])
        .mockResolvedValueOnce(['analytics:requests:2025-01-02:/api/v1/bills:GET:200']);
      mockMget.mockResolvedValueOnce([10]).mockResolvedValueOnce([20]);

      const counts = await getRequestCounts('2025-01-01', '2025-01-02');
      expect(counts['/api/v1/bills']).toBe(30);
    });

    it('should skip dates with Redis errors', async () => {
      mockKeys.mockRejectedValueOnce(new Error('timeout'));
      const counts = await getRequestCounts('2025-01-01', '2025-01-01');
      expect(counts).toEqual({});
    });
  });
});

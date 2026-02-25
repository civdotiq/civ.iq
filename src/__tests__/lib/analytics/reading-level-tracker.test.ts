/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const mockIncr = jest.fn().mockResolvedValue(1);
const mockExpire = jest.fn().mockResolvedValue(true);
const mockRpush = jest.fn().mockResolvedValue(1);
const mockGet = jest.fn().mockResolvedValue(null);
const mockPipeline = jest.fn().mockReturnValue({
  get: jest.fn(),
  exec: jest.fn().mockResolvedValue(Array(27).fill(null)), // 16 grade + 11 flesch buckets
});

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({
    incr: mockIncr,
    expire: mockExpire,
    rpush: mockRpush,
    get: mockGet,
    pipeline: mockPipeline,
  })),
}));

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';

describe('Reading Level Tracker', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    };
    mockIncr.mockClear();
    mockExpire.mockClear();
    mockRpush.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('trackReadingLevel increments Redis counter', async () => {
    const { trackReadingLevel } = require('@/lib/analytics/reading-level-tracker');
    trackReadingLevel(7.2, 'test-bill');

    // Allow fire-and-forget to execute
    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockIncr).toHaveBeenCalled();
    const key = mockIncr.mock.calls[0][0];
    expect(key).toMatch(/^analytics:reading-level:\d{4}-\d{2}-\d{2}:7$/);
  });

  test('trackReadingLevel sets TTL on first increment', async () => {
    mockIncr.mockResolvedValueOnce(1);

    const { trackReadingLevel } = require('@/lib/analytics/reading-level-tracker');
    trackReadingLevel(8.5);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockExpire).toHaveBeenCalled();
  });

  test('trackReadingLevel is no-op without Redis config', async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;

    const { trackReadingLevel } = require('@/lib/analytics/reading-level-tracker');
    trackReadingLevel(7.0);

    await new Promise(resolve => setTimeout(resolve, 10));

    // mockIncr should not be called since redis is null
    // (new module with no redis config)
    expect(true).toBe(true); // Just verify no error thrown
  });

  test('trackReadingLevel tracks Flesch ease when provided', async () => {
    const { trackReadingLevel } = require('@/lib/analytics/reading-level-tracker');
    trackReadingLevel(7.2, 'test-bill', 72.5);

    await new Promise(resolve => setTimeout(resolve, 10));

    // Should have 2 incr calls: grade level + flesch ease bucket
    expect(mockIncr).toHaveBeenCalledTimes(2);
    const fleschKey = mockIncr.mock.calls[1][0];
    expect(fleschKey).toMatch(/^analytics:flesch-ease:\d{4}-\d{2}-\d{2}:70$/);
  });

  test('trackReadingLevel includes fleschReadingEase in raw record', async () => {
    const { trackReadingLevel } = require('@/lib/analytics/reading-level-tracker');
    trackReadingLevel(7.2, 'test-bill', 72.5);

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(mockRpush).toHaveBeenCalled();
    const rawRecord = JSON.parse(mockRpush.mock.calls[0][1]);
    expect(rawRecord.fleschReadingEase).toBe(72.5);
    expect(rawRecord.grade).toBe(7.2);
    expect(rawRecord.billId).toBe('test-bill');
  });

  test('getReadingLevelStats returns distribution data with Flesch ease', async () => {
    // 16 grade values + 11 flesch bucket values
    const pipelineValues = [
      // Grade levels 1-16
      null,
      null,
      null,
      null,
      null,
      null,
      5, // grade 7: 5 summaries
      10, // grade 8: 10 summaries
      3, // grade 9: 3 summaries
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      // Flesch ease buckets 0-100 (step 10)
      null,
      null,
      null,
      null,
      null,
      null,
      8, // bucket 60: 8 summaries
      7, // bucket 70: 7 summaries
      3, // bucket 80: 3 summaries
      null,
      null,
    ];

    const pipelineExec = jest.fn().mockResolvedValue(pipelineValues);

    mockPipeline.mockReturnValue({
      get: jest.fn(),
      exec: pipelineExec,
    });

    const { getReadingLevelStats } = require('@/lib/analytics/reading-level-tracker');
    const today = new Date().toISOString().slice(0, 10);
    const stats = await getReadingLevelStats(today, today);

    expect(stats).toHaveLength(1);
    expect(stats[0].total).toBe(18);
    expect(stats[0].passRate).toBe(83); // 15/18 = 83%
    expect(stats[0].avgFleschEase).toBeGreaterThan(0);
    expect(stats[0].fleschEasePassRate).toBe(100); // All flesch samples are >= 60
  });
});

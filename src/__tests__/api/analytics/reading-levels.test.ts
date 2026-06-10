/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@/lib/analytics/reading-level-tracker', () => ({
  getReadingLevelStats: jest.fn().mockResolvedValue([]),
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('GET /api/analytics/reading-levels', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('returns aggregate stats with empty data', async () => {
    const { GET } = require('@/app/api/analytics/reading-levels/route');
    const request = new NextRequest('http://localhost:3000/api/analytics/reading-levels');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.aggregate.totalSummaries).toBe(0);
    expect(data.aggregate.targetGrade).toBe(8);
    expect(data.aggregate.avgFleschEase).toBe(0);
    expect(data.aggregate.fleschEaseTarget).toBe(60);
    expect(data.metadata.endpoint).toBe('/api/analytics/reading-levels');
  });

  test('returns daily stats when data exists', async () => {
    const { getReadingLevelStats } = require('@/lib/analytics/reading-level-tracker');
    getReadingLevelStats.mockResolvedValue([
      {
        date: '2025-02-20',
        distribution: { 7: 5, 8: 10, 9: 3 },
        total: 18,
        avgGrade: 7.9,
        passRate: 83,
        avgFleschEase: 68.5,
        fleschEasePassRate: 90,
      },
    ]);

    const { GET } = require('@/app/api/analytics/reading-levels/route');
    const request = new NextRequest('http://localhost:3000/api/analytics/reading-levels');
    const response = await GET(request);
    const data = await response.json();

    expect(data.daily).toHaveLength(1);
    expect(data.aggregate.totalSummaries).toBe(18);
    expect(data.aggregate.avgGradeLevel).toBe(7.9);
    expect(data.aggregate.avgFleschEase).toBeGreaterThan(0);
    expect(data.aggregate.fleschEaseTarget).toBe(60);
  });

  test('returns 503 error envelope when stats lookup fails', async () => {
    const { getReadingLevelStats } = require('@/lib/analytics/reading-level-tracker');
    getReadingLevelStats.mockRejectedValueOnce(new Error('Redis down'));

    const { GET } = require('@/app/api/analytics/reading-levels/route');
    const request = new NextRequest('http://localhost:3000/api/analytics/reading-levels');
    const response = await GET(request);
    const data = await response.json();

    // Failures must not fabricate zeroed aggregates as a 200
    expect(response.status).toBe(503);
    expect(data.error).toBe('Failed to load reading level analytics');
    expect(data.aggregate).toBeUndefined();
  });

  test('respects custom date range', async () => {
    const { GET } = require('@/app/api/analytics/reading-levels/route');
    const request = new NextRequest(
      'http://localhost:3000/api/analytics/reading-levels?startDate=2025-01-01&endDate=2025-01-31'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.dateRange.startDate).toBe('2025-01-01');
    expect(data.dateRange.endDate).toBe('2025-01-31');
  });
});

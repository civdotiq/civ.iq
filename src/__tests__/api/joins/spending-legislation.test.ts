/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/* eslint-disable @typescript-eslint/no-require-imports */

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { NextRequest } from 'next/server';

describe('GET /api/spending/awards/legislation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns 400 when no query params provided', async () => {
    const { GET } = require('@/app/api/spending/awards/legislation/route');
    const request = new NextRequest('http://localhost:3000/api/spending/awards/legislation');
    const response = await GET(request);
    expect(response.status).toBe(400);
  });

  test('returns legislation for agency slug', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          bills: [
            {
              congress: 119,
              type: 'HR',
              number: 100,
              title: 'Department of Defense Appropriations Act',
              policyArea: { name: 'Armed Forces and National Security' },
              latestAction: { actionDate: '2025-01-15', text: 'Appropriations committee' },
              url: 'https://congress.gov/bill/119/hr/100',
            },
          ],
        }),
    });

    const { GET } = require('@/app/api/spending/awards/legislation/route');
    const request = new NextRequest(
      'http://localhost:3000/api/spending/awards/legislation?agency=department-of-defense'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.metadata.joinType).toBe('spending-legislation');
    expect(data.query.agencySlug).toBe('department-of-defense');
  });

  test('returns legislation for keyword search', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          bills: [
            {
              congress: 119,
              type: 'S',
              number: 50,
              title: 'Clean Energy Investment Act',
              policyArea: { name: 'Energy' },
              url: 'https://congress.gov/bill/119/s/50',
            },
          ],
        }),
    });

    const { GET } = require('@/app/api/spending/awards/legislation/route');
    const request = new NextRequest(
      'http://localhost:3000/api/spending/awards/legislation?keywords=energy'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.query.keywords).toBe('energy');
  });

  test('includes metadata with data sources', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bills: [] }),
    });

    const { GET } = require('@/app/api/spending/awards/legislation/route');
    const request = new NextRequest(
      'http://localhost:3000/api/spending/awards/legislation?agency=department-of-defense'
    );
    const response = await GET(request);
    const data = await response.json();

    expect(data.metadata.dataSources).toContain('congress.gov');
    expect(data.metadata.generatedAt).toBeDefined();
  });
});

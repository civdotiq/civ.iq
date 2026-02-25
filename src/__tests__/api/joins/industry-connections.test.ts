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

describe('GET /api/industry/[sector]/connections', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-key' };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns 400 for unknown sector', async () => {
    const { GET } = require('@/app/api/industry/[sector]/connections/route');
    const request = new NextRequest('http://localhost:3000/api/industry/nonexistent/connections');
    const response = await GET(request, {
      params: Promise.resolve({ sector: 'nonexistent' }),
    });
    expect(response.status).toBe(400);
  });

  test('returns connections for Defense sector', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          bills: [
            {
              congress: 119,
              type: 'HR',
              number: 200,
              title: 'National Defense Authorization Act',
              policyArea: { name: 'Armed Forces and National Security' },
              url: 'https://congress.gov/bill/119/hr/200',
            },
          ],
        }),
    });

    const { GET } = require('@/app/api/industry/[sector]/connections/route');
    const request = new NextRequest('http://localhost:3000/api/industry/Defense/connections');
    const response = await GET(request, {
      params: Promise.resolve({ sector: 'Defense' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sector).toBe('Defense');
    expect(data.relatedPolicyAreas.length).toBeGreaterThan(0);
    expect(data.metadata.joinType).toBe('industry-connections');
  });

  test('returns connections for Energy sector', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bills: [] }),
    });

    const { GET } = require('@/app/api/industry/[sector]/connections/route');
    const request = new NextRequest(
      'http://localhost:3000/api/industry/energy%2Fnatural%20resources/connections'
    );
    const response = await GET(request, {
      params: Promise.resolve({ sector: 'energy%2Fnatural%20resources' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.sector).toBe('Energy/Natural Resources');
  });

  test('includes committees in response', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ bills: [] }),
    });

    const { GET } = require('@/app/api/industry/[sector]/connections/route');
    const request = new NextRequest('http://localhost:3000/api/industry/Defense/connections');
    const response = await GET(request, {
      params: Promise.resolve({ sector: 'Defense' }),
    });
    const data = await response.json();

    expect(Array.isArray(data.committees)).toBe(true);
    expect(Array.isArray(data.relatedAgencies)).toBe(true);
  });
});

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

describe('GET /api/regulations/[documentNumber]/hearings', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    mockFetch.mockReset();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test('returns 400 when document number is missing', async () => {
    const { GET } = require('@/app/api/regulations/[documentNumber]/hearings/route');
    const request = new NextRequest('http://localhost:3000/api/regulations//hearings');
    const response = await GET(request, { params: Promise.resolve({ documentNumber: '' }) });
    expect(response.status).toBe(400);
  });

  test('returns regulation hearings with metadata', async () => {
    // Mock Federal Register response
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('federalregister.gov')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              count: 1,
              results: [
                {
                  document_number: '2025-01234',
                  title: 'Clean Air Standards for Power Plants',
                  abstract: 'Updating emissions standards',
                  agencies: [
                    {
                      name: 'Environmental Protection Agency',
                      slug: 'environmental-protection-agency',
                    },
                  ],
                  html_url: 'https://federalregister.gov/d/2025-01234',
                },
              ],
            }),
        });
      }
      // Mock GovInfo response
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            packages: [
              {
                packageId: 'CHRG-119-test',
                title: 'Hearing on Clean Air Standards and Power Plant Emissions',
                congress: '119',
                docClass: 'S',
                dateIssued: '2025-01-10',
              },
            ],
          }),
      });
    });

    const { GET } = require('@/app/api/regulations/[documentNumber]/hearings/route');
    const request = new NextRequest('http://localhost:3000/api/regulations/2025-01234/hearings');
    const response = await GET(request, {
      params: Promise.resolve({ documentNumber: '2025-01234' }),
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.documentNumber).toBe('2025-01234');
    expect(data.regulationTitle).toContain('Clean Air');
    expect(data.metadata.joinType).toBe('regulation-hearings');
    expect(data.metadata.dataSources).toContain('federalregister.gov');
  });

  test('returns degraded when regulation not found', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ count: 0, results: [] }),
    });

    const { GET } = require('@/app/api/regulations/[documentNumber]/hearings/route');
    const request = new NextRequest('http://localhost:3000/api/regulations/2025-99999/hearings');
    const response = await GET(request, {
      params: Promise.resolve({ documentNumber: '2025-99999' }),
    });
    const data = await response.json();

    expect(data.metadata.dataQuality).toBe('degraded');
    expect(data.hearings).toHaveLength(0);
  });
});

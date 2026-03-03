/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * District Feed Enrichment Tests
 *
 * Tests that the district feed integrates cached district impact entries.
 */

// Mock next/server — define classes inside factory (jest.mock is hoisted)
jest.mock('next/server', () => {
  class _NextResponse {
    body: string | null;
    status: number;
    headers: Headers;

    constructor(
      body?: string | null,
      init?: { status?: number; headers?: Record<string, string> }
    ) {
      this.body = body ?? null;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    async text() {
      return this.body ?? '';
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new _NextResponse(JSON.stringify(data), init);
    }
  }

  class _NextRequest {
    url: string;
    method: string;
    headers: Headers;
    nextUrl: URL;

    constructor(
      urlInput: string | URL,
      init?: { method?: string; headers?: Record<string, string> }
    ) {
      this.url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      this.method = init?.method ?? 'GET';
      this.headers = new Headers(init?.headers);
      this.nextUrl = new URL(this.url);
    }
  }

  return { NextResponse: _NextResponse, NextRequest: _NextRequest };
});

import type { NextRequest } from 'next/server';

const mockGetAllEnhancedRepresentatives = jest.fn();
const mockGetCachedDistrictImpactEntries = jest.fn();

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: (...args: unknown[]) => mockGetAllEnhancedRepresentatives(...args),
}));

jest.mock('@/lib/feeds/district-impact-feed-helper', () => ({
  getCachedDistrictImpactEntries: (...args: unknown[]) =>
    mockGetCachedDistrictImpactEntries(...args),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

import { GET } from '@/app/api/feed/district/[districtId]/route';

const MOCK_REPS = [
  {
    bioguideId: 'D000197',
    name: 'Diana DeGette',
    party: 'D',
    state: 'CO',
    district: '1',
    chamber: 'House',
    title: 'Representative',
    currentTerm: { start: '2023-01-03', end: '2025-01-03' },
    committees: [{ name: 'Energy and Commerce', role: 'Member' }],
  },
  {
    bioguideId: 'B000944',
    name: 'John Hickenlooper',
    party: 'D',
    state: 'CO',
    chamber: 'Senate',
    title: 'Senator',
    currentTerm: { start: '2023-01-03', end: '2029-01-03' },
    committees: [],
  },
];

function makeRequest(
  districtId: string
): [NextRequest, { params: Promise<{ districtId: string }> }] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest: NR } = require('next/server');
  return [
    new NR(`https://civdotiq.org/api/feed/district/${districtId}`) as NextRequest,
    { params: Promise.resolve({ districtId }) },
  ];
}

describe('District Feed Enrichment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAllEnhancedRepresentatives.mockResolvedValue(MOCK_REPS);
    mockGetCachedDistrictImpactEntries.mockResolvedValue([]);
  });

  it('should return valid Atom XML', async () => {
    const response = await GET(...makeRequest('CO-01'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toContain('application/atom+xml');

    const xml = await response.text();
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
  });

  it('should include selfLink in feed', async () => {
    const response = await GET(...makeRequest('CO-01'));
    const xml = await response.text();
    expect(xml).toContain('rel="self"');
    expect(xml).toContain('/api/feed/district/CO-01');
  });

  describe('district impact entries', () => {
    it('should include district impact entries from cache', async () => {
      mockGetCachedDistrictImpactEntries.mockResolvedValue([
        {
          id: 'https://civdotiq.org/districts/CO-01#impact-119-hr-1',
          title: 'Bill Impact: 119-hr-1 — High',
          link: 'https://civdotiq.org/bill/119-hr-1',
          updated: new Date('2025-06-01'),
          summary: 'Major infrastructure investment',
          categories: [
            { term: 'district-impact', label: 'District Impact' },
            { term: 'high', label: 'High' },
          ],
        },
      ]);

      const response = await GET(...makeRequest('CO-01'));
      const xml = await response.text();

      expect(xml).toContain('term="district-impact"');
      expect(xml).toContain('Bill Impact: 119-hr-1');
    });

    it('should degrade gracefully when impacts fail', async () => {
      mockGetCachedDistrictImpactEntries.mockRejectedValue(new Error('Redis down'));

      const response = await GET(...makeRequest('CO-01'));
      expect(response.status).toBe(200);

      const xml = await response.text();
      expect(xml).toContain('<entry>');
      // Feed still has representative entries
      expect(xml).toContain('Diana DeGette');
    });

    it('should call getCachedDistrictImpactEntries with uppercase districtId', async () => {
      await GET(...makeRequest('co-01'));
      expect(mockGetCachedDistrictImpactEntries).toHaveBeenCalledWith('CO-01', expect.any(String));
    });
  });

  describe('validation', () => {
    it('should return 400 for invalid district format', async () => {
      const response = await GET(...makeRequest('INVALID'));
      expect(response.status).toBe(400);
    });
  });
});

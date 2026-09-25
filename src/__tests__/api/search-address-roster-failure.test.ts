/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/search/route';

jest.mock('@/lib/cache', () => ({
  cache: { get: jest.fn(() => Promise.resolve(null)), set: jest.fn(() => Promise.resolve(true)) },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/server-url', () => ({ getServerBaseUrl: () => 'http://localhost' }));

jest.mock('@/lib/data-sources/member-sponsored-counts/load', () => ({
  getMemberSponsoredCounts: () => Promise.resolve(null),
}));

jest.mock('@/features/record-card/money-index', () => ({
  getFundraisingIndex: () => Promise.resolve(null),
}));

// The bulk roster is down; the committee roster is fine.
jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn(() => Promise.reject(new Error('roster down'))),
  getCommitteeNamesByMember: jest.fn(() => Promise.resolve(new Map())),
}));

jest.mock('@/lib/census-geocoder', () => ({
  ...jest.requireActual('@/lib/census-geocoder'),
  geocodeAddress: jest.fn(() => Promise.resolve([{}])),
  extractDistrictFromResult: jest.fn(() => ({
    state: 'MI',
    district: '13',
    fullDistrict: 'MI-13',
  })),
}));

interface Body {
  data: { results: Array<{ bioguideId: string; raisedThisCycle: number | null }> };
}

async function search(q: string): Promise<{ status: number; body: Body }> {
  const res = await GET(new NextRequest(`http://localhost/api/search?q=${encodeURIComponent(q)}`));
  return { status: res.status, body: (await res.json()) as Body };
}

describe('/api/search address search when the roster fails', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    const zipBody = {
      data: {
        representatives: [
          {
            bioguideId: 'T000488',
            name: 'Tlaib',
            party: 'Democrat',
            state: 'MI',
            chamber: 'House',
          },
        ],
      },
    };
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve(zipBody) })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('the ZIP path still returns its own reps, with unknown lookups', async () => {
    const { status, body } = await search('48201');
    expect(status).toBe(200);
    expect(body.data.results.map(r => r.bioguideId)).toEqual(['T000488']);
    expect(body.data.results[0]?.raisedThisCycle).toBeNull();
  });

  it('the geocode path finds nobody instead of failing', async () => {
    const { status, body } = await search('123 Main St, Detroit, MI');
    expect(status).toBe(200);
    expect(body.data.results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

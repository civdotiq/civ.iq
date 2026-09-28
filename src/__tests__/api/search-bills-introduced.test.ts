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

jest.mock('@/lib/data/congressional-constants', () => ({
  getCurrentCongressNumber: () => 119,
}));

const rep = (bioguideId: string, name: string) => ({
  bioguideId,
  name,
  party: 'Democrat',
  state: 'MI',
  district: '1',
  chamber: 'House',
  yearsInOffice: 2,
});

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn(() =>
    Promise.resolve([rep('A000001', 'Alpha'), rep('B000002', 'Bravo'), rep('C000003', 'Charlie')])
  ),
  getCommitteeNamesByMember: jest.fn(() => Promise.resolve(new Map())),
}));

jest.mock('@/features/record-card/money-index', () => ({
  getFundraisingIndex: () => Promise.resolve(null),
}));

const mockCounts = jest.fn();
jest.mock('@/lib/data-sources/member-sponsored-counts/load', () => ({
  getMemberSponsoredCounts: () => mockCounts(),
}));

const corpus = {
  congress: 119,
  generatedAt: '2026-09-25T00:00:00.000Z',
  staleAfter: '2026-10-16',
  sources: [],
  // C000003 sponsored nothing, so the corpus omits them: a real zero.
  counts: {
    A000001: { introduced: 12, byType: { hr: 12 } },
    B000002: { introduced: 3, byType: { hr: 2, hres: 1 } },
  },
  meta: { parsed: {}, noSponsor: 0 },
};

interface Body {
  data: {
    results: Array<{ bioguideId: string; billsIntroduced: number | null }>;
    metadata: { billsIntroducedAsOf: string | null };
  };
}

async function search(qs: string): Promise<Body> {
  const res = await GET(new NextRequest(`http://localhost/api/search?${qs}`));
  return (await res.json()) as Body;
}

const ids = (body: Body) => body.data.results.map(r => r.bioguideId);

describe('/api/search billsIntroduced', () => {
  beforeEach(() => mockCounts.mockResolvedValue(corpus));

  it('attaches counts, a real zero for non-sponsors, and the as-of date', async () => {
    const body = await search('');
    expect(body.data.results.map(r => [r.bioguideId, r.billsIntroduced])).toEqual([
      ['A000001', 12],
      ['B000002', 3],
      ['C000003', 0],
    ]);
    expect(body.data.metadata.billsIntroducedAsOf).toBe(corpus.generatedAt);
  });

  it('filters by min and max inclusively', async () => {
    expect(ids(await search('billsIntroducedMin=3'))).toEqual(['A000001', 'B000002']);
    expect(ids(await search('billsIntroducedMax=3'))).toEqual(['B000002', 'C000003']);
    expect(ids(await search('billsIntroducedMin=1&billsIntroducedMax=5'))).toEqual(['B000002']);
  });

  it('sorts by count in either direction', async () => {
    expect(ids(await search('sort=billsIntroduced&order=desc'))).toEqual([
      'A000001',
      'B000002',
      'C000003',
    ]);
    expect(ids(await search('sort=billsIntroduced&order=asc'))).toEqual([
      'C000003',
      'B000002',
      'A000001',
    ]);
  });

  it('returns null counts, never zeros, when the corpus is unavailable', async () => {
    mockCounts.mockResolvedValue(null);
    const body = await search('');
    expect(body.data.results.every(r => r.billsIntroduced === null)).toBe(true);
    expect(body.data.metadata.billsIntroducedAsOf).toBeNull();
    // A bound can't be satisfied by an unknown count.
    expect(ids(await search('billsIntroducedMax=100'))).toEqual([]);
  });

  it('treats a past-Congress corpus as unavailable', async () => {
    mockCounts.mockResolvedValue({ ...corpus, congress: 118 });
    const body = await search('');
    expect(body.data.results.every(r => r.billsIntroduced === null)).toBe(true);
  });
});

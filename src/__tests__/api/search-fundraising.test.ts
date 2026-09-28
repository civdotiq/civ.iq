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

jest.mock('@/lib/data-sources/member-sponsored-counts/load', () => ({
  getMemberSponsoredCounts: () => Promise.resolve(null),
}));

const rep = (bioguideId: string, name: string, chamber: 'House' | 'Senate') => ({
  bioguideId,
  name,
  party: 'Democrat',
  state: 'MI',
  district: chamber === 'House' ? '1' : undefined,
  chamber,
  yearsInOffice: 2,
});

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: jest.fn(() =>
    Promise.resolve([
      rep('A000001', 'Alpha', 'House'),
      rep('B000002', 'Bravo', 'Senate'),
      rep('C000003', 'Charlie', 'House'),
      rep('D000004', 'Delta', 'House'),
    ])
  ),
  getCommitteeNamesByMember: jest.fn(() => Promise.resolve(new Map())),
}));

const mockIndex = jest.fn();
jest.mock('@/features/record-card/money-index', () => ({
  getFundraisingIndex: () => mockIndex(),
}));

const entry = (raised: number | null, coverageEnd: string | null) => ({
  raised,
  status: raised === null ? 'none' : 'ok',
  cycle: 2026,
  coverageEnd,
  asOf: '2026-09-25T00:00:00.000Z',
});

// C000003: FEC reports no receipts. D000004: the cron hasn't visited yet.
const index = {
  cycle: 2026,
  entries: new Map([
    ['A000001', entry(3_500_000, '2026-07-15')],
    ['B000002', entry(5_200_000, '2026-06-30')],
    ['C000003', entry(null, null)],
  ]),
};

interface Body {
  data: {
    results: Array<{
      bioguideId: string;
      raisedThisCycle: number | null;
      raisedThroughDate: string | null;
    }>;
    metadata: {
      fundraising: {
        source: string;
        cycle: number;
        membersCovered: number;
        totalMembers: number;
      } | null;
    };
  };
}

async function search(qs: string): Promise<Body> {
  const res = await GET(new NextRequest(`http://localhost/api/search?${qs}`));
  return (await res.json()) as Body;
}

const ids = (body: Body) => body.data.results.map(r => r.bioguideId);

describe('/api/search raisedThisCycle', () => {
  beforeEach(() => mockIndex.mockResolvedValue(index));

  it('attaches totals and report dates; unknown and none are null, never $0', async () => {
    const body = await search('');
    expect(
      body.data.results.map(r => [r.bioguideId, r.raisedThisCycle, r.raisedThroughDate])
    ).toEqual([
      ['A000001', 3_500_000, '2026-07-15'],
      ['B000002', 5_200_000, '2026-06-30'],
      ['C000003', null, null],
      ['D000004', null, null],
    ]);
    expect(body.data.metadata.fundraising).toEqual({
      source: 'FEC',
      cycle: 2026,
      membersCovered: 3,
      totalMembers: 4,
    });
  });

  it('filters senators and House members on one scale, inclusively', async () => {
    expect(ids(await search('raisedMin=3500000'))).toEqual(['A000001', 'B000002']);
    expect(ids(await search('raisedMax=4000000'))).toEqual(['A000001']);
    expect(ids(await search('raisedMin=4000000&chamber=Senate'))).toEqual(['B000002']);
  });

  it('sorts by total with unknowns last in either direction', async () => {
    expect(ids(await search('sort=raised&order=desc'))).toEqual([
      'B000002',
      'A000001',
      'C000003',
      'D000004',
    ]);
    expect(ids(await search('sort=raised&order=asc')).slice(0, 2)).toEqual(['A000001', 'B000002']);
  });

  it('an unreadable index nulls every total and reports no coverage', async () => {
    mockIndex.mockResolvedValue(null);
    const body = await search('');
    expect(body.data.results.every(r => r.raisedThisCycle === null)).toBe(true);
    expect(body.data.metadata.fundraising).toBeNull();
    expect(ids(await search('raisedMax=100000000'))).toEqual([]);
  });
});

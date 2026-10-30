/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The sitemap's vote pages come from the real lists, each dated by the day
 * held; a list that can't be read whole is left out, never guessed.
 */

const mockMenu = jest.fn();
jest.mock('@/features/representatives/services/roll-call-corpus', () => ({
  getSenateVoteMenu: () => mockMenu(),
}));
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { houseVoteUrls, senateVoteUrls, startedSessions } from '@/lib/sitemap/vote-urls';

const NOW = new Date('2026-10-30T12:00:00Z');
const originalFetch = global.fetch;
const originalKey = process.env.CONGRESS_API_KEY;

afterEach(() => {
  global.fetch = originalFetch;
  process.env.CONGRESS_API_KEY = originalKey;
});

describe('startedSessions', () => {
  it('lists the sessions of a Congress that have begun', () => {
    expect(startedSessions(119, NOW)).toEqual([1, 2]);
    expect(startedSessions(119, new Date('2025-06-01T00:00:00Z'))).toEqual([1]);
  });
});

describe('senateVoteUrls', () => {
  it('emits every roll call the stored menu lists, dated by the day held', async () => {
    mockMenu.mockResolvedValue({
      congress: 119,
      updatedAt: '2026-10-22T13:50:10.743Z',
      sessions: {
        '1': [{ n: 659, d: '2025-12-18', q: '', r: '', i: '', t: '' }],
        '2': [
          { n: 256, d: '2026-09-30', q: '', r: '', i: '', t: '' },
          { n: 255, d: '2026-09-30', q: '', r: '', i: '', t: '' },
        ],
      },
    });
    expect(await senateVoteUrls(119, NOW)).toEqual([
      { path: '/vote/senate-119-1-659', date: '2025-12-18' },
      { path: '/vote/senate-119-2-256', date: '2026-09-30' },
      { path: '/vote/senate-119-2-255', date: '2026-09-30' },
    ]);
  });

  it('emits nothing without a menu', async () => {
    mockMenu.mockResolvedValue(null);
    expect(await senateVoteUrls(119, NOW)).toEqual([]);
  });
});

describe('houseVoteUrls', () => {
  const page = (votes: Array<[number, string]>, count: number) => ({
    ok: true,
    json: async () => ({
      houseRollCallVotes: votes.map(([rollCallNumber, startDate]) => ({
        rollCallNumber,
        startDate,
      })),
      pagination: { count },
    }),
  });

  it('emits every House roll call Congress.gov lists, dated by the day held', async () => {
    process.env.CONGRESS_API_KEY = 'test';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(page([[362, '2025-12-19T10:00:00-05:00']], 1))
      .mockResolvedValueOnce(page([[74, '2026-02-24T14:18:00-05:00']], 1)) as jest.Mock;
    expect(await houseVoteUrls(119, NOW)).toEqual([
      { path: '/vote/house-119-1-362', date: '2025-12-19' },
      { path: '/vote/house-119-2-74', date: '2026-02-24' },
    ]);
  });

  it('leaves out a session whose list fails or comes back short', async () => {
    process.env.CONGRESS_API_KEY = 'test';
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce(page([[74, '2026-02-24T14:18:00-05:00']], 314)) as jest.Mock;
    expect(await houseVoteUrls(119, NOW)).toEqual([]);
  });
});

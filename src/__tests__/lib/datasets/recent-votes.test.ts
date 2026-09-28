/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The recent-votes / vote-positions datasets used to list votes from
 * `api.congress.gov/v3/vote`, which is not a Congress.gov resource (404
 * "Unknown resource: vote"), so both datasets were always empty (HTTP 503).
 * They now enumerate House rolls from /v3/house-vote and Senate rolls from
 * the mirrored senate.gov vote menu.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetSenateVoteMenu = jest.fn();
jest.mock('@/features/representatives/services/roll-call-corpus', () => ({
  getSenateVoteMenu: (...args: unknown[]) => mockGetSenateVoteMenu(...args),
}));

const mockGetVoteDetails = jest.fn();
jest.mock('@/lib/services/vote.service', () => ({
  getVoteDetailsService: (...args: unknown[]) => mockGetVoteDetails(...args),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

import {
  congressForDate,
  sessionForDate,
  listRecentHouseVoteIds,
  listRecentSenateVoteIds,
  fetchVoteDetails,
} from '@/lib/datasets/generators/recent-votes';

const SEPT_2026 = new Date('2026-09-22T12:00:00Z');

function houseCount(count: number) {
  return { ok: true, json: async () => ({ pagination: { count } }) };
}

describe('congress/session derivation', () => {
  it('maps dates to the congress and session', () => {
    expect(congressForDate(new Date('2025-03-01T00:00:00Z'))).toBe(119);
    expect(congressForDate(SEPT_2026)).toBe(119);
    expect(congressForDate(new Date('2027-06-01T00:00:00Z'))).toBe(120);
    expect(sessionForDate(new Date('2025-03-01T00:00:00Z'))).toBe(1);
    expect(sessionForDate(SEPT_2026)).toBe(2);
  });
});

describe('listRecentHouseVoteIds', () => {
  beforeEach(() => mockFetch.mockReset());

  it('uses the house-vote endpoint, never the nonexistent /v3/vote', async () => {
    mockFetch.mockResolvedValue(houseCount(314));

    const ids = await listRecentHouseVoteIds('key', SEPT_2026, 3);

    expect(ids).toEqual(['house-119-2-314', 'house-119-2-313', 'house-119-2-312']);
    const url = String(mockFetch.mock.calls[0]?.[0]);
    expect(url).toContain('/v3/house-vote/119/2');
    expect(url).not.toMatch(/\/v3\/vote\?/);
  });

  it('fills from session 1 when session 2 has too few rolls', async () => {
    mockFetch.mockResolvedValueOnce(houseCount(2)).mockResolvedValueOnce(houseCount(362));

    const ids = await listRecentHouseVoteIds('key', new Date('2026-01-08T12:00:00Z'), 4);

    expect(ids).toEqual(['house-119-2-2', 'house-119-2-1', 'house-119-1-362', 'house-119-1-361']);
  });

  it('returns [] when the upstream errors', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 500 });
    expect(await listRecentHouseVoteIds('key', SEPT_2026, 3)).toEqual([]);
  });
});

describe('listRecentSenateVoteIds', () => {
  beforeEach(() => mockGetSenateVoteMenu.mockReset());

  it('takes the newest rolls across sessions from the mirrored menu', async () => {
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      updatedAt: '2026-09-18',
      sessions: {
        '1': [{ n: 659, d: '2025-12-18', q: '', r: '', i: '', t: '' }],
        '2': [
          { n: 237, d: '2026-09-17', q: '', r: '', i: '', t: '' },
          { n: 238, d: '2026-09-17', q: '', r: '', i: '', t: '' },
        ],
      },
    });

    const ids = await listRecentSenateVoteIds(SEPT_2026, 3);

    expect(ids).toEqual(['senate-119-2-238', 'senate-119-2-237', 'senate-119-1-659']);
  });

  it('returns [] when the mirror has not run', async () => {
    mockGetSenateVoteMenu.mockResolvedValue(null);
    expect(await listRecentSenateVoteIds(SEPT_2026)).toEqual([]);
  });
});

describe('fetchVoteDetails', () => {
  const originalKey = process.env.CONGRESS_API_KEY;

  beforeEach(() => {
    process.env.CONGRESS_API_KEY = 'test-key';
    mockFetch.mockReset();
    mockGetSenateVoteMenu.mockReset();
    mockGetVoteDetails.mockReset();
  });

  afterAll(() => {
    process.env.CONGRESS_API_KEY = originalKey;
  });

  it('merges both chambers newest first with session-qualified Senate IDs', async () => {
    // Session 2 has one roll; session 1 is empty
    mockFetch.mockResolvedValueOnce(houseCount(1)).mockResolvedValueOnce(houseCount(0));
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      updatedAt: '2026-09-18',
      sessions: { '2': [{ n: 238, d: '2026-09-17', q: '', r: '', i: '', t: '' }] },
    });
    mockGetVoteDetails.mockImplementation(async (voteId: string) =>
      voteId.startsWith('house')
        ? { voteId, chamber: 'House', date: '2026-01-06T15:00:00-05:00', members: [] }
        : // The service returns Senate IDs as a bare padded roll number
          { voteId: '00238', chamber: 'Senate', date: '2026-09-17T13:59:00.000Z', members: [] }
    );

    const votes = await fetchVoteDetails(SEPT_2026);

    expect(votes.map(v => v.voteId)).toEqual(['senate-119-2-238', 'house-119-2-1']);
  });

  it('drops votes whose details cannot be fetched', async () => {
    mockFetch.mockResolvedValueOnce(houseCount(2)).mockResolvedValueOnce(houseCount(0));
    mockGetSenateVoteMenu.mockResolvedValue(null);
    mockGetVoteDetails
      .mockResolvedValueOnce({ voteId: 'house-119-2-2', date: '2026-09-16', members: [] })
      .mockRejectedValueOnce(new Error('timeout'));

    const votes = await fetchVoteDetails(SEPT_2026);

    expect(votes.map(v => v.voteId)).toEqual(['house-119-2-2']);
  });
});

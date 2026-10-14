/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for the read-only roll-call corpus reader.
 */

const mockMget = jest.fn();
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ mget: mockMget }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetHouseVoteListItems = jest.fn();
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseVoteListItems: (...args: unknown[]) => mockGetHouseVoteListItems(...args),
  },
}));

const mockGetSenateVoteMenu = jest.fn();
const mockGetSenateCorpusRollCalls = jest.fn();
jest.mock('@/features/representatives/services/roll-call-corpus', () => {
  const actual = jest.requireActual('@/features/representatives/services/roll-call-corpus');
  return {
    ...actual,
    getSenateVoteMenu: (...args: unknown[]) => mockGetSenateVoteMenu(...args),
    getSenateCorpusRollCalls: (...args: unknown[]) => mockGetSenateCorpusRollCalls(...args),
  };
});

import { readChamberCorpus } from '@/lib/intelligence/analyzers/roll-corpus-reader';

const compact = (n: number, date: string) => ({
  rollCallNumber: n,
  session: date.startsWith('2025') ? 1 : 2,
  date,
  votes: [{ b: 'P000197', p: 'D', v: 'Y' }],
});

describe('readChamberCorpus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reads House rolls by exact key, deriving the session from each date', async () => {
    mockGetHouseVoteListItems.mockResolvedValue([
      { rollCallNumber: 2, date: '2026-02-01T15:00:00Z' },
      { rollCallNumber: 1, date: '2025-01-10T15:00:00Z' },
    ]);
    mockMget.mockResolvedValue([compact(2, '2026-02-01T15:00:00Z'), null]);

    const result = await readChamberCorpus('House', 119);

    expect(mockMget).toHaveBeenCalledWith([
      'record-card:roll:house:119:2:2',
      'record-card:roll:house:119:1:1',
    ]);
    expect(result.rolls).toHaveLength(1);
    expect(result.rolls[0]!.memberVotes[0]).toEqual(
      expect.objectContaining({ bioguideId: 'P000197', position: 'Yea' })
    );
    expect(result.expected).toBe(2);
    expect(result.coverage).toBe(0.5);
  });

  it('chunks House MGETs to 100 keys', async () => {
    mockGetHouseVoteListItems.mockResolvedValue(
      Array.from({ length: 250 }, (_, i) => ({ rollCallNumber: i + 1, date: '2025-03-01' }))
    );
    mockMget.mockImplementation((keys: string[]) => Promise.resolve(keys.map(() => null)));

    await readChamberCorpus('House', 119);

    expect(mockMget.mock.calls.map(([keys]: [string[]]) => keys.length)).toEqual([100, 100, 50]);
  });

  it('measures Senate coverage against the mirrored vote menu', async () => {
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      sessions: { '1': [{ n: 1 }, { n: 2 }], '2': [{ n: 1 }, { n: 2 }] },
      updatedAt: '',
    });
    mockGetSenateCorpusRollCalls.mockResolvedValue([{}, {}, {}]);

    const result = await readChamberCorpus('Senate', 119);

    expect(mockGetSenateCorpusRollCalls).toHaveBeenCalledWith(119, 4);
    expect(result.expected).toBe(4);
    expect(result.coverage).toBe(0.75);
  });

  it('returns an empty corpus when the Senate mirror has no menu', async () => {
    mockGetSenateVoteMenu.mockResolvedValue(null);

    const result = await readChamberCorpus('Senate', 119);
    expect(result).toEqual({ rolls: [], expected: 0, coverage: 0 });
  });

  it('returns an empty corpus instead of throwing', async () => {
    mockGetHouseVoteListItems.mockRejectedValue(new Error('boom'));

    const result = await readChamberCorpus('House', 119);
    expect(result).toEqual({ rolls: [], expected: 0, coverage: 0 });
  });
});

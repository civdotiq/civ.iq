/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

const mockExists = jest.fn();
const mockGet = jest.fn();
const mockSet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ exists: mockExists, set: mockSet, get: mockGet }),
}));

const mockGetSenateVoteMenu = jest.fn();

jest.mock('@/features/representatives/services/roll-call-corpus', () => ({
  getSenateVoteMenu: (congress: number) => mockGetSenateVoteMenu(congress),
  rollKey: (chamber: string, congress: number, session: number, n: number) =>
    `record-card:roll:${chamber}:${congress}:${session}:${n}`,
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { currentHouseSession, detectVoteEvents, detectSenateVoteEvents } from '../vote-detector';

beforeEach(() => {
  jest.clearAllMocks();
  mockExists.mockResolvedValue(false);
  mockGet.mockResolvedValue(null);
  mockSet.mockResolvedValue(undefined);
});

describe('currentHouseSession', () => {
  test('even years are session 2', () => {
    expect(currentHouseSession(new Date('2026-07-12T00:00:00Z'))).toBe(2);
  });

  test('odd years are session 1', () => {
    expect(currentHouseSession(new Date('2025-03-01T00:00:00Z'))).toBe(1);
  });
});

describe('detectVoteEvents', () => {
  test('returns empty array when API key missing', async () => {
    const saved = process.env.CONGRESS_API_KEY;
    delete process.env.CONGRESS_API_KEY;
    try {
      expect(await detectVoteEvents()).toEqual([]);
    } finally {
      if (saved) process.env.CONGRESS_API_KEY = saved;
    }
  });
});

describe('detectSenateVoteEvents', () => {
  const recentDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const session = new Date(recentDate).getUTCFullYear() % 2 === 0 ? '2' : '1';

  const menuEntry = {
    n: 42,
    d: recentDate,
    q: 'On Passage of the Bill',
    r: 'Passed',
    i: 'S. 1234',
    t: 'Motion to Concur; Example Act',
  };

  const compactRoll = {
    rollCallNumber: 42,
    session: parseInt(session, 10),
    date: recentDate,
    votes: [
      { b: 'A000001', p: 'D', v: 'Y' },
      { b: 'A000002', p: 'R', v: 'Y' },
      { b: 'A000003', p: 'R', v: 'N' },
      { b: 'A000004', p: 'D', v: 'X' },
    ],
  };

  test('returns empty array when mirror menu is absent', async () => {
    mockGetSenateVoteMenu.mockResolvedValue(null);
    expect(await detectSenateVoteEvents()).toEqual([]);
  });

  test('emits a vote-record event from menu + compact roll', async () => {
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      sessions: { [session]: [menuEntry] },
      updatedAt: recentDate,
    });
    mockGet.mockResolvedValue(compactRoll);

    const events = await detectSenateVoteEvents();
    expect(events).toHaveLength(1);
    const event = events[0]!;
    expect(event.type).toBe('vote-record');
    expect(event.id).toBe(`vote-senate-119-${session}-42`);
    expect(event.title).toContain('Senate Vote #42');
    expect(event.title).toContain('S. 1234');
    expect(event.data).toMatchObject({
      voteId: `senate-119-${session}-42`,
      chamber: 'Senate',
      rollNumber: 42,
      result: 'Passed',
      yeas: 2,
      nays: 1,
      notVoting: 1,
    });
    expect(event.source.url).toContain('senate.gov');
  });

  test('skips menu entries whose roll call is not yet mirrored', async () => {
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      sessions: { [session]: [menuEntry] },
      updatedAt: recentDate,
    });
    mockGet.mockResolvedValue(null);

    expect(await detectSenateVoteEvents()).toEqual([]);
  });

  test('skips already-published votes via dedup key', async () => {
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      sessions: { [session]: [menuEntry] },
      updatedAt: recentDate,
    });
    mockExists.mockResolvedValue(true);
    mockGet.mockResolvedValue(compactRoll);

    expect(await detectSenateVoteEvents()).toEqual([]);
  });

  test('ignores votes older than the freshness window', async () => {
    const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    mockGetSenateVoteMenu.mockResolvedValue({
      congress: 119,
      sessions: { '1': [{ ...menuEntry, d: oldDate }] },
      updatedAt: oldDate,
    });
    mockGet.mockResolvedValue(compactRoll);

    expect(await detectSenateVoteEvents()).toEqual([]);
  });
});

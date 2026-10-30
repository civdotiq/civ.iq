/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The ingest route's "record-rolls" kind: Senate roll calls read from the
 * Congressional Record by the sync-senate-votes-from-record workflow.
 * Entries are merged into the stored vote menu, never replacing it, and a
 * roll call the menu wouldn't list is refused.
 */

import type { NextRequest } from 'next/server';
import type {
  CompactRollCall,
  SenateMenuEntry,
  SenateVoteMenu,
} from '@/features/representatives/services/roll-call-corpus';

const mockGetMenu = jest.fn();
const mockSetMenu = jest.fn();
const mockSetRoll = jest.fn();
const mockSnapshot = jest.fn();

jest.mock('@/features/representatives/services/roll-call-corpus', () => ({
  ...jest.requireActual('@/features/representatives/services/roll-call-corpus'),
  getRawSenateVoteMenu: (congress: number) => mockGetMenu(congress),
  setSenateVoteMenu: (menu: SenateVoteMenu) => mockSetMenu(menu),
  setSenateCompactRoll: (congress: number, roll: CompactRollCall) => mockSetRoll(congress, roll),
}));
jest.mock('@/features/representatives/services/senate-votes-snapshot', () => ({
  loadSenateVotesSnapshot: (congress: number) => mockSnapshot(congress),
}));
jest.mock('@/features/representatives/services/senate-vote-freshness', () => ({
  refreshSenateFreshnessFromMenu: jest.fn(async () => undefined),
}));
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {},
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { POST } from '@/app/api/intelligence/chamber-baselines/ingest/route';

const SECRET = 'test-cron-secret';
const ORIGINAL_SECRET = process.env.CRON_SECRET;

function request(body: unknown, auth = `Bearer ${SECRET}`): NextRequest {
  const headers = new Headers({ authorization: auth });
  return { headers, json: async () => body } as unknown as NextRequest;
}

/** 100 senators with distinct Bioguide-shaped IDs. */
function roll(n: number, date = '2026-11-09T22:41:07Z'): CompactRollCall {
  return {
    rollCallNumber: n,
    session: 2,
    date,
    votes: Array.from({ length: 100 }, (_, i) => ({
      b: `A${String(i).padStart(6, '0')}`,
      p: i % 2 ? 'R' : 'D',
      v: i < 52 ? 'Y' : 'N',
    })),
  };
}

const RECORD_URL =
  'https://www.govinfo.gov/content/pkg/CREC-2026-11-09/html/CREC-2026-11-09-pt1-PgS5301.htm';

function entry(n: number): SenateMenuEntry {
  return {
    n,
    d: '2026-11-09',
    q: 'On Cloture on the Motion to Proceed',
    r: 'Agreed to',
    i: 'H.R. 2347',
    t: 'Cloture on the Motion to Proceed: H.R. 2347; Survivor Justice Tax Prevention Act',
    record: { url: RECORD_URL, readAt: '2026-11-10T15:31:00.000Z' },
  };
}

const STORED: SenateVoteMenu = {
  congress: 119,
  sessions: {
    '1': [
      { n: 659, d: '2025-12-18', q: 'On the Cloture Motion', r: 'Agreed to', i: 'PN373', t: '' },
    ],
    '2': [{ n: 256, d: '2026-09-30', q: 'On the Nomination', r: 'Confirmed', i: 'PN1129', t: '' }],
  },
  updatedAt: '2026-10-22T13:50:10.743Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.CRON_SECRET = SECRET;
  mockGetMenu.mockResolvedValue(STORED);
  mockSetMenu.mockResolvedValue(true);
  mockSetRoll.mockResolvedValue(true);
  mockSnapshot.mockResolvedValue(null);
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe('POST ingest, kind "record-rolls"', () => {
  it('needs the cron secret', async () => {
    const res = await POST(request({ kind: 'record-rolls' }, 'Bearer nope'));
    expect(res.status).toBe(401);
  });

  it('stores the roll calls and merges their entries into the menu', async () => {
    const res = await POST(
      request({
        kind: 'record-rolls',
        congress: 119,
        session: 2,
        rolls: [roll(257)],
        entries: [entry(257)],
      })
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, persisted: 1, entries: 1 });
    expect(mockSetRoll).toHaveBeenCalledWith(119, roll(257));
    const menu = mockSetMenu.mock.calls[0]?.[0] as SenateVoteMenu;
    expect(menu.sessions['2']?.map(e => e.n)).toEqual([257, 256]);
    expect(menu.sessions['1']).toEqual(STORED.sessions['1']);
    // When the senate.gov mirror last synced: unchanged.
    expect(menu.updatedAt).toBe(STORED.updatedAt);
  });

  it('starts from the committed snapshot when Redis has no menu', async () => {
    mockGetMenu.mockResolvedValue(null);
    mockSnapshot.mockResolvedValue({ menu: STORED });
    await POST(
      request({
        kind: 'record-rolls',
        congress: 119,
        session: 2,
        rolls: [roll(257)],
        entries: [entry(257)],
      })
    );
    const menu = mockSetMenu.mock.calls[0]?.[0] as SenateVoteMenu;
    expect(menu.sessions['1']?.map(e => e.n)).toEqual([659]);
    expect(menu.sessions['2']?.map(e => e.n)).toEqual([257, 256]);
  });

  it('refuses a roll call the menu would not list', async () => {
    const res = await POST(
      request({ kind: 'record-rolls', congress: 119, session: 2, rolls: [roll(258)], entries: [] })
    );
    expect(res.status).toBe(400);
    expect(mockSetRoll).not.toHaveBeenCalled();
    expect(mockSetMenu).not.toHaveBeenCalled();
  });

  it('accepts a changed roll call the menu already lists, without an entry', async () => {
    const res = await POST(
      request({ kind: 'record-rolls', congress: 119, session: 2, rolls: [roll(256)], entries: [] })
    );
    expect(res.status).toBe(200);
    expect(mockSetRoll).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['an entry without its Record source', { entries: [{ ...entry(257), record: undefined }] }],
    [
      'a Record source off GovInfo',
      { entries: [{ ...entry(257), record: { url: 'https://example.com/x', readAt: 'x' } }] },
    ],
    ['too few senators', { rolls: [{ ...roll(257), votes: roll(257).votes.slice(0, 50) }] }],
    [
      'a senator listed twice',
      {
        rolls: [
          {
            ...roll(257),
            votes: [...roll(257).votes.slice(0, 99), { b: 'A000000', p: 'D', v: 'N' }],
          },
        ],
      },
    ],
    [
      'a position code that is not Y, N, P or X',
      {
        rolls: [{ ...roll(257), votes: roll(257).votes.map(v => ({ ...v, v: 'Yea' })) }],
      },
    ],
    ['a date that is not a timestamp', { rolls: [roll(257, 'November 9, 2026')] }],
    ['a roll call from the other session', { rolls: [{ ...roll(257), session: 1 }] }],
  ])('refuses %s', async (_label, override) => {
    const res = await POST(
      request({
        kind: 'record-rolls',
        congress: 119,
        session: 2,
        rolls: [roll(257)],
        entries: [entry(257)],
        ...override,
      })
    );
    expect(res.status).toBe(400);
    expect(mockSetRoll).not.toHaveBeenCalled();
  });
});

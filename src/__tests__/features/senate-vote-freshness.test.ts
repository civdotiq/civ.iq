/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The twice-daily Senate vote freshness check: what it reads, what it saves,
 * and that a failure never moves "Checked" or raises the missing-votes notice.
 * Record issues and Redis are faked; nothing is written to the shared Redis.
 */

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ get: jest.fn(async () => null), set: jest.fn(async () => true) }),
}));

import type { SenateVoteMenu } from '@/features/representatives/services/roll-call-corpus';
import {
  checkSenateVoteFreshness,
  findMissing,
  freshnessFromNote,
  senateFreshnessHealth,
  type FreshnessCheckDeps,
  type SenateVoteFreshnessNote,
} from '@/features/representatives/services/senate-vote-freshness';
import type {
  RecordIssue,
  SenateDigestReading,
} from '@/lib/data-sources/congressional-record/senate-digest';

const menu: SenateVoteMenu = {
  congress: 119,
  updatedAt: '2026-10-22T13:50:10.743Z',
  sessions: {
    '1': [{ n: 659, d: '2025-12-18', q: 'q', r: 'r', i: 'i', t: 't' }],
    '2': [
      { n: 256, d: '2026-09-30', q: 'q', r: 'r', i: 'i', t: 't' },
      { n: 255, d: '2026-09-30', q: 'q', r: 'r', i: 'i', t: 't' },
    ],
  },
};

function harness(
  totals: Record<string, number | null>,
  prev: SenateVoteFreshnessNote | null = null,
  opts: { failOn?: string; now?: string } = {}
) {
  const reads: string[] = [];
  let saved: SenateVoteFreshnessNote | null = null;
  const deps: FreshnessCheckDeps = {
    listIssues: async (from: string, to: string): Promise<RecordIssue[]> =>
      Object.keys(totals)
        .filter(d => d >= from && d <= to)
        .sort()
        .map(d => ({ packageId: `CREC-${d}`, dateIssued: d })),
    readDigest: async (issue: RecordIssue): Promise<SenateDigestReading> => {
      reads.push(issue.dateIssued);
      if (issue.dateIssued === opts.failOn) throw new Error('GovInfo 503');
      return { ...issue, digestFound: true, total: totals[issue.dateIssued] ?? null };
    },
    readMenu: async () => menu,
    readNote: async () => prev,
    writeNote: async note => {
      saved = note;
      return true;
    },
    now: () => new Date(opts.now ?? '2026-10-27T14:17:00Z'),
  };
  return { deps, reads, saved: () => saved };
}

describe('checkSenateVoteFreshness', () => {
  it('first run: walks back to the newest vote day and finds nothing missing', async () => {
    const h = harness({
      '2026-09-29': 252,
      '2026-09-30': 256,
      '2026-10-06': null,
      '2026-10-26': null,
    });
    const note = await checkSenateVoteFreshness(119, h.deps);
    expect(h.reads).toEqual(['2026-10-26', '2026-10-06', '2026-09-30']);
    expect(note).toMatchObject({
      lastSuccessAt: '2026-10-27T14:17:00.000Z',
      consecutiveFailures: 0,
      latestIssueRead: '2026-10-26',
      recordTotals: { '2': { total: 256, issueDate: '2026-09-30' } },
      latestVote: { session: 2, roll: 256, date: '2026-09-30' },
      missing: null,
    });
    expect(h.saved()).toEqual(note);
  });

  it('flags votes the Record lists that we lack (Nov 9 example)', async () => {
    const prev = await checkSenateVoteFreshness(
      119,
      harness({ '2026-09-30': 256, '2026-10-26': null }).deps
    );
    const h = harness({ '2026-09-30': 256, '2026-10-26': null, '2026-11-09': 258 }, prev, {
      now: '2026-11-10T14:17:00Z',
    });
    const note = await checkSenateVoteFreshness(119, h.deps);
    expect(h.reads).toEqual(['2026-11-09']);
    expect(note.missing).toEqual({
      session: 2,
      ourLatestRoll: 256,
      ourLatestDate: '2026-09-30',
      recordTotal: 258,
      recordIssueDate: '2026-11-09',
    });
    expect(freshnessFromNote(note)).toMatchObject({ stale: true, latestVoteDate: '2026-09-30' });
  });

  it('a later run only re-reads the last week, never back past the known total', async () => {
    const prev = await checkSenateVoteFreshness(
      119,
      harness({ '2026-09-30': 256, '2026-10-26': null }).deps
    );
    const h = harness(
      { '2026-09-30': 256, '2026-10-19': null, '2026-10-22': null, '2026-10-26': null },
      prev
    );
    await checkSenateVoteFreshness(119, h.deps);
    expect(h.reads).toEqual(['2026-10-26', '2026-10-22', '2026-10-19']);
  });

  it('a failed run keeps "Checked" and never sets missing', async () => {
    const prev = await checkSenateVoteFreshness(
      119,
      harness({ '2026-09-30': 256, '2026-10-26': null }).deps
    );
    const h = harness({ '2026-09-30': 256, '2026-10-26': null, '2026-11-09': 258 }, prev, {
      failOn: '2026-11-09',
      now: '2026-11-10T14:17:00Z',
    });
    const note = await checkSenateVoteFreshness(119, h.deps);
    expect(note).toMatchObject({
      lastSuccessAt: prev.lastSuccessAt,
      lastAttemptAt: '2026-11-10T14:17:00.000Z',
      lastError: 'GovInfo 503',
      consecutiveFailures: 1,
      failingSince: '2026-11-10T14:17:00.000Z',
      missing: null,
      recordTotals: prev.recordTotals,
    });
    expect(freshnessFromNote(note).stale).toBe(false);
  });

  it('fails (rather than reporting nothing missing) when our vote menu is unavailable', async () => {
    const h = harness({ '2026-09-30': 256 });
    h.deps.readMenu = async () => null;
    const note = await checkSenateVoteFreshness(119, h.deps);
    expect(note).toMatchObject({ lastSuccessAt: null, consecutiveFailures: 1, missing: null });
  });
});

describe('findMissing', () => {
  it('is null when we hold every roll the Record counts', () => {
    expect(findMissing({ '2': { total: 256, issueDate: '2026-09-30' } }, menu)).toBeNull();
  });
});

describe('freshnessFromNote', () => {
  it('"Checked" is the newer of the last check and the last senate.gov sync', () => {
    const note = {
      lastSuccessAt: '2026-10-20T14:17:00Z',
      menuUpdatedAt: '2026-10-22T13:50:10Z',
      latestVote: { session: 2, roll: 256, date: '2026-09-30' },
      missing: null,
    } as SenateVoteFreshnessNote;
    expect(freshnessFromNote(note)).toEqual({
      latestVoteDate: '2026-09-30',
      checkedAt: '2026-10-22T13:50:10Z',
      stale: false,
      missing: null,
    });
  });
});

describe('senateFreshnessHealth', () => {
  const base = {
    lastSuccessAt: '2026-10-27T14:17:00Z',
    lastError: null,
    consecutiveFailures: 0,
    missing: null,
  } as SenateVoteFreshnessNote;

  it('is stale with no note yet', () => {
    expect(senateFreshnessHealth(null).status).toBe('stale');
  });

  it('stays ok through one failed day', () => {
    const note = { ...base, lastError: 'GovInfo 503', consecutiveFailures: 2 };
    expect(senateFreshnessHealth(note, new Date('2026-10-28T22:17:00Z')).status).toBe('ok');
  });

  it('is down after 48 hours with no success (two days in a row)', () => {
    const note = { ...base, lastError: 'GovInfo 503', consecutiveFailures: 4 };
    const health = senateFreshnessHealth(note, new Date('2026-10-29T14:18:00Z'));
    expect(health.status).toBe('down');
    expect(health.error).toContain('GovInfo 503');
  });

  it('never succeeded: down only 48 hours after the first failure', () => {
    const note = {
      ...base,
      lastSuccessAt: null,
      failingSince: '2026-10-27T14:17:00Z',
      lastError: 'GovInfo 503',
      consecutiveFailures: 1,
    };
    expect(senateFreshnessHealth(note, new Date('2026-10-27T22:17:00Z')).status).toBe('ok');
    expect(senateFreshnessHealth(note, new Date('2026-10-29T14:17:00Z')).status).toBe('down');
  });
});

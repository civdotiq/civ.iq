/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for the committed Senate vote snapshot: the file itself is complete,
 * and the daily restore puts back missing or expiring rolls without touching
 * healthy ones or dropping newer menu entries.
 */

const store = new Map<string, { value: unknown; ttl: number }>();
/** Keys whose writes Redis should refuse. */
const refuseWrites = new Set<string>();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn(async (key: string) => store.get(key)?.value ?? null),
    set: jest.fn(async (key: string, value: unknown, ttl: number) => {
      if (refuseWrites.has(key)) return false;
      store.set(key, { value, ttl });
      return true;
    }),
    ttl: jest.fn(async (key: string) => store.get(key)?.ttl ?? null),
  }),
}));

import {
  ROLL_TTL_SECONDS,
  rollKey,
  senateMenuKey,
  type SenateMenuEntry,
  type SenateVoteMenu,
} from '@/features/representatives/services/roll-call-corpus';
import {
  RESTORE_BELOW_TTL_SECONDS,
  loadSenateVotesSnapshot,
  mergeMenus,
  refillSenateCorpusAndRecord,
  refillStatusKey,
  restoreSenateCorpusFromSnapshot,
  senateRefillHealth,
  type SenateRefillStatus,
} from '@/features/representatives/services/senate-votes-snapshot';

function entry(n: number, d = '2026-01-05'): SenateMenuEntry {
  return { n, d, q: 'On Passage', r: 'Passed', i: `S. ${n}`, t: 'A bill' };
}

beforeEach(() => {
  store.clear();
  refuseWrites.clear();
});

describe('committed 119th Congress snapshot', () => {
  it('holds every roll call its menu lists, each with a real member list', async () => {
    const snapshot = await loadSenateVotesSnapshot(119);
    expect(snapshot).not.toBeNull();
    if (!snapshot) return;

    const listed = Object.entries(snapshot.menu.sessions).flatMap(([s, entries]) =>
      entries.map(e => `${s}-${e.n}`)
    );
    const stored = snapshot.rolls.map(r => `${r.session}-${r.rollCallNumber}`);
    expect(new Set(stored).size).toBe(stored.length);
    expect(stored.sort()).toEqual(listed.sort());
    expect(snapshot.rolls).toHaveLength(915);
    for (const roll of snapshot.rolls) {
      expect(roll.votes.length).toBeGreaterThanOrEqual(80);
      expect(roll.votes.every(v => v.b.length > 0)).toBe(true);
    }
  });

  it('is null for a Congress with no snapshot', async () => {
    expect(await loadSenateVotesSnapshot(118)).toBeNull();
  });
});

describe('restoreSenateCorpusFromSnapshot', () => {
  it('puts back missing rolls and the menu, and leaves healthy rolls alone', async () => {
    const snapshot = await loadSenateVotesSnapshot(119);
    if (!snapshot) throw new Error('snapshot missing');
    const [healthy, expiring] = snapshot.rolls;
    if (!healthy || !expiring) throw new Error('snapshot too small');
    const healthyKey = rollKey('senate', 119, healthy.session, healthy.rollCallNumber);
    const expiringKey = rollKey('senate', 119, expiring.session, expiring.rollCallNumber);
    store.set(healthyKey, { value: 'healthy', ttl: RESTORE_BELOW_TTL_SECONDS + 1 });
    store.set(expiringKey, { value: 'expiring', ttl: 60 });

    const result = await restoreSenateCorpusFromSnapshot(119);

    expect(result).toEqual({
      congress: 119,
      rollsInSnapshot: 915,
      rollsRestored: 914,
      menuRestored: true,
      writesFailed: 0,
    });
    expect(store.get(healthyKey)?.value).toBe('healthy');
    expect(store.get(expiringKey)).toEqual({ value: expiring, ttl: ROLL_TTL_SECONDS });
    expect(store.get(senateMenuKey(119))?.ttl).toBe(ROLL_TTL_SECONDS);
  });

  it('is null when there is no snapshot', async () => {
    expect(await restoreSenateCorpusFromSnapshot(118)).toBeNull();
  });
});

describe('mergeMenus', () => {
  const snapshot: SenateVoteMenu = {
    congress: 119,
    sessions: { '2': [entry(2), entry(1)] },
    updatedAt: '2026-10-22T00:00:00.000Z',
  };

  it('keeps newer Redis entries and sessions the snapshot lacks', () => {
    const current: SenateVoteMenu = {
      congress: 119,
      sessions: { '2': [entry(3, '2026-11-09'), entry(2)], '1': [entry(1, '2025-01-09')] },
      updatedAt: '2026-11-10T00:00:00.000Z',
    };
    const merged = mergeMenus(snapshot, current);
    expect(merged.sessions['2']?.map(e => e.n)).toEqual([3, 2, 1]);
    expect(merged.sessions['1']?.map(e => e.n)).toEqual([1]);
    expect(merged.updatedAt).toBe('2026-11-10T00:00:00.000Z');
  });

  it('is the snapshot when Redis has no menu', () => {
    expect(mergeMenus(snapshot, null)).toBe(snapshot);
  });
});

describe('refillSenateCorpusAndRecord', () => {
  const SEVEN_DAYS = 7 * 24 * 60 * 60;

  it('saves a status note after a successful refill', async () => {
    const status = await refillSenateCorpusAndRecord(119);
    expect(status).toMatchObject({
      congress: 119,
      ok: true,
      snapshotFound: true,
      rollsChecked: 915,
      rollsRestored: 915,
      menuRestored: true,
      error: null,
    });
    expect(store.get(refillStatusKey(119))).toEqual({ value: status, ttl: SEVEN_DAYS });
  });

  it('records a missing snapshot file as a failure', async () => {
    const status = await refillSenateCorpusAndRecord(118);
    expect(status).toMatchObject({ ok: false, snapshotFound: false, rollsChecked: 0 });
    expect(status.error).toContain('data/senate-votes-118.json.br');
    expect(store.get(refillStatusKey(118))?.value).toEqual(status);
  });

  it('records rewrites Redis refused as a failure', async () => {
    const snapshot = await loadSenateVotesSnapshot(119);
    const [first] = snapshot?.rolls ?? [];
    if (!first) throw new Error('snapshot missing');
    refuseWrites.add(rollKey('senate', 119, first.session, first.rollCallNumber));

    const status = await refillSenateCorpusAndRecord(119);
    expect(status).toMatchObject({ ok: false, snapshotFound: true, rollsRestored: 914 });
    expect(status.error).toBe('1 rewrite(s) were not accepted by Redis');
  });
});

describe('senateRefillHealth', () => {
  const now = new Date('2026-10-28T12:00:00.000Z');
  const note: SenateRefillStatus = {
    congress: 119,
    ranAt: '2026-10-28T09:00:03.000Z',
    ok: true,
    snapshotFound: true,
    rollsChecked: 915,
    rollsRestored: 0,
    menuRestored: false,
    error: null,
  };

  it('is ok after a recent successful run', () => {
    expect(senateRefillHealth(note, now)).toEqual({
      status: 'ok',
      lastSuccessfulFetch: note.ranAt,
      error: null,
    });
  });

  it('is down when the last run failed', () => {
    const failed = { ...note, ok: false, snapshotFound: false, error: 'Snapshot file missing' };
    expect(senateRefillHealth(failed, now)).toMatchObject({
      status: 'down',
      error: 'Snapshot file missing',
    });
  });

  it('is stale with no note or a run over 36 hours old', () => {
    expect(senateRefillHealth(null, now).status).toBe('stale');
    expect(senateRefillHealth({ ...note, ranAt: '2026-10-26T09:00:00.000Z' }, now)).toMatchObject({
      status: 'stale',
      error: 'Last refill ran 2026-10-26T09:00:00.000Z (51 hours ago)',
    });
  });
});

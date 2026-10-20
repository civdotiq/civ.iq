/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * parseVoteId — chamber/congress/session/roll extraction for all voteId
 * formats in the wild (see memory: voteid-format-sprawl).
 *
 * Regression anchor: 4-part House ids ("house-119-1-100", emitted by
 * sitemap.ts vote URLs) used to fall through every pattern into the
 * Senate fallback, so Google-indexed House vote URLs served Senate votes.
 */

import {
  lookupVote,
  parseVoteId,
  senateRollAbsentFromMenu,
  sessionsToTry,
} from '@/lib/services/vote.service';
import type { SenateVoteMenu } from '@/features/representatives/services/roll-call-corpus';

describe('parseVoteId', () => {
  describe('4-part House format (sitemap URLs) — regression', () => {
    it('parses house-119-1-100 as a House vote, not Senate', () => {
      expect(parseVoteId('house-119-1-100')).toEqual({
        chamber: 'House',
        congress: '119',
        session: '1',
        rollNumber: '100',
        numericId: '100',
      });
    });

    it('parses session 2 ids', () => {
      expect(parseVoteId('house-118-2-345')).toEqual({
        chamber: 'House',
        congress: '118',
        session: '2',
        rollNumber: '345',
        numericId: '345',
      });
    });
  });

  describe('3-part House format (batch-voting-service)', () => {
    it('parses house-119-345 without a session', () => {
      expect(parseVoteId('house-119-345')).toEqual({
        chamber: 'House',
        congress: '119',
        rollNumber: '345',
        numericId: '345',
      });
    });

    it('treats a roll number of 1 or 2 as a roll, not a session', () => {
      expect(parseVoteId('house-119-1')).toEqual({
        chamber: 'House',
        congress: '119',
        rollNumber: '1',
        numericId: '1',
      });
    });
  });

  describe('4-part Senate format (batch-voting-service, analyzers, sitemap)', () => {
    it('parses senate-119-2-00042 with session and padded roll', () => {
      expect(parseVoteId('senate-119-2-00042')).toEqual({
        chamber: 'Senate',
        congress: '119',
        session: '2',
        rollNumber: '00042',
        numericId: '00042',
      });
    });
  });

  describe('3-part Senate format (public v1)', () => {
    it('parses senate-119-42', () => {
      expect(parseVoteId('senate-119-42')).toEqual({
        chamber: 'Senate',
        congress: '119',
        rollNumber: '42',
        numericId: '42',
      });
    });
  });

  describe('legacy congress-first Senate format (recent-votes generator)', () => {
    it('parses 119-senate-00499', () => {
      expect(parseVoteId('119-senate-00499')).toEqual({
        chamber: 'Senate',
        congress: '119',
        rollNumber: '00499',
        numericId: '00499',
      });
    });
  });

  describe('bare numeric fallback', () => {
    it('parses 499 as a Senate roll in the current congress', () => {
      expect(parseVoteId('499')).toEqual({
        chamber: 'Senate',
        congress: '119',
        rollNumber: '499',
        numericId: '499',
      });
    });
  });
});

describe('sessionsToTry', () => {
  it('returns only the known session when provided', () => {
    expect(sessionsToTry('119', '1')).toEqual([1]);
    expect(sessionsToTry('119', '2')).toEqual([2]);
  });

  it('returns both sessions when the session is unknown', () => {
    const sessions = sessionsToTry('119');
    expect(sessions).toHaveLength(2);
    expect(sessions).toEqual(expect.arrayContaining([1, 2]));
  });

  it('falls back to [1, 2] for a malformed congress', () => {
    expect(sessionsToTry('not-a-congress')).toEqual([1, 2]);
  });
});

describe('senateRollAbsentFromMenu', () => {
  const now = new Date('2026-10-07T12:00:00Z');
  const entry = (n: number) => ({ n, d: '2026-01-01', q: 'On the Motion', r: 'Agreed to', i: '' });
  const menu = (sessions: SenateVoteMenu['sessions'], updatedAt = '2026-10-07T08:15:00Z') => ({
    congress: 119,
    sessions,
    updatedAt,
  });

  it('is false for a roll the menu lists', () => {
    expect(senateRollAbsentFromMenu(menu({ '2': [entry(1), entry(2)] }), 2, [2], now)).toBe(false);
  });

  it('is true for a number below the latest that the menu skips', () => {
    expect(senateRollAbsentFromMenu(menu({ '2': [entry(1), entry(3)] }), 2, [2], now)).toBe(true);
  });

  it('is false just above the latest: it may have been cast since the sync', () => {
    expect(senateRollAbsentFromMenu(menu({ '2': [entry(500)] }), 550, [2], now)).toBe(false);
  });

  it('is true far beyond anything the Senate could cast since the sync', () => {
    expect(senateRollAbsentFromMenu(menu({ '2': [entry(500)] }), 9999, [2], now)).toBe(true);
  });

  it('widens the headroom when the menu is days old', () => {
    const stale = menu({ '2': [entry(500)] }, '2026-10-01T08:15:00Z');
    expect(senateRollAbsentFromMenu(stale, 1000, [2], now)).toBe(false);
  });

  it('proves nothing for a session the menu does not carry', () => {
    expect(senateRollAbsentFromMenu(menu({ '2': [entry(500)] }), 9999, [2, 1], now)).toBe(false);
  });

  it('treats a session that has not started as empty', () => {
    const before = new Date('2025-06-01T12:00:00Z');
    const m = menu({ '1': [entry(300)] }, '2025-06-01T08:15:00Z');
    expect(senateRollAbsentFromMenu(m, 5, [2], before)).toBe(true);
  });

  it('is false when the sync time is unreadable', () => {
    expect(senateRollAbsentFromMenu(menu({ '2': [entry(1)] }, 'bad'), 9999, [2], now)).toBe(false);
  });
});

describe('lookupVote', () => {
  const originalFetch = global.fetch;
  let fetchMock: jest.Mock;
  const status = (code: number) => ({ ok: code < 400, status: code, json: async () => ({}) });

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it.each(['nonsense', 'house-119-1-0', 'senate-200-1-1', 'house-150-5'])(
    'is not_found for %s without any upstream call',
    async id => {
      expect(await lookupVote(id, new Date('2026-10-07T12:00:00Z'))).toEqual({
        status: 'not_found',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it('is not_found when Congress.gov 404s every session of a House roll', async () => {
    fetchMock.mockResolvedValue(status(404));
    expect(await lookupVote('house-119-99999')).toEqual({ status: 'not_found' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('is unavailable when Congress.gov fails, never not_found', async () => {
    fetchMock.mockResolvedValueOnce(status(503)).mockResolvedValueOnce(status(404));
    expect(await lookupVote('house-119-99999')).toEqual({ status: 'unavailable' });
  });

  it('reads member positions from indented Clerk XML', async () => {
    // Clerk EVS XML puts each tag on its own indented line.
    const clerkXml = `<?xml version="1.0" encoding="utf-8"?>
<rollcall-vote>
  <vote-data>
    <recorded-vote>
      <legislator name-id="A000370" sort-field="Adams" unaccented-name="Adams" party="D" state="NC" role="legislator">Adams</legislator>
      <vote>Nay</vote>
    </recorded-vote>
    <recorded-vote>
      <legislator name-id="A000055" sort-field="Aderholt" unaccented-name="Aderholt" party="R" state="AL" role="legislator">Aderholt</legislator>
      <vote>Yea</vote>
    </recorded-vote>
  </vote-data>
</rollcall-vote>`;
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          houseRollCallVote: {
            startDate: '2025-05-22T06:00:00-04:00',
            result: 'Passed',
            voteQuestion: 'On Passage',
            sourceDataURL: 'https://clerk.house.gov/evs/2025/roll145.xml',
            votePartyTotal: [],
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => clerkXml });

    const lookup = await lookupVote('house-119-1-145');
    expect(lookup.status).toBe('found');
    const members = lookup.status === 'found' ? lookup.vote.members : [];
    expect(members.map(m => [m.bioguideId, m.position])).toEqual([
      ['A000370', 'Nay'],
      ['A000055', 'Yea'],
    ]);
  });

  it('is unavailable when the House request times out', async () => {
    fetchMock.mockRejectedValue(new DOMException('timed out', 'TimeoutError'));
    expect(await lookupVote('house-119-1-100')).toEqual({ status: 'unavailable' });
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * parseVoteId — chamber/congress/session/roll extraction for all voteId
 * formats in the wild (see memory: voteid-format-sprawl).
 *
 * Regression anchor: 4-part House ids ("house-119-1-100", emitted by
 * sitemap.ts vote URLs) used to fall through every pattern into the
 * Senate fallback, so Google-indexed House vote URLs served Senate votes.
 */

import { parseVoteId, sessionsToTry } from '@/lib/services/vote.service';

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

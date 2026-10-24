/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for batch-voting-service.ts
 *
 * Tests the BatchVotingService singleton and public methods.
 * External XML fetching is mocked.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetSenateCorpusRollCalls = jest.fn();
jest.mock('@/features/representatives/services/roll-call-corpus', () => ({
  getSenateCorpusRollCalls: (...args: unknown[]) => mockGetSenateCorpusRollCalls(...args),
}));

import { BatchVotingService } from '@/features/representatives/services/batch-voting-service';

beforeEach(() => {
  mockGetSenateCorpusRollCalls.mockReset().mockResolvedValue([]);
});

describe('BatchVotingService', () => {
  describe('singleton', () => {
    it('returns the same instance', () => {
      const a = BatchVotingService.getInstance();
      const b = BatchVotingService.getInstance();
      expect(a).toBe(b);
    });
  });

  describe('getHouseMemberVotes', () => {
    it('returns empty array when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const service = BatchVotingService.getInstance();
      const votes = await service.getHouseMemberVotes('T000001', 119, 1, 10);
      expect(Array.isArray(votes)).toBe(true);
    });

    it('returns empty array for 404 response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const service = BatchVotingService.getInstance();
      const votes = await service.getHouseMemberVotes('T000001', 119, 1, 10);
      expect(Array.isArray(votes)).toBe(true);
    });
  });

  describe('session filtering', () => {
    const service = BatchVotingService.getInstance();
    const seedCache = (key: string, value: unknown) => {
      (
        service as unknown as {
          cache: { set(key: string, value: unknown, ttl?: number): void };
        }
      ).cache.set(key, value);
    };
    const roll = (session: 1 | 2, n: number, date: string) => ({
      voteId: `119-house-${session}-${n}`,
      rollCallNumber: n,
      session,
      date,
      question: 'On Passage',
      result: 'Passed',
      memberVotes: [{ bioguideId: 'T000002', position: 'Yea' }],
    });

    beforeEach(() => {
      // The Congress.gov list spans both sessions; roll numbers restart each one.
      const list = [
        { rollCallNumber: 5, date: '2026-03-02', question: '', result: '', sourceDataURL: '' },
        { rollCallNumber: 5, date: '2025-02-03', question: '', result: '', sourceDataURL: '' },
        { rollCallNumber: 4, date: '2025-01-30', question: '', result: '', sourceDataURL: '' },
      ];
      seedCache('house-vote-list-119-1', list);
      seedCache('house-vote-list-119-2', list);
      seedCache('house-vote-119-2-5', roll(2, 5, '2026-03-02'));
      seedCache('house-vote-119-1-5', roll(1, 5, '2025-02-03'));
      seedCache('house-vote-119-1-4', roll(1, 4, '2025-01-30'));
    });

    it('returns only the requested session for House members', async () => {
      const s1 = await service.getHouseMemberVotes('T000002', 119, 1, 10);
      const s2 = await service.getHouseMemberVotes('T000002', 119, 2, 10);

      expect(s1.map(v => v.voteId).sort()).toEqual(['119-house-1-4', '119-house-1-5']);
      expect(s2.map(v => v.voteId)).toEqual(['119-house-2-5']);
    });

    it('returns both sessions once when no session is given', async () => {
      const all = await service.getHouseMemberVotes('T000002', 119, undefined, 10);
      expect(all).toHaveLength(3);
      expect(new Set(all.map(v => v.voteId)).size).toBe(3);
    });

    it('passes the Senate session through to the corpus read', async () => {
      await service.getSenateMemberVotes('S000001', 119, 1, 3);
      expect(mockGetSenateCorpusRollCalls).toHaveBeenCalledWith(119, 6, 1);

      await service.getSenateMemberVotes('S000001', 119, undefined, 3);
      expect(mockGetSenateCorpusRollCalls).toHaveBeenLastCalledWith(119, 6, undefined);
    });
  });

  describe('getSenateMemberVotes', () => {
    it('returns empty array when fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const service = BatchVotingService.getInstance();
      const votes = await service.getSenateMemberVotes('S000001', 119, 1, 3);
      expect(Array.isArray(votes)).toBe(true);
    }, 30000);
  });

  describe('getPartyYeaRate', () => {
    const service = BatchVotingService.getInstance();
    const seedCache = (key: string, value: unknown) => {
      (
        service as unknown as {
          cache: { set(key: string, value: unknown, ttl?: number): void };
        }
      ).cache.set(key, value);
    };

    it('matches long-form party labels against single-letter member parties', () => {
      // Regression: callers pass "Democrat"/"Republican" (YAML format) while
      // roll-call member votes carry "D"/"R" — strict compare returned null
      // for every vote, silently fabricating party baselines downstream.
      seedCache('house-vote-119-2-42', {
        memberVotes: [
          { party: 'D', position: 'Yea' },
          { party: 'D', position: 'Nay' },
          { party: 'R', position: 'Yea' },
          { party: 'R', position: 'Not Voting' },
        ],
      });

      expect(service.getPartyYeaRate('House', 119, 42, 'Democrat', 2)).toEqual({
        yeaRate: 0.5,
        voteCount: 2,
      });
      expect(service.getPartyYeaRate('House', 119, 42, 'Republican')).toEqual({
        yeaRate: 1,
        voteCount: 1,
      });
    });

    it('does not fall back to another session when session is explicit', () => {
      // Roll-call numbers restart each session — a session-2 query must not
      // silently match the session-1 vote with the same number.
      seedCache('house-vote-119-1-77', {
        memberVotes: [{ party: 'D', position: 'Yea' }],
      });

      expect(service.getPartyYeaRate('House', 119, 77, 'Democrat', 2)).toBeNull();
      expect(service.getPartyYeaRate('House', 119, 77, 'Democrat', 1)).not.toBeNull();
    });
  });
});

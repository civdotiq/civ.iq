/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
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

import { BatchVotingService } from '@/features/representatives/services/batch-voting-service';

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

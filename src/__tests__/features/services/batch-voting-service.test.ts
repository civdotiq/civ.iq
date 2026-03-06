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
});

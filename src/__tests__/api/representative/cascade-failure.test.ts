/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Cascade-failure contract tests for representative-detail routes.
 *
 * Pins the BackboneResponse guarantee: when every upstream dependency
 * fails at once, the route must still return `{ dataQuality: 'unavailable',
 * sourceStatus: [...] }` instead of throwing past the outer try/catch or
 * returning a bare 500.
 *
 * Surfaced by the 2026-04-20 audit of Phase 1 (`PLAN-backbone-gaps-2026-04.md`)
 * and tracked via `PROMPT-A1-phase1-followups.md`.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

const mockMemberships = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  fetchCommitteeMemberships: () => mockMemberships(),
  getEnhancedRepresentative: jest.fn(async () => ({ bioguideId: 'P000197', committees: [] })),
}));

import { GET } from '@/app/api/representative/[bioguideId]/committees/route';
import { createMockRequest } from '../../utils/test-helpers';

describe('representative-detail cascade-failure contract', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('/api/representative/[bioguideId]/committees', () => {
    async function call() {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/committees'
      );
      const response = await GET(request, {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      return { response, data: await response.json() };
    }

    it('returns BackboneResponse with dataQuality=unavailable when the roster fetch rejects', async () => {
      mockMemberships.mockRejectedValue(new Error('network error'));
      const { response, data } = await call();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.committees).toEqual([]);
      expect(data.sourceStatus[0]).toMatchObject({
        source: 'congress-legislators',
        status: 'error',
      });
      expect(data.sourceStatus[0].errorMessage).toContain('network error');
    });

    it('returns BackboneResponse with dataQuality=unavailable when the roster comes back empty', async () => {
      mockMemberships.mockResolvedValue([]);
      const { response, data } = await call();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.committees).toEqual([]);
    });

    it('returns BackboneResponse with dataQuality=unavailable on request timeout', async () => {
      mockMemberships.mockRejectedValue(new Error('The operation was aborted due to timeout'));
      const { response, data } = await call();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.sourceStatus[0]).toMatchObject({
        source: 'congress-legislators',
        status: 'timeout',
      });
    });
  });
});

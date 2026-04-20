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

import { GET } from '@/app/api/representative/[bioguideId]/committees/route';
import { createMockRequest } from '../../utils/test-helpers';

describe('representative-detail cascade-failure contract', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  describe('/api/representative/[bioguideId]/committees', () => {
    it('returns BackboneResponse with dataQuality=unavailable when CONGRESS_API_KEY is missing', async () => {
      process.env = { ...originalEnv };
      delete process.env.CONGRESS_API_KEY;

      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/committees'
      );
      const response = await GET(request, {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.committees).toEqual([]);
      expect(Array.isArray(data.sourceStatus)).toBe(true);
      expect(data.sourceStatus[0]).toMatchObject({
        source: 'congress.gov',
        status: 'not-configured',
      });
    });

    it('returns BackboneResponse with dataQuality=unavailable when fetch rejects (network error)', async () => {
      process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };
      global.fetch = jest.fn().mockRejectedValue(new Error('network error'));

      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/committees'
      );

      const response = await GET(request, {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.committees).toEqual([]);
      expect(data.sourceStatus[0]).toMatchObject({
        source: 'congress.gov',
        status: 'error',
      });
      expect(data.sourceStatus[0].errorMessage).toContain('network error');
    });

    it('returns BackboneResponse with dataQuality=unavailable when upstream returns HTTP 500', async () => {
      process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'upstream down' }),
      });

      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/committees'
      );
      const response = await GET(request, {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.committees).toEqual([]);
      expect(data.sourceStatus[0]).toMatchObject({
        source: 'congress.gov',
        status: 'error',
      });
      expect(data.sourceStatus[0].errorMessage).toContain('500');
    });

    it('returns BackboneResponse with dataQuality=unavailable on request timeout', async () => {
      process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };
      global.fetch = jest.fn().mockRejectedValue(
        Object.assign(new Error('The operation was aborted due to timeout'), {
          name: 'TimeoutError',
        })
      );

      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/committees'
      );
      const response = await GET(request, {
        params: Promise.resolve({ bioguideId: 'P000197' }),
      });
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.dataQuality).toBe('unavailable');
      expect(data.sourceStatus[0]).toMatchObject({
        source: 'congress.gov',
        status: 'timeout',
      });
    });
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

const originalEnv = process.env;

import { CourtListenerService } from '@/lib/data-sources/courtlistener-service';

describe('CourtListenerService', () => {
  let service: CourtListenerService;

  beforeEach(() => {
    service = new CourtListenerService();
    jest.clearAllMocks();
    process.env = { ...originalEnv, COURTLISTENER_API_TOKEN: 'test-cl-token' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('searchDockets', () => {
    it('searches and transforms court dockets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          count: 1,
          next: null,
          previous: null,
          results: [
            {
              id: 12345,
              case_name: 'EPA v. Dow Chemical',
              court: 'D.C. Circuit',
              date_filed: '2025-01-15',
              date_terminated: null,
              nature_of_suit: 'Environmental',
              parties: [
                { name: 'Environmental Protection Agency', type: 1 },
                { name: 'Dow Chemical Company', type: 2 },
              ],
            },
          ],
        }),
      });

      const results = await service.searchDockets({ partyName: 'EPA' });

      expect(results).toHaveLength(1);
      expect(results[0]?.caseName).toBe('EPA v. Dow Chemical');
      expect(results[0]?.court).toBe('D.C. Circuit');
      expect(results[0]?.parties).toContain('Environmental Protection Agency');
      expect(results[0]?.dateTerminated).toBeNull();
    });

    it('returns empty when no API token', async () => {
      process.env = { ...originalEnv };
      delete process.env.COURTLISTENER_API_TOKEN;

      const results = await service.searchDockets({ partyName: 'EPA' });
      expect(results).toEqual([]);
    });

    it('returns empty on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('CL API error'));

      const results = await service.searchDockets({ partyName: 'EPA' });
      expect(results).toEqual([]);
    });

    it('passes query parameters correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 0, results: [] }),
      });

      await service.searchDockets({
        partyName: 'Department of Justice',
        court: 'scotus',
        dateAfter: '2024-01-01',
        limit: 10,
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('q=Department+of+Justice');
      expect(calledUrl).toContain('court=scotus');
      expect(calledUrl).toContain('date_filed__gte=2024-01-01');
      expect(calledUrl).toContain('page_size=10');
    });
  });

  describe('searchAgencyCases', () => {
    it('delegates to searchDockets with agency as partyName', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          count: 1,
          results: [
            {
              id: 1,
              case_name: 'OSHA v. Factory Inc',
              court: '5th Circuit',
              date_filed: '2025-02-01',
              date_terminated: '2025-06-01',
              nature_of_suit: 'Labor',
            },
          ],
        }),
      });

      const results = await service.searchAgencyCases('OSHA');

      expect(results).toHaveLength(1);
      expect(results[0]?.caseName).toBe('OSHA v. Factory Inc');
      expect(results[0]?.dateTerminated).toBe('2025-06-01');
    });
  });

  describe('getJudgePositions', () => {
    it('fetches and transforms judge positions', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          count: 1,
          results: [
            {
              person: { id: 42, name_full: 'Jane Smith' },
              court: { short_name: 'D.C. Circuit' },
              date_start: '2020-03-15',
              date_nominated: '2020-01-10',
              appointer: { person: { name_full: 'President Doe' } },
            },
          ],
        }),
      });

      const positions = await service.getJudgePositions(42);

      expect(positions).toHaveLength(1);
      expect(positions[0]?.name).toBe('Jane Smith');
      expect(positions[0]?.court).toBe('D.C. Circuit');
      expect(positions[0]?.appointedBy).toBe('President Doe');
    });

    it('returns empty when no API token', async () => {
      process.env = { ...originalEnv };
      delete process.env.COURTLISTENER_API_TOKEN;

      const positions = await service.getJudgePositions(42);
      expect(positions).toEqual([]);
    });
  });
});

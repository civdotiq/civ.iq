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

import { OshaService } from '@/lib/data-sources/osha-service';

describe('OshaService', () => {
  let service: OshaService;

  beforeEach(() => {
    service = new OshaService();
    jest.clearAllMocks();
    process.env = { ...originalEnv, DOL_API_KEY: 'test-dol-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('searchInspections', () => {
    it('searches and transforms OSHA inspections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            activity_nr: 12345,
            estab_name: 'Test Factory',
            site_address: '123 Main St',
            site_city: 'Houston',
            site_state: 'TX',
            site_zip: '77001',
            sic_code: '2911',
            naics_code: '324110',
            insp_type: 'Planned',
            open_date: '2025-01-15',
            close_case_date: '2025-03-01',
            total_current_penalty: 25000,
          },
        ],
      });

      const results = await service.searchInspections({ state: 'TX' });

      expect(results).toHaveLength(1);
      expect(results[0]?.establishmentName).toBe('Test Factory');
      expect(results[0]?.totalCurrentPenalty).toBe(25000);
      expect(results[0]?.siteState).toBe('TX');
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.DOL_API_KEY;

      const results = await service.searchInspections({ state: 'TX' });
      expect(results).toEqual([]);
    });

    it('returns empty on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('DOL API error'));

      const results = await service.searchInspections({ state: 'TX' });
      expect(results).toEqual([]);
    });

    it('passes query parameters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await service.searchInspections({
        state: 'CA',
        sicCode: '2911',
        establishmentName: 'Refinery',
        limit: 50,
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('site_state=CA');
      expect(calledUrl).toContain('sic_code=2911');
      expect(calledUrl).toContain('estab_name=Refinery');
      expect(calledUrl).toContain('limit=50');
    });
  });

  describe('getViolations', () => {
    it('fetches violations for an inspection', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            activity_nr: 12345,
            citation_id: 'CIT-001',
            viol_type: 'S',
            current_penalty: 10000,
            initial_penalty: 15000,
            standard: '1910.147',
            abate_date: '2025-04-01',
          },
        ],
      });

      const violations = await service.getViolations('12345');

      expect(violations).toHaveLength(1);
      expect(violations[0]?.violationType).toBe('S');
      expect(violations[0]?.currentPenalty).toBe(10000);
      expect(violations[0]?.standard).toBe('1910.147');
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.DOL_API_KEY;

      const violations = await service.getViolations('12345');
      expect(violations).toEqual([]);
    });
  });

  describe('getInspectionSummaryBySIC', () => {
    it('computes summary statistics from inspections', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            activity_nr: 1,
            estab_name: 'Plant A',
            site_address: '1 St',
            site_city: 'City',
            site_state: 'TX',
            site_zip: '77001',
            sic_code: '2911',
            naics_code: '324110',
            insp_type: 'Planned',
            open_date: '2025-01-01',
            close_case_date: null,
            total_current_penalty: 10000,
          },
          {
            activity_nr: 2,
            estab_name: 'Plant B',
            site_address: '2 St',
            site_city: 'City',
            site_state: 'TX',
            site_zip: '77002',
            sic_code: '2911',
            naics_code: '324110',
            insp_type: 'Referral',
            open_date: '2025-02-01',
            close_case_date: null,
            total_current_penalty: 30000,
          },
        ],
      });

      const summary = await service.getInspectionSummaryBySIC('2911', 'TX');

      expect(summary).not.toBeNull();
      expect(summary?.totalInspections).toBe(2);
      expect(summary?.totalPenalties).toBe(40000);
      expect(summary?.avgPenalty).toBe(20000);
      expect(summary?.sicCode).toBe('2911');
    });

    it('returns null when no inspections found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const summary = await service.getInspectionSummaryBySIC('9999');
      expect(summary).toBeNull();
    });
  });
});

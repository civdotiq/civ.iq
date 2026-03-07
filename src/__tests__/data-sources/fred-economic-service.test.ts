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

import { FredEconomicService } from '@/lib/data-sources/fred-economic-service';

describe('FredEconomicService', () => {
  let service: FredEconomicService;

  beforeEach(() => {
    service = new FredEconomicService();
    jest.clearAllMocks();
    process.env = { ...originalEnv, FRED_API_KEY: 'test-api-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('searchSeries', () => {
    it('searches and transforms series results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          count: 1,
          offset: 0,
          limit: 10,
          seriess: [
            {
              id: 'NYUR',
              title: 'Unemployment Rate in New York',
              observation_start: '1976-01-01',
              observation_end: '2025-01-01',
              frequency: 'Monthly',
              frequency_short: 'M',
              units: 'Percent',
              units_short: '%',
              seasonal_adjustment: 'Seasonally Adjusted',
              seasonal_adjustment_short: 'SA',
              last_updated: '2025-02-15',
              notes: 'Test notes',
            },
          ],
        }),
      });

      const result = await service.searchSeries('unemployment new york');

      expect(result.count).toBe(1);
      expect(result.series).toHaveLength(1);
      expect(result.series[0]?.id).toBe('NYUR');
      expect(result.series[0]?.units).toBe('Percent');
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.FRED_API_KEY;

      const result = await service.searchSeries('test');
      expect(result.series).toEqual([]);
      expect(result.count).toBe(0);
    });

    it('returns empty on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API error'));

      const result = await service.searchSeries('test');
      expect(result.series).toEqual([]);
    });
  });

  describe('getSeriesObservations', () => {
    it('fetches and parses observations', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          observations: [
            { date: '2025-01-01', value: '4.2' },
            { date: '2024-12-01', value: '4.1' },
            { date: '2024-11-01', value: '.' },
          ],
        }),
      });

      const obs = await service.getSeriesObservations('NYUR');

      expect(obs).toHaveLength(3);
      expect(obs[0]?.value).toBe(4.2);
      expect(obs[1]?.value).toBe(4.1);
      expect(obs[2]?.value).toBeNull(); // '.' means missing data
    });

    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.FRED_API_KEY;

      const obs = await service.getSeriesObservations('NYUR');
      expect(obs).toEqual([]);
    });

    it('passes date range params', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ observations: [] }),
      });

      await service.getSeriesObservations('NYUR', {
        startDate: '2024-01-01',
        endDate: '2025-01-01',
        limit: 12,
      });

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('observation_start=2024-01-01');
      expect(calledUrl).toContain('observation_end=2025-01-01');
      expect(calledUrl).toContain('limit=12');
    });
  });

  describe('getStateUnemployment', () => {
    it('uses correct series ID for state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          observations: [{ date: '2025-01-01', value: '3.5' }],
        }),
      });

      await service.getStateUnemployment('ny');

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('series_id=NYUR');
    });
  });

  describe('getStateGDP', () => {
    it('uses correct series ID for state GDP', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          observations: [{ date: '2024-01-01', value: '2000000' }],
        }),
      });

      await service.getStateGDP('ca');

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('series_id=CANGSP');
    });
  });

  describe('getStateIndicators', () => {
    it('returns empty when no API key', async () => {
      process.env = { ...originalEnv };
      delete process.env.FRED_API_KEY;

      const indicators = await service.getStateIndicators('NY');
      expect(indicators).toEqual([]);
    });

    it('returns empty on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const indicators = await service.getStateIndicators('NY');
      expect(indicators).toEqual([]);
    });
  });
});

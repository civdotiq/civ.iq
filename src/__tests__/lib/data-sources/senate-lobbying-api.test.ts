/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for senate-lobbying-api.ts
 *
 * Tests quarter name mapping, data aggregation, and error handling.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockCachedFetch = jest.fn();
jest.mock('@/lib/cache', () => ({
  cachedFetch: (...args: unknown[]) => mockCachedFetch(...args),
}));

import { SenateLobbyingAPI, type LobbyingFiling } from '@/lib/data-sources/senate-lobbying-api';

function createMockFiling(overrides: Partial<LobbyingFiling> = {}): LobbyingFiling {
  return {
    id: 'test-filing-1',
    registrant: { name: 'Lobby Firm', id: 'R001' },
    client: { name: 'Client Corp', id: 'C001' },
    income: 100000,
    expenses: 50000,
    filingPeriod: 'first_quarter',
    filingYear: 2025,
    issues: [{ code: 'DEF', description: 'Defense' }],
    lobbyists: [{ name: 'John Doe' }],
    government_entities: ['Senate Armed Services Committee'],
    specific_issues: ['military spending', 'defense procurement'],
    ...overrides,
  };
}

describe('SenateLobbyingAPI', () => {
  let api: SenateLobbyingAPI;

  beforeEach(() => {
    jest.clearAllMocks();
    api = new SenateLobbyingAPI();
  });

  describe('fetchFilingsByQuarter', () => {
    it('maps quarter numbers to full names for API', async () => {
      mockCachedFetch.mockImplementation(async (_key: string, fetcher: () => Promise<unknown>) => {
        return fetcher();
      });

      // Mock global fetch
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [createMockFiling()] }),
      });
      global.fetch = mockFetch;

      await api.fetchFilingsByQuarter(2025, 1);

      expect(mockFetch).toHaveBeenCalled();
      const url = mockFetch.mock.calls[0][0] as string;
      expect(url).toContain('filing_period=first_quarter');
    });

    it('returns empty array for invalid quarter', async () => {
      const result = await api.fetchFilingsByQuarter(2025, 5);
      expect(result).toEqual([]);
    });

    it('returns empty array for quarter 0', async () => {
      const result = await api.fetchFilingsByQuarter(2025, 0);
      expect(result).toEqual([]);
    });

    it('throws on API error', async () => {
      mockCachedFetch.mockImplementation(async (_key: string, fetcher: () => Promise<unknown>) => {
        return fetcher();
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(api.fetchFilingsByQuarter(2025, 1)).rejects.toThrow();
    });
  });

  describe('getCommitteeLobbyingData', () => {
    it('matches filings to committees by keyword', async () => {
      const defenseFiling = createMockFiling({
        client: { name: 'Defense Inc', id: 'C002' },
        income: 200000,
        specific_issues: ['defense procurement'],
        issues: [{ code: 'DEF', description: 'Defense spending' }],
      });

      const healthFiling = createMockFiling({
        client: { name: 'Health Corp', id: 'C003' },
        income: 150000,
        specific_issues: ['medicare reform'],
        issues: [{ code: 'HCR', description: 'Health care reform' }],
      });

      // fetchRecentFilings calls fetchFilingsByQuarter multiple times
      mockCachedFetch.mockResolvedValue([defenseFiling, healthFiling]);

      const result = await api.getCommitteeLobbyingData(['Armed Services', 'Healthcare']);

      expect(result.length).toBeGreaterThanOrEqual(1);
      // Defense filing should match Armed Services
      const armedServices = result.find(d => d.committee === 'Armed Services');
      if (armedServices) {
        expect(armedServices.totalSpending).toBeGreaterThan(0);
      }
    });

    it('returns empty array when no filings available', async () => {
      mockCachedFetch.mockResolvedValue([]);

      const result = await api.getCommitteeLobbyingData(['Armed Services']);
      expect(result).toEqual([]);
    });

    it('sorts results by total spending descending', async () => {
      const bigFiling = createMockFiling({
        income: 500000,
        specific_issues: ['defense'],
      });
      const smallFiling = createMockFiling({
        income: 100000,
        specific_issues: ['health care'],
      });

      mockCachedFetch.mockResolvedValue([bigFiling, smallFiling]);

      const result = await api.getCommitteeLobbyingData(['Armed Services', 'Healthcare']);

      if (result.length >= 2) {
        expect(result[0].totalSpending).toBeGreaterThanOrEqual(result[1].totalSpending);
      }
    });
  });
});

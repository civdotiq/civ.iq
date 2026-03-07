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

import { SecEdgarService } from '@/lib/data-sources/sec-edgar-service';

describe('SecEdgarService', () => {
  let service: SecEdgarService;

  beforeEach(() => {
    service = new SecEdgarService();
    jest.clearAllMocks();
  });

  describe('fetchCompanyProfile', () => {
    it('fetches and transforms company profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cik: 320193,
          entityType: 'operating',
          sic: '3571',
          sicDescription: 'Electronic Computers',
          name: 'Apple Inc.',
          tickers: ['AAPL'],
          exchanges: ['Nasdaq'],
          ein: '942404110',
          category: 'Large accelerated filer',
          stateOfIncorporation: 'CA',
          fiscalYearEnd: '0930',
          filings: {
            recent: {
              accessionNumber: ['0001234'],
              filingDate: ['2025-01-15'],
              reportDate: ['2025-01-14'],
              form: ['4'],
              primaryDocument: ['doc.xml'],
              primaryDocDescription: ['FORM 4'],
            },
          },
        }),
      });

      const profile = await service.fetchCompanyProfile('320193');

      expect(profile).not.toBeNull();
      expect(profile?.name).toBe('Apple Inc.');
      expect(profile?.tickers).toEqual(['AAPL']);
      expect(profile?.cik).toBe('320193');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('CIK0000320193.json'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': expect.stringContaining('civiq'),
          }),
        })
      );
    });

    it('returns null for 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const profile = await service.fetchCompanyProfile('999999');
      expect(profile).toBeNull();
    });

    it('returns null on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const profile = await service.fetchCompanyProfile('320193');
      expect(profile).toBeNull();
    });
  });

  describe('fetchForm4Filings', () => {
    it('extracts Form 4 filings from company profile', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cik: 320193,
          name: 'Test Corp',
          tickers: [],
          exchanges: [],
          filings: {
            recent: {
              accessionNumber: ['acc-1', 'acc-2', 'acc-3'],
              filingDate: ['2025-01-15', '2025-01-10', '2025-01-05'],
              reportDate: ['2025-01-14', '2025-01-09', '2025-01-04'],
              form: ['4', '10-K', '4/A'],
              primaryDocument: ['f4.xml', '10k.htm', 'f4a.xml'],
              primaryDocDescription: ['FORM 4', 'ANNUAL REPORT', 'FORM 4/A'],
            },
          },
        }),
      });

      const filings = await service.fetchForm4Filings('320193');

      expect(filings).toHaveLength(2);
      expect(filings[0]?.form).toBe('4');
      expect(filings[1]?.form).toBe('4/A');
    });

    it('returns empty array when no filings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          cik: 320193,
          name: 'Test Corp',
          tickers: [],
          exchanges: [],
        }),
      });

      const filings = await service.fetchForm4Filings('320193');
      expect(filings).toEqual([]);
    });
  });

  describe('findCikByTicker', () => {
    it('maps ticker to CIK', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
          '1': { cik_str: 789019, ticker: 'MSFT', title: 'Microsoft Corp' },
        }),
      });

      const cik = await service.findCikByTicker('AAPL');
      expect(cik).toBe('320193');
    });

    it('returns null for unknown ticker', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          '0': { cik_str: 320193, ticker: 'AAPL', title: 'Apple Inc.' },
        }),
      });

      const cik = await service.findCikByTicker('ZZZZ');
      expect(cik).toBeNull();
    });

    it('returns null on fetch error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const cik = await service.findCikByTicker('AAPL');
      expect(cik).toBeNull();
    });
  });

  describe('searchFilings', () => {
    it('searches EDGAR and returns results', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          hits: {
            total: { value: 1 },
            hits: [
              {
                _id: 'acc-123',
                _source: {
                  file_date: '2025-01-15',
                  form_type: '4',
                  entity_name: 'Apple Inc.',
                  file_num: '001-36743',
                  period_of_report: '2025-01-14',
                },
              },
            ],
          },
        }),
      });

      const results = await service.searchFilings('Apple Inc', '4');

      expect(results.total).toBe(1);
      expect(results.hits).toHaveLength(1);
      expect(results.hits[0]?.entityName).toBe('Apple Inc.');
    });

    it('returns empty on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Search failed'));

      const results = await service.searchFilings('test');
      expect(results.hits).toEqual([]);
      expect(results.total).toBe(0);
    });
  });

  describe('fetchFinancialFacts', () => {
    it('fetches company facts', async () => {
      const mockFacts = {
        cik: 320193,
        entityName: 'Apple Inc.',
        facts: {
          'us-gaap': {
            Revenue: {
              label: 'Revenue',
              description: 'Total Revenue',
              units: {
                USD: [{ val: 394328000000, accn: 'acc-1', fy: 2024, fp: 'FY', form: '10-K', filed: '2024-11-01', end: '2024-09-28' }],
              },
            },
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockFacts,
      });

      const facts = await service.fetchFinancialFacts('320193');
      expect(facts?.entityName).toBe('Apple Inc.');
      expect(facts?.facts['us-gaap']).toBeDefined();
    });

    it('returns null for 404', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

      const facts = await service.fetchFinancialFacts('999999');
      expect(facts).toBeNull();
    });
  });
});

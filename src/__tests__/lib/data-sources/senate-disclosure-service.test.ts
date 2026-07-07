/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for senate-disclosure-service.ts
 *
 * Tests Congress Trading Monitor data fetching, parsing, and mapping to
 * StockTrade type. External network calls are mocked.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest
    .fn()
    .mockImplementation(async (_key: string, fetcher: () => Promise<unknown>) => fetcher()),
}));

import { SenateDisclosureService } from '@/lib/data-sources/senate-disclosure-service';

// -- Fixtures --

/** Fixture mimicking filers.json structure */
const FIXTURE_FILERS = [
  {
    id: 'senate_thomash_tuberville',
    full_name: 'Thomas H Tuberville',
    branch: 'congress',
    chamber: 'senate',
    party: 'R',
    state: 'AL',
    office: 'U.S. Senator · AL',
    photo_url: 'https://unitedstates.github.io/images/congress/225x275/T000476.jpg',
  },
  {
    id: 'senate_jon_ossoff',
    full_name: 'Jon Ossoff',
    branch: 'congress',
    chamber: 'senate',
    party: 'D',
    state: 'GA',
    office: 'U.S. Senator · GA',
    photo_url: 'https://unitedstates.github.io/images/congress/225x275/O000174.jpg',
  },
  {
    id: 'senate_john_hickenlooper',
    full_name: 'John Hickenlooper',
    branch: 'congress',
    chamber: 'senate',
    party: 'D',
    state: 'CO',
    office: 'U.S. Senator · CO',
    photo_url: 'https://unitedstates.github.io/images/congress/225x275/H001042.jpg',
  },
  {
    // No photo URL — bioguide unresolvable, must be skipped (never guessed)
    id: 'senate_a_mystery',
    full_name: 'A Mystery',
    branch: 'congress',
    chamber: 'senate',
    party: 'R',
    state: 'TX',
    office: 'U.S. Senator · TX',
    photo_url: null,
  },
  {
    // House filer — must be filtered out of the Senate index
    id: 'house_nancy_pelosi',
    full_name: 'Nancy Pelosi',
    branch: 'congress',
    chamber: 'house',
    party: 'D',
    state: 'CA',
    office: 'U.S. Representative · CA',
    photo_url: 'https://unitedstates.github.io/images/congress/225x275/P000197.jpg',
  },
];

/** Fixture per-filer trade rows (filer/{id}.json) */
const FIXTURE_FILER_TRADES: Record<string, unknown> = {
  senate_thomash_tuberville: {
    filer: FIXTURE_FILERS[0],
    trades: [
      {
        id: 'senate_1111-2222-3333-4444_t0',
        filing_id: 'senate_1111-2222-3333-4444',
        transaction_date: '2026-01-20',
        filing_date: '2026-03-15',
        owner: 'Self',
        ticker: 'AAPL',
        asset_name: 'Apple Inc.',
        asset_type: 'Stock',
        transaction_type: 'Purchase',
        amount_range_label: '$1,001 - $15,000',
        doc_url:
          'https://efdsearch.senate.gov/search/view/ptr/11111111-2222-3333-4444-555555555555/',
        filing_type: 'PTR',
      },
      {
        id: 'senate_5555-6666-7777-8888_t0',
        filing_id: 'senate_5555-6666-7777-8888',
        transaction_date: '2026-02-10',
        filing_date: '2026-03-15',
        owner: 'Spouse',
        ticker: 'MSFT',
        asset_name: 'Microsoft Corporation',
        asset_type: 'Stock',
        transaction_type: 'Sale (Full)',
        amount_range_label: '$15,001 - $50,000',
        doc_url:
          'https://efdsearch.senate.gov/search/view/ptr/55555555-6666-7777-8888-999999999999/',
        filing_type: 'PTR',
      },
      {
        id: 'senate_aaaa-bbbb-cccc-dddd_t0',
        filing_id: 'senate_aaaa-bbbb-cccc-dddd',
        transaction_date: '2026-03-01',
        filing_date: '2026-03-20',
        owner: 'Joint',
        ticker: null,
        asset_name: 'Private Equity Fund LP',
        asset_type: 'Other Securities',
        transaction_type: 'Purchase',
        amount_range_label: '$50,001 - $100,000',
        doc_url:
          'https://efdsearch.senate.gov/search/view/ptr/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/',
        filing_type: 'PTR',
      },
      {
        // Exact duplicate row ID — must be deduplicated
        id: 'senate_aaaa-bbbb-cccc-dddd_t0',
        filing_id: 'senate_aaaa-bbbb-cccc-dddd',
        transaction_date: '2026-03-01',
        filing_date: '2026-03-20',
        owner: 'Joint',
        ticker: null,
        asset_name: 'Private Equity Fund LP',
        asset_type: 'Other Securities',
        transaction_type: 'Purchase',
        amount_range_label: '$50,001 - $100,000',
        doc_url:
          'https://efdsearch.senate.gov/search/view/ptr/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/',
        filing_type: 'PTR',
      },
    ],
  },
  senate_jon_ossoff: {
    filer: FIXTURE_FILERS[1],
    trades: [
      {
        id: 'senate_2222-3333-4444-5555_t0',
        filing_id: 'senate_2222-3333-4444-5555',
        transaction_date: '2026-04-15',
        filing_date: '2026-06-01',
        owner: 'Child',
        ticker: '<a href="https://finance.yahoo.com/q?s=GOOG" target="_blank">GOOG</a>',
        asset_name: 'Alphabet Inc. <div class="text-muted"><em>Class C</em></div>',
        asset_type: 'Stock',
        transaction_type: 'Sale (Partial)',
        amount_range_label: '$100,001 - $250,000',
        doc_url:
          'https://efdsearch.senate.gov/search/view/ptr/22222222-3333-4444-5555-666666666666/',
        filing_type: 'PTR',
      },
    ],
  },
  senate_john_hickenlooper: {
    filer: FIXTURE_FILERS[2],
    trades: [
      {
        id: 'senate_6666-7777-8888-9999_t0',
        filing_id: 'senate_6666-7777-8888-9999',
        transaction_date: '2026-01-05',
        filing_date: '2026-02-01',
        owner: 'N/A',
        ticker: null,
        asset_name: 'PDF Filing - See Original',
        asset_type: 'PDF Disclosed Filing',
        transaction_type: 'N/A',
        amount_range_label: null,
        doc_url:
          'https://efdsearch.senate.gov/search/view/ptr/66666666-7777-8888-9999-000000000000/',
        filing_type: 'PTR',
      },
    ],
  },
};

function setupFetchMock(
  filers: unknown = FIXTURE_FILERS,
  filerTrades: Record<string, unknown> = FIXTURE_FILER_TRADES
) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.endsWith('/filers.json')) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(filers) });
    }
    const match = url.match(/\/filer\/([^/]+)\.json$/);
    const filerId = match?.[1];
    if (filerId && filerTrades[filerId]) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve(filerTrades[filerId]) });
    }
    return Promise.resolve({ ok: false, status: 404, statusText: 'Not Found' });
  });
}

describe('SenateDisclosureService', () => {
  let service: SenateDisclosureService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SenateDisclosureService();
  });

  describe('getTradesForMember', () => {
    it('returns mapped trades for a known senator', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      expect(trades.length).toBe(3);
      expect(trades[0]!.bioguideId).toBe('T000476');
      expect(trades[0]!.memberName).toBe('Thomas H Tuberville');
    });

    it('maps transaction fields correctly', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      // First trade: AAPL Purchase
      const aapl = trades.find(t => t.ticker === 'AAPL');
      expect(aapl).toBeDefined();
      expect(aapl!.owner).toBe('Self');
      expect(aapl!.assetDescription).toBe('Apple Inc.');
      expect(aapl!.transactionType).toBe('Purchase');
      expect(aapl!.transactionDate).toBe('2026-01-20');
      expect(aapl!.filingDate).toBe('2026-03-15');
      expect(aapl!.amount).toBe('$1,001 - $15,000');
      expect(aapl!.assetType).toBe('ST');
      expect(aapl!.assetTypeLabel).toBe('Stock');
      expect(aapl!.isPaperFiling).toBe(false);

      // Second trade: MSFT Sale
      const msft = trades.find(t => t.ticker === 'MSFT');
      expect(msft).toBeDefined();
      expect(msft!.owner).toBe('Spouse');
      expect(msft!.transactionType).toBe('Sale (Full)');
      expect(msft!.amount).toBe('$15,001 - $50,000');
    });

    it('computes daysToDisclose correctly', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      // AAPL: 2026-01-20 → 2026-03-15 = 54 days
      const aapl = trades.find(t => t.ticker === 'AAPL');
      expect(aapl!.daysToDisclose).toBe(54);
      expect(aapl!.isLateFiling).toBe(true);

      // MSFT: 2026-02-10 → 2026-03-15 = 33 days
      const msft = trades.find(t => t.ticker === 'MSFT');
      expect(msft!.daysToDisclose).toBe(33);
      expect(msft!.isLateFiling).toBe(false);
    });

    it('strips HTML from ticker and asset description', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('O000174');

      expect(trades.length).toBe(1);
      expect(trades[0]!.ticker).toBe('GOOG');
      expect(trades[0]!.assetDescription).toBe('Alphabet Inc. Class C');
    });

    it('maps Child owner to Dependent Child', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('O000174');

      expect(trades[0]!.owner).toBe('Dependent Child');
    });

    it('handles null ticker', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      const noTicker = trades.find(t => t.assetDescription === 'Private Equity Fund LP');
      expect(noTicker).toBeDefined();
      expect(noTicker!.ticker).toBeNull();
      expect(noTicker!.assetType).toBe('OT');
    });

    it('deduplicates rows with the same dataset ID', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      // Fixture contains a duplicated Private Equity Fund row
      const lpTrades = trades.filter(t => t.assetDescription === 'Private Equity Fund LP');
      expect(lpTrades.length).toBe(1);
    });

    it('filters out paper filing entries without tickers', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('H001042');

      // The single PDF Disclosed Filing entry (type=N/A) should be filtered out
      expect(trades.length).toBe(0);
    });

    it('returns empty array for unknown bioguide ID', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('X999999');

      expect(trades).toEqual([]);
    });

    it('excludes House filers from the Senate index', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('P000197');

      expect(trades).toEqual([]);
    });

    it('handles bioguide ID case-insensitively', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('t000476');

      expect(trades.length).toBe(3);
    });

    it('maps null amount label to $0 - $0', async () => {
      const filerTrades = {
        senate_thomash_tuberville: {
          filer: FIXTURE_FILERS[0],
          trades: [
            {
              id: 'senate_test_t0',
              filing_id: 'senate_test',
              transaction_date: '2026-01-20',
              filing_date: '2026-02-01',
              owner: 'Self',
              ticker: 'AAPL',
              asset_name: 'Apple Inc.',
              asset_type: 'Stock',
              transaction_type: 'Purchase',
              amount_range_label: null,
              doc_url: 'https://efdsearch.senate.gov/search/view/ptr/test/',
              filing_type: 'PTR',
            },
          ],
        },
      };
      setupFetchMock(FIXTURE_FILERS, filerTrades);

      const trades = await service.getTradesForMember('T000476');
      expect(trades[0]!.amount).toBe('$0 - $0');
    });

    it('extracts filing ID from doc_url UUID', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      const aapl = trades.find(t => t.ticker === 'AAPL');
      expect(aapl!.filingId).toBe('11111111-2222-3333-4444-555555555555');
    });

    it('sorts trades by transaction date descending', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      for (let i = 1; i < trades.length; i++) {
        const prev = new Date(trades[i - 1]!.transactionDate).getTime();
        const curr = new Date(trades[i]!.transactionDate).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('maps Sale (Partial) transaction type', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('O000174');

      expect(trades[0]!.transactionType).toBe('Sale (Partial)');
    });

    it('sets capitalGainsOver200 to false (not in Senate data)', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      for (const trade of trades) {
        expect(trade.capitalGainsOver200).toBe(false);
      }
    });
  });

  describe('getAllSenatorTrades', () => {
    it('returns trades grouped by bioguide ID', async () => {
      setupFetchMock();
      const map = await service.getAllSenatorTrades();

      expect(map.get('T000476')?.length).toBe(3);
      expect(map.get('O000174')?.length).toBe(1);
      // Hickenlooper's only row is a filtered paper filing → no entry
      expect(map.has('H001042')).toBe(false);
    });

    it('skips filers whose trade file fails to load', async () => {
      const filerTrades = { ...FIXTURE_FILER_TRADES };
      delete filerTrades['senate_jon_ossoff'];
      setupFetchMock(FIXTURE_FILERS, filerTrades);

      const map = await service.getAllSenatorTrades();
      expect(map.get('T000476')?.length).toBe(3);
      expect(map.has('O000174')).toBe(false);
    });
  });

  describe('hasMemberData', () => {
    it('returns true for known senator', async () => {
      setupFetchMock();
      expect(await service.hasMemberData('T000476')).toBe(true);
    });

    it('returns false for unknown senator', async () => {
      setupFetchMock();
      expect(await service.hasMemberData('X999999')).toBe(false);
    });

    it('returns false for a filer without a resolvable bioguide ID', async () => {
      setupFetchMock();
      // 'A Mystery' has no photo_url, so no bioguide mapping exists
      const map = await service.getAllSenatorTrades();
      expect([...map.keys()].every(k => /^[A-Z]\d{6}$/.test(k))).toBe(true);
    });

    it('returns false on fetch error', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      expect(await service.hasMemberData('T000476')).toBe(false);
    });
  });

  describe('error handling', () => {
    it('throws on fetch failure (getTradesForMember)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.getTradesForMember('T000476')).rejects.toThrow(
        'Congress Trading Monitor returned 500'
      );
    });
  });
});

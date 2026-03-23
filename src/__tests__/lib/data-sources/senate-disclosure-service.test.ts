/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for senate-disclosure-service.ts
 *
 * Tests Senate Stock Watcher data fetching, parsing, and mapping to StockTrade type.
 * External network calls are mocked.
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

/** Fixture mimicking all_transactions_for_senators.json structure */
const FIXTURE_SENATORS = [
  {
    first_name: 'Tommy',
    last_name: 'Tuberville',
    office: 'Tuberville, Tommy (Senator)',
    ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/aaaa-bbbb-cccc-dddd/',
    date_recieved: '03/15/2021',
    bioguide: 'T000476',
    transactions: [
      {
        transaction_date: '01/20/2021',
        owner: 'Self',
        ticker: 'AAPL',
        asset_description: 'Apple Inc.',
        asset_type: 'Stock',
        type: 'Purchase',
        amount: '$1,001 - $15,000',
        comment: '--',
        ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/1111-2222-3333-4444/',
      },
      {
        transaction_date: '02/10/2021',
        owner: 'Spouse',
        ticker: 'MSFT',
        asset_description: 'Microsoft Corporation',
        asset_type: 'Stock',
        type: 'Sale (Full)',
        amount: '$15,001 - $50,000',
        comment: '--',
        ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/5555-6666-7777-8888/',
      },
      {
        transaction_date: '03/01/2021',
        owner: 'Joint',
        ticker: '--',
        asset_description: 'Private Equity Fund LP',
        asset_type: 'Other Securities',
        type: 'Purchase',
        amount: '$50,001 - $100,000',
        comment: 'Additional investment',
        ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/aaaa-bbbb-cccc-dddd/',
      },
    ],
  },
  {
    first_name: 'Jon',
    last_name: 'Ossoff',
    office: 'Ossoff, Jon (Senator)',
    ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/eeee-ffff-0000-1111/',
    date_recieved: '06/01/2021',
    bioguide: 'O000174',
    transactions: [
      {
        transaction_date: '04/15/2021',
        owner: 'Child',
        ticker: '<a href="https://finance.yahoo.com/q?s=GOOG" target="_blank">GOOG</a>',
        asset_description: 'Alphabet Inc. <div class="text-muted"><em>Class C</em></div>',
        asset_type: 'Stock',
        type: 'Sale (Partial)',
        amount: '$100,001 - $250,000',
        comment: '--',
        ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/2222-3333-4444-5555/',
      },
    ],
  },
  {
    first_name: 'John',
    last_name: 'Hickenlooper',
    office: 'Hickenlooper, John (Senator)',
    ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/6666-7777-8888-9999/',
    date_recieved: '02/01/2021',
    bioguide: 'H001042',
    transactions: [
      {
        transaction_date: '01/05/2021',
        owner: 'N/A',
        ticker: '--',
        asset_description: 'PDF Filing - See Original',
        asset_type: 'PDF Disclosed Filing',
        type: 'N/A',
        amount: 'Unknown',
        comment: '--',
        ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/6666-7777-8888-9999/',
      },
    ],
  },
  {
    first_name: 'Empty',
    last_name: 'Senator',
    office: 'Senator, Empty (Senator)',
    ptr_link: '',
    date_recieved: '01/01/2021',
    bioguide: 'E000001',
    transactions: [],
  },
];

function setupFetchMock(data: unknown = FIXTURE_SENATORS) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(data),
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
      expect(trades[0]!.memberName).toBe('Tommy Tuberville');
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
      expect(aapl!.transactionDate).toBe('2021-01-20');
      expect(aapl!.filingDate).toBe('2021-03-15');
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

      // AAPL: 01/20/2021 → 03/15/2021 = 54 days
      const aapl = trades.find(t => t.ticker === 'AAPL');
      expect(aapl!.daysToDisclose).toBe(54);
      expect(aapl!.isLateFiling).toBe(true);

      // MSFT: 02/10/2021 → 03/15/2021 = 33 days
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

    it('handles "--" ticker as null', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      const noTicker = trades.find(t => t.assetDescription === 'Private Equity Fund LP');
      expect(noTicker).toBeDefined();
      expect(noTicker!.ticker).toBeNull();
      expect(noTicker!.assetType).toBe('OT');
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

    it('returns empty array for senator with no transactions', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('E000001');

      expect(trades).toEqual([]);
    });

    it('handles bioguide ID case-insensitively', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('t000476');

      expect(trades.length).toBe(3);
    });

    it('maps amount "Unknown" to $0 - $0', async () => {
      setupFetchMock();
      // Hickenlooper has a PDF filing with amount "Unknown"
      // But it gets filtered, so let's use a modified fixture
      const modifiedSenators = [
        {
          ...FIXTURE_SENATORS[0],
          bioguide: 'TEST01',
          transactions: [
            {
              transaction_date: '01/20/2021',
              owner: 'Self',
              ticker: 'AAPL',
              asset_description: 'Apple Inc.',
              asset_type: 'Stock',
              type: 'Purchase',
              amount: 'Unknown',
              comment: '--',
              ptr_link: 'https://efdsearch.senate.gov/search/view/ptr/test/',
            },
          ],
        },
      ];
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(modifiedSenators),
      });

      const svc = new SenateDisclosureService();
      const trades = await svc.getTradesForMember('TEST01');
      expect(trades[0]!.amount).toBe('$0 - $0');
    });

    it('extracts filing ID from ptr_link UUID', async () => {
      setupFetchMock();
      const trades = await service.getTradesForMember('T000476');

      const aapl = trades.find(t => t.ticker === 'AAPL');
      expect(aapl!.filingId).toBe('1111-2222-3333-4444');
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

  describe('hasMemberData', () => {
    it('returns true for known senator', async () => {
      setupFetchMock();
      expect(await service.hasMemberData('T000476')).toBe(true);
    });

    it('returns false for unknown senator', async () => {
      setupFetchMock();
      expect(await service.hasMemberData('X999999')).toBe(false);
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
        'Senate Stock Watcher returned 500'
      );
    });
  });
});

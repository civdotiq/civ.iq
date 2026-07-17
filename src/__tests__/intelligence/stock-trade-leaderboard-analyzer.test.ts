/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Stock Trade Leaderboard Analyzer.
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisKeys = jest.fn();
const mockRedisMget = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    keys: mockRedisKeys,
    mget: mockRedisMget,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockGetAllSenatorTrades = jest.fn();
const mockGetAllRepresentativeTrades = jest.fn();
jest.mock('@/lib/data-sources/senate-disclosure-service', () => {
  const ctm = {
    getAllSenatorTrades: (...args: unknown[]) => mockGetAllSenatorTrades(...args),
    getAllRepresentativeTrades: (...args: unknown[]) => mockGetAllRepresentativeTrades(...args),
  };
  return { congressTradingMonitor: ctm, senateDisclosureService: ctm };
});

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

// ── Imports ───────────────────────────────────────────────────────

import { buildStockTradeLeaderboard } from '@/lib/intelligence/analyzers/stock-trade-leaderboard-analyzer';
import type { StockTrade } from '@/types/stock-trades';
import type { StockTradeLeaderboardResponse } from '@/lib/intelligence/types';

// ── Helpers ───────────────────────────────────────────────────────

function makeTrade(overrides: Partial<StockTrade> = {}): StockTrade {
  return {
    filingId: '20034000',
    bioguideId: 'X000001',
    memberName: 'Test Member',
    stateDistrict: 'CA12',
    owner: 'Self',
    assetDescription: 'Apple Inc.',
    ticker: 'AAPL',
    assetType: 'ST',
    assetTypeLabel: 'Stock',
    transactionType: 'Purchase',
    transactionDate: '2026-01-15',
    filingDate: '2026-02-01',
    amount: '$1,001 - $15,000',
    capitalGainsOver200: false,
    isPaperFiling: false,
    daysToDisclose: 17,
    isLateFiling: false,
    sourceUrl: 'https://example.com/filing.pdf',
    ...overrides,
  };
}

function makeTradesForMember(
  bioguideId: string,
  count: number,
  options: { lateFiling?: boolean; amount?: string; ticker?: string } = {}
): StockTrade[] {
  return Array.from({ length: count }, (_, i) =>
    makeTrade({
      bioguideId,
      ticker: options.ticker ?? `TK${i}`,
      isLateFiling: options.lateFiling ?? false,
      daysToDisclose: options.lateFiling ? 60 : 17,
      amount: options.amount ?? '$1,001 - $15,000',
      transactionDate: `2026-01-${String(i + 1).padStart(2, '0')}`,
    })
  );
}

const reps: Record<string, { name: string; party: string; state: string; chamber: string }> = {
  S000001: { name: 'Alice Sen', party: 'D', state: 'CA', chamber: 'Senate' },
  S000002: { name: 'Bob Sen', party: 'R', state: 'TX', chamber: 'Senate' },
  H000001: { name: 'Carol Rep', party: 'D', state: 'NY', chamber: 'House' },
  H000002: { name: 'Dan Rep', party: 'R', state: 'FL', chamber: 'House' },
};

function setupRepMock() {
  mockGetEnhancedRepresentative.mockImplementation((id: string) =>
    Promise.resolve(reps[id] ?? null)
  );
}

// ── Tests ─────────────────────────────────────────────────────────

describe('buildStockTradeLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    mockGetAllSenatorTrades.mockResolvedValue(new Map());
    mockGetAllRepresentativeTrades.mockResolvedValue(new Map());
    setupRepMock();
  });

  it('returns cached leaderboard on cache hit', async () => {
    const cached: StockTradeLeaderboardResponse = {
      chamber: 'all',
      party: null,
      sortBy: 'trades',
      entries: [],
      stats: { meanTrades: 5, medianTrades: 5, meanValue: 40000, totalMembers: 0 },
      dataAvailability: { membersWithData: 10, minimumRequired: 20, status: 'partial' },
      generatedAt: '2026-01-15T00:00:00.000Z',
    };

    mockRedisGet.mockResolvedValue(cached);

    const result = await buildStockTradeLeaderboard();

    expect(result).toEqual(cached);
    expect(mockGetAllSenatorTrades).not.toHaveBeenCalled();
    expect(mockGetAllRepresentativeTrades).not.toHaveBeenCalled();
  });

  it('returns null when no trade data is available', async () => {
    mockGetAllSenatorTrades.mockResolvedValue(new Map());
    mockGetAllRepresentativeTrades.mockResolvedValue(new Map());

    const result = await buildStockTradeLeaderboard();

    expect(result).toBeNull();
  });

  it('ranks members by trade count (default sort)', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 20));
    senateTrades.set('S000002', makeTradesForMember('S000002', 10));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const houseTrades = makeTradesForMember('H000001', 15);
    mockGetAllRepresentativeTrades.mockResolvedValue(new Map([['H000001', houseTrades]]));

    const result = await buildStockTradeLeaderboard();

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(3);
    expect(result!.entries[0]!.bioguideId).toBe('S000001');
    expect(result!.entries[0]!.tradeCount).toBe(20);
    expect(result!.entries[0]!.rank).toBe(1);
    expect(result!.entries[1]!.bioguideId).toBe('H000001');
    expect(result!.entries[1]!.tradeCount).toBe(15);
    expect(result!.entries[1]!.rank).toBe(2);
    expect(result!.entries[2]!.bioguideId).toBe('S000002');
    expect(result!.entries[2]!.tradeCount).toBe(10);
    expect(result!.entries[2]!.rank).toBe(3);
  });

  it('ranks by estimated value when sortBy=value', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    // 5 trades at $100K-$250K (midpoint $175K) = $875K
    senateTrades.set(
      'S000001',
      makeTradesForMember('S000001', 5, { amount: '$100,001 - $250,000' })
    );
    // 10 trades at $1K-$15K (midpoint $8K) = $80K
    senateTrades.set('S000002', makeTradesForMember('S000002', 10, { amount: '$1,001 - $15,000' }));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const result = await buildStockTradeLeaderboard({ sortBy: 'value' });

    expect(result).not.toBeNull();
    expect(result!.entries[0]!.bioguideId).toBe('S000001');
    expect(result!.entries[0]!.estimatedValue).toBe(875000);
    expect(result!.entries[1]!.bioguideId).toBe('S000002');
    expect(result!.entries[1]!.estimatedValue).toBe(80000);
  });

  it('ranks by late filing count when sortBy=late', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 10, { lateFiling: false }));
    senateTrades.set('S000002', makeTradesForMember('S000002', 5, { lateFiling: true }));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const result = await buildStockTradeLeaderboard({ sortBy: 'late' });

    expect(result).not.toBeNull();
    expect(result!.entries[0]!.bioguideId).toBe('S000002');
    expect(result!.entries[0]!.lateFilingCount).toBe(5);
    expect(result!.entries[1]!.bioguideId).toBe('S000001');
    expect(result!.entries[1]!.lateFilingCount).toBe(0);
  });

  it('filters by chamber', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 20));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const houseTrades = makeTradesForMember('H000001', 15);
    mockGetAllRepresentativeTrades.mockResolvedValue(new Map([['H000001', houseTrades]]));

    const result = await buildStockTradeLeaderboard({ chamber: 'house' });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0]!.chamber).toBe('House');
    expect(result!.chamber).toBe('house');
  });

  it('filters by party', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 20)); // D
    senateTrades.set('S000002', makeTradesForMember('S000002', 10)); // R
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const result = await buildStockTradeLeaderboard({ party: 'R' });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0]!.party).toBe('R');
    expect(result!.party).toBe('R');
  });

  it('respects limit parameter', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 20));
    senateTrades.set('S000002', makeTradesForMember('S000002', 10));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const houseTrades = makeTradesForMember('H000001', 15);
    mockGetAllRepresentativeTrades.mockResolvedValue(new Map([['H000001', houseTrades]]));

    const result = await buildStockTradeLeaderboard({ limit: 2 });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    // Stats reflect all members, not just the limit
    expect(result!.stats.totalMembers).toBe(3);
  });

  it('computes correct statistics', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 20));
    senateTrades.set('S000002', makeTradesForMember('S000002', 10));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const houseTrades = makeTradesForMember('H000001', 15);
    mockGetAllRepresentativeTrades.mockResolvedValue(new Map([['H000001', houseTrades]]));

    const result = await buildStockTradeLeaderboard();

    expect(result).not.toBeNull();
    // mean of [20, 15, 10] = 15
    expect(result!.stats.meanTrades).toBeCloseTo(15, 4);
    // median of [10, 15, 20] = 15
    expect(result!.stats.medianTrades).toBeCloseTo(15, 4);
    expect(result!.stats.totalMembers).toBe(3);
  });

  it('excludes paper filings from trade counts', async () => {
    const trades = [
      makeTrade({ bioguideId: 'S000001', isPaperFiling: false }),
      makeTrade({ bioguideId: 'S000001', isPaperFiling: false }),
      makeTrade({ bioguideId: 'S000001', isPaperFiling: true }),
    ];
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', trades);
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const result = await buildStockTradeLeaderboard();

    expect(result).not.toBeNull();
    expect(result!.entries[0]!.tradeCount).toBe(2);
  });

  it('reports partial dataAvailability when fewer than 20 members have data', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 5));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const result = await buildStockTradeLeaderboard();

    expect(result).not.toBeNull();
    expect(result!.dataAvailability.status).toBe('partial');
    expect(result!.dataAvailability.membersWithData).toBe(1);
  });

  it('does not duplicate members present in both Senate and House data', async () => {
    // Same bioguideId in Senate data and House data
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 20));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    // House data also has S000001 (shouldn't happen in practice, but test dedup)
    mockGetAllRepresentativeTrades.mockResolvedValue(
      new Map([['S000001', makeTradesForMember('S000001', 5)]])
    );

    const result = await buildStockTradeLeaderboard();

    expect(result).not.toBeNull();
    // Should only appear once, with Senate data (loaded first)
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0]!.tradeCount).toBe(20);
  });

  it('computes top tickers correctly', async () => {
    const trades = [
      makeTrade({ bioguideId: 'S000001', ticker: 'AAPL' }),
      makeTrade({ bioguideId: 'S000001', ticker: 'AAPL' }),
      makeTrade({ bioguideId: 'S000001', ticker: 'MSFT' }),
      makeTrade({ bioguideId: 'S000001', ticker: 'AAPL' }),
      makeTrade({ bioguideId: 'S000001', ticker: 'GOOG' }),
    ];
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', trades);
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    const result = await buildStockTradeLeaderboard();

    expect(result).not.toBeNull();
    expect(result!.entries[0]!.topTickers[0]).toBe('AAPL');
    expect(result!.entries[0]!.topTickers).toHaveLength(3);
  });

  it('caches the leaderboard result', async () => {
    const senateTrades = new Map<string, StockTrade[]>();
    senateTrades.set('S000001', makeTradesForMember('S000001', 10));
    mockGetAllSenatorTrades.mockResolvedValue(senateTrades);

    await buildStockTradeLeaderboard();

    expect(mockRedisSet).toHaveBeenCalledWith(
      'leaderboard:stock-trades:all:all:trades',
      expect.any(Object),
      86400
    );
  });
});

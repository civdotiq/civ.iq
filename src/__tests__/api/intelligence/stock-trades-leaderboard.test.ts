/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for GET /api/intelligence/stock-trades/leaderboard
 */

const mockBuildStockTradeLeaderboard = jest.fn();

jest.mock('@/lib/intelligence/analyzers/stock-trade-leaderboard-analyzer', () => ({
  buildStockTradeLeaderboard: (...args: unknown[]) => mockBuildStockTradeLeaderboard(...args),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { GET } from '@/app/api/intelligence/stock-trades/leaderboard/route';
import { NextRequest } from 'next/server';
import type { StockTradeLeaderboardResponse } from '@/lib/intelligence/types';

function makeRequest(params: Record<string, string> = {}): NextRequest {
  const url = new URL('http://localhost/api/intelligence/stock-trades/leaderboard');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return new NextRequest(url);
}

const mockResponse: StockTradeLeaderboardResponse = {
  chamber: 'all',
  party: null,
  sortBy: 'trades',
  entries: [
    {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      party: 'D',
      state: 'CA',
      chamber: 'House',
      tradeCount: 50,
      estimatedValue: 5000000,
      lateFilingCount: 2,
      topTickers: ['AAPL', 'MSFT', 'GOOG'],
      rank: 1,
    },
  ],
  stats: { meanTrades: 25, medianTrades: 20, meanValue: 2500000, totalMembers: 100 },
  dataAvailability: { membersWithData: 100, minimumRequired: 20, status: 'sufficient' },
  generatedAt: '2026-01-15T00:00:00.000Z',
};

describe('GET /api/intelligence/stock-trades/leaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildStockTradeLeaderboard.mockResolvedValue(mockResponse);
  });

  it('returns leaderboard data with 200', async () => {
    const response = await GET(makeRequest());
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].bioguideId).toBe('P000197');
  });

  it('passes chamber filter to analyzer', async () => {
    await GET(makeRequest({ chamber: 'senate' }));

    expect(mockBuildStockTradeLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ chamber: 'senate' })
    );
  });

  it('passes party filter to analyzer', async () => {
    await GET(makeRequest({ party: 'D' }));

    expect(mockBuildStockTradeLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ party: 'D' })
    );
  });

  it('passes sort option to analyzer', async () => {
    await GET(makeRequest({ sort: 'value' }));

    expect(mockBuildStockTradeLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ sortBy: 'value' })
    );
  });

  it('passes limit to analyzer', async () => {
    await GET(makeRequest({ limit: '50' }));

    expect(mockBuildStockTradeLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 50 })
    );
  });

  it('ignores invalid chamber param', async () => {
    await GET(makeRequest({ chamber: 'invalid' }));

    expect(mockBuildStockTradeLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ chamber: undefined })
    );
  });

  it('ignores invalid party param', async () => {
    await GET(makeRequest({ party: 'X' }));

    expect(mockBuildStockTradeLeaderboard).toHaveBeenCalledWith(
      expect.objectContaining({ party: undefined })
    );
  });

  it('returns 404 when no data available', async () => {
    mockBuildStockTradeLeaderboard.mockResolvedValue(null);

    const response = await GET(makeRequest());

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.error).toBeDefined();
  });

  it('returns 500 on analyzer error', async () => {
    mockBuildStockTradeLeaderboard.mockRejectedValue(new Error('Redis down'));

    const response = await GET(makeRequest());

    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe('Internal server error');
  });

  // Cache-Control header (s-maxage=86400) tested via source-level contract check.
  // jsdom does not reliably surface custom response headers from NextResponse.
});

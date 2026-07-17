/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for /api/representative/[bioguideId]/stock-trades route.
 * Verifies both House and Senate data source routing.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// House trades now come from the Congress Trading Monitor
// (getTradesForRepresentative); the House Clerk service only supplies annual
// disclosures. Senate trades come from CTM's getTradesForMember.
const mockHouseGetAnnualDisclosures = jest.fn().mockResolvedValue([]);
jest.mock('@/lib/data-sources/house-disclosure-service', () => ({
  houseDisclosureService: {
    getAnnualDisclosuresForMember: (...args: unknown[]) => mockHouseGetAnnualDisclosures(...args),
  },
}));

const mockSenateGetTrades = jest.fn();
const mockHouseGetTrades = jest.fn();
jest.mock('@/lib/data-sources/senate-disclosure-service', () => {
  const ctm = {
    getTradesForMember: (...args: unknown[]) => mockSenateGetTrades(...args),
    getTradesForRepresentative: (...args: unknown[]) => mockHouseGetTrades(...args),
  };
  return { congressTradingMonitor: ctm, senateDisclosureService: ctm };
});

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

jest.mock('@/lib/circuit-breaker', () => ({
  circuitBreakers: {
    houseClerk: { execute: jest.fn((fn: () => unknown) => fn()) },
    senateStockWatcher: { execute: jest.fn((fn: () => unknown) => fn()) },
  },
}));

import { GET } from '@/app/api/representative/[bioguideId]/stock-trades/route';
import { NextRequest } from 'next/server';
import type { StockTradeResponse } from '@/types/stock-trades';

function createRequest(bioguideId: string) {
  const req = new NextRequest(`http://localhost/api/representative/${bioguideId}/stock-trades`);
  const params = Promise.resolve({ bioguideId });
  return { req, params };
}

const mockHouseRep = {
  name: 'Nancy Pelosi',
  state: 'CA',
  district: '11',
  chamber: 'House',
};

const mockSenateRep = {
  name: 'Tommy Tuberville',
  state: 'AL',
  district: null,
  chamber: 'Senate',
};

const mockTrade = {
  filingId: 'test-123',
  bioguideId: 'P000197',
  memberName: 'Nancy Pelosi',
  stateDistrict: 'CA11',
  owner: 'Self',
  assetDescription: 'Apple Inc.',
  ticker: 'AAPL',
  assetType: 'ST',
  assetTypeLabel: 'Stock',
  transactionType: 'Purchase',
  transactionDate: '2025-01-15',
  filingDate: '2025-02-15',
  amount: '$1,001 - $15,000',
  capitalGainsOver200: false,
  isPaperFiling: false,
  daysToDisclose: 31,
  isLateFiling: false,
  sourceUrl: 'https://example.com/ptr',
};

const mockSenateTrade = {
  ...mockTrade,
  filingId: 'senate-uuid',
  bioguideId: 'T000476',
  memberName: 'Tommy Tuberville',
  stateDistrict: '',
};

describe('GET /api/representative/[bioguideId]/stock-trades', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHouseGetAnnualDisclosures.mockResolvedValue([]);
  });

  it('returns 400 for empty bioguide ID', async () => {
    const { req, params } = createRequest('');
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const response = await GET(req, { params });
    expect(response.status).toBe(400);
  });

  it('returns 404 for unknown representative', async () => {
    const { req, params } = createRequest('X999999');
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const response = await GET(req, { params });
    expect(response.status).toBe(404);
  });

  it('routes House members to the Congress Trading Monitor House endpoint', async () => {
    const { req, params } = createRequest('P000197');
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockHouseGetTrades.mockResolvedValue([mockTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(response.status).toBe(200);
    expect(mockHouseGetTrades).toHaveBeenCalledWith('P000197');
    expect(mockSenateGetTrades).not.toHaveBeenCalled();
    expect(data.metadata.dataSource).toBe('congress-trading-monitor');
    expect(data.trades.length).toBe(1);
  });

  it('routes to Senate disclosure service for Senate members', async () => {
    const { req, params } = createRequest('T000476');
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTrades.mockResolvedValue([mockSenateTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(response.status).toBe(200);
    expect(mockSenateGetTrades).toHaveBeenCalledWith('T000476');
    expect(mockHouseGetTrades).not.toHaveBeenCalled();
    expect(data.metadata.dataSource).toBe('congress-trading-monitor');
    expect(data.trades.length).toBe(1);
  });

  it('backfills stateDistrict on Senate trades', async () => {
    const { req, params } = createRequest('T000476');
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTrades.mockResolvedValue([mockSenateTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.trades[0]!.stateDistrict).toBe('AL00');
  });

  it('returns Senate-specific coverage period', async () => {
    const { req, params } = createRequest('T000476');
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTrades.mockResolvedValue([mockSenateTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.metadata.coveragePeriod).toBe(`2015-${new Date().getFullYear()}`);
  });

  it('returns Senate-specific note when trades found', async () => {
    const { req, params } = createRequest('T000476');
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTrades.mockResolvedValue([mockSenateTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.metadata.note).toContain('efdsearch.senate.gov');
    expect(data.metadata.note).toContain('Congress Trading Monitor');
  });

  it('returns Senate-specific note when no trades found', async () => {
    const { req, params } = createRequest('T000476');
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTrades.mockResolvedValue([]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.metadata.note).toContain('Congress Trading Monitor dataset');
  });

  it('returns empty trades with House note when House member has no trades', async () => {
    const { req, params } = createRequest('P000197');
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockHouseGetTrades.mockResolvedValue([]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.trades).toEqual([]);
    expect(data.metadata.note).toContain('Periodic Transaction Reports');
  });

  it('returns 500 on service error', async () => {
    const { req, params } = createRequest('P000197');
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockHouseGetTrades.mockRejectedValue(new Error('Service unavailable'));

    const response = await GET(req, { params });
    expect(response.status).toBe(500);

    const data: StockTradeResponse = await response.json();
    expect(data.trades).toEqual([]);
    expect(data.metadata.dataSource).toBe('service-error');
  });

  it('reports an empty yearsChecked window (trades now come from CTM, not a PDF scan)', async () => {
    const { req, params } = createRequest('P000197');
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockHouseGetTrades.mockResolvedValue([]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    // House trades are sourced from the Congress Trading Monitor (2015-present),
    // so there is no per-year PDF scan window to report.
    expect(data.metadata.yearsChecked).toEqual([]);
    expect(data.metadata.coveragePeriod).toBe(`2015-${new Date().getFullYear()}`);
  });

  it('includes annualDisclosures in response', async () => {
    const mockDisclosures = [
      {
        docId: '20012345',
        year: 2025,
        filingDate: '2025-05-15',
        pdfUrl: 'https://example.com/2025.pdf',
      },
    ];
    const { req, params } = createRequest('P000197');
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockHouseGetTrades.mockResolvedValue([mockTrade]);
    mockHouseGetAnnualDisclosures.mockResolvedValue(mockDisclosures);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.annualDisclosures).toEqual(mockDisclosures);
  });

  it('returns empty annualDisclosures for Senate members', async () => {
    const { req, params } = createRequest('T000476');
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTrades.mockResolvedValue([mockSenateTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(data.annualDisclosures).toEqual([]);
  });

  it('returns 200 with member metadata', async () => {
    const { req, params } = createRequest('P000197');
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockHouseGetTrades.mockResolvedValue([mockTrade]);

    const response = await GET(req, { params });
    const data: StockTradeResponse = await response.json();

    expect(response.status).toBe(200);
    expect(data.member.bioguideId).toBe('P000197');
    expect(data.member.name).toBe('Nancy Pelosi');
    expect(data.member.stateDistrict).toBe('CA11');
  });
});

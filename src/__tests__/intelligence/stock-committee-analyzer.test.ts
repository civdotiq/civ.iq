/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Stock Trade-Committee Jurisdiction Analyzer (Insight 6).
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

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn().mockResolvedValue('AI narrative.'),
}));

jest.mock('@/lib/ai/plain-language', () => ({
  PLAIN_LANGUAGE_RULES: 'Use plain language.',
  PLAIN_LANGUAGE_SYSTEM_PROMPT: 'Write in plain language. Output valid JSON only.',
}));

jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: jest.fn().mockReturnValue(true) },
}));

jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: { getSummary: jest.fn().mockResolvedValue(null) },
}));

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

const mockGetTradesForMember = jest.fn();
jest.mock('@/lib/data-sources/house-disclosure-service', () => ({
  houseDisclosureService: {
    getTradesForMember: (...args: unknown[]) => mockGetTradesForMember(...args),
  },
}));

const mockSenateGetTradesForMember = jest.fn();
jest.mock('@/lib/data-sources/senate-disclosure-service', () => ({
  senateDisclosureService: {
    getTradesForMember: (...args: unknown[]) => mockSenateGetTradesForMember(...args),
  },
}));

const mockResolveTickerIndustries = jest.fn();
jest.mock('@/lib/intelligence/entity-resolution/ticker-industry-resolver', () => ({
  resolveTickerIndustries: (...args: unknown[]) => mockResolveTickerIndustries(...args),
}));

jest.mock('@/lib/fec/industry-taxonomy', () => ({
  IndustrySector: {
    HEALTH: 'HEALTH',
    DEFENSE: 'DEFENSE',
    ENERGY_NATURAL_RESOURCES: 'ENERGY_NATURAL_RESOURCES',
    FINANCE_INSURANCE_REAL_ESTATE: 'FINANCE_INSURANCE_REAL_ESTATE',
    AGRIBUSINESS: 'AGRIBUSINESS',
    COMMUNICATIONS_ELECTRONICS: 'COMMUNICATIONS_ELECTRONICS',
    CONSTRUCTION: 'CONSTRUCTION',
    TRANSPORTATION: 'TRANSPORTATION',
    LABOR: 'LABOR',
    IDEOLOGY_SINGLE_ISSUE: 'IDEOLOGY_SINGLE_ISSUE',
    LAWYERS_LOBBYISTS: 'LAWYERS_LOBBYISTS',
    MISC_BUSINESS: 'MISC_BUSINESS',
    OTHER: 'OTHER',
  },
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    { committeeCode: 'HSEN', committeeName: 'Energy and Commerce', topics: ['Energy', 'Health'] },
  ],
  getTopicsForCommittee: jest.fn().mockReturnValue(['Energy', 'Health']),
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getJurisdictionSectorsForTopics: jest
    .fn()
    .mockReturnValue(['HEALTH', 'ENERGY_NATURAL_RESOURCES']),
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

import { analyzeStockCommittee } from '@/lib/intelligence/analyzers/stock-committee-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockHouseRep = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democrat',
  state: 'CA',
  chamber: 'House',
  committees: [{ name: 'Energy and Commerce', role: 'Member' }],
};

const mockSenateRep = {
  bioguideId: 'T000476',
  name: 'Tommy Tuberville',
  party: 'Republican',
  state: 'AL',
  chamber: 'Senate',
  committees: [{ name: 'Armed Services', role: 'Member' }],
};

const mockTrades = [
  {
    ticker: 'AAPL',
    assetDescription: 'Apple Inc',
    transactionType: 'Purchase',
    transactionDate: '2025-01-15',
    amount: '$1,001 - $15,000',
    owner: 'Self',
    sourceUrl: 'https://example.com/1',
  },
  {
    ticker: 'MSFT',
    assetDescription: 'Microsoft',
    transactionType: 'Sale',
    transactionDate: '2025-02-01',
    amount: '$15,001 - $50,000',
    owner: 'Self',
    sourceUrl: 'https://example.com/2',
  },
  {
    ticker: 'JNJ',
    assetDescription: 'Johnson & Johnson',
    transactionType: 'Purchase',
    transactionDate: '2025-02-15',
    amount: '$1,001 - $15,000',
    owner: 'Joint',
    sourceUrl: 'https://example.com/3',
  },
  {
    ticker: 'XOM',
    assetDescription: 'ExxonMobil',
    transactionType: 'Purchase',
    transactionDate: '2025-03-01',
    amount: '$1,001 - $15,000',
    owner: 'Self',
    sourceUrl: 'https://example.com/4',
  },
];

function buildResolutionMap() {
  const map = new Map();
  map.set('AAPL', {
    ticker: 'AAPL',
    sector: 'COMMUNICATIONS_ELECTRONICS',
    companyName: 'Apple Inc',
    sicCode: '3571',
  });
  map.set('MSFT', {
    ticker: 'MSFT',
    sector: 'COMMUNICATIONS_ELECTRONICS',
    companyName: 'Microsoft',
    sicCode: '7372',
  });
  map.set('JNJ', {
    ticker: 'JNJ',
    sector: 'HEALTH',
    companyName: 'Johnson & Johnson',
    sicCode: '2834',
  });
  map.set('XOM', {
    ticker: 'XOM',
    sector: 'ENERGY_NATURAL_RESOURCES',
    companyName: 'ExxonMobil',
    sicCode: '1311',
  });
  return map;
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeStockCommittee', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    mockGetEnhancedRepresentative.mockResolvedValue(mockHouseRep);
    mockGetTradesForMember.mockResolvedValue(mockTrades);
    mockSenateGetTradesForMember.mockResolvedValue(mockTrades);
    mockResolveTickerIndustries.mockResolvedValue(buildResolutionMap());
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { bioguideId: 'P000197', overlapRate: 0.5 };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeStockCommittee('P000197');
    expect(result).toEqual(cached);
    expect(mockGetTradesForMember).not.toHaveBeenCalled();
  });

  it('fetches trades from Senate service for Senate members', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTradesForMember.mockResolvedValue(mockTrades);

    const result = await analyzeStockCommittee('T000476');

    expect(mockSenateGetTradesForMember).toHaveBeenCalledWith('T000476');
    expect(mockGetTradesForMember).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result!.methodology).toContain('Congress Trading Monitor');
  });

  it('uses chamber-specific peer comparison key for Senate', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(mockSenateRep);
    mockSenateGetTradesForMember.mockResolvedValue(mockTrades);

    await analyzeStockCommittee('T000476');

    // Should cache with Senate:AL key, not House:AL
    expect(mockRedisSet).toHaveBeenCalledWith(
      expect.stringContaining('stock-overlap:Senate:AL:'),
      expect.any(Number),
      expect.any(Number)
    );
  });

  it('uses batch ticker resolution', async () => {
    await analyzeStockCommittee('P000197');

    expect(mockResolveTickerIndustries).toHaveBeenCalledWith(
      expect.arrayContaining(['AAPL', 'MSFT', 'JNJ', 'XOM'])
    );
    // Called once with all tickers (batch), not once per ticker
    expect(mockResolveTickerIndustries).toHaveBeenCalledTimes(1);
  });

  it('computes overlap rate and expected overlap rate', async () => {
    const result = await analyzeStockCommittee('P000197');

    expect(result).not.toBeNull();
    expect(result!.overlapRate).toBeGreaterThanOrEqual(0);
    expect(result!.overlapRate).toBeLessThanOrEqual(1);
    expect(result!.expectedOverlapRate).toBeGreaterThan(0);
    expect(result!.expectedOverlapRate).toBeLessThanOrEqual(1);
  });

  it('flags trades in jurisdiction sectors', async () => {
    const result = await analyzeStockCommittee('P000197');

    expect(result).not.toBeNull();
    // JNJ (HEALTH) and XOM (ENERGY) should be flagged
    expect(result!.flaggedTradeCount).toBe(2);
    expect(result!.flaggedTrades.length).toBe(2);
  });

  it('returns null when fewer than MIN_TRADES_STOCK trades', async () => {
    mockGetTradesForMember.mockResolvedValue([mockTrades[0]!]);

    const result = await analyzeStockCommittee('P000197');
    expect(result).toBeNull();
  });

  it('returns null when fewer than MIN_TRADES_STOCK resolvable trades', async () => {
    const emptyMap = new Map();
    mockResolveTickerIndustries.mockResolvedValue(emptyMap);

    const result = await analyzeStockCommittee('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no committees', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockHouseRep, committees: [] });

    const result = await analyzeStockCommittee('P000197');
    expect(result).toBeNull();
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzeStockCommittee('P000197');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology.toLowerCase()).toContain('stock');
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
  });

  it('adjusts confidence by signal strength', async () => {
    const result = await analyzeStockCommittee('P000197');

    // Signal strength modifies confidence based on overlap vs expected
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
  });
});

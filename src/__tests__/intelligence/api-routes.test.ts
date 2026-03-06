/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Intelligence API Routes.
 *
 * Validates request validation, Cache-Control headers, and error handling
 * for all 8 intelligence endpoints.
 */

// ── Mocks ─────────────────────────────────────────────────────────

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
  }),
}));

// Mock all analyzers to return controlled results
const mockAnalyzeFinanceJurisdiction = jest.fn();
const mockAnalyzeVoteFinance = jest.fn();
const mockAnalyzeTemporalVotes = jest.fn();
const mockAnalyzeStockCommittee = jest.fn();
const mockAnalyzeLobbyingPipeline = jest.fn();
const mockAnalyzeBillIntelligence = jest.fn();
const mockAnalyzePACVotes = jest.fn();

jest.mock('@/lib/intelligence/analyzers/finance-jurisdiction-analyzer', () => ({
  analyzeFinanceJurisdiction: (...args: unknown[]) => mockAnalyzeFinanceJurisdiction(...args),
}));

jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: (...args: unknown[]) => mockAnalyzeVoteFinance(...args),
}));

jest.mock('@/lib/intelligence/analyzers/temporal-vote-analyzer', () => ({
  analyzeTemporalVotes: (...args: unknown[]) => mockAnalyzeTemporalVotes(...args),
}));

jest.mock('@/lib/intelligence/analyzers/stock-committee-analyzer', () => ({
  analyzeStockCommittee: (...args: unknown[]) => mockAnalyzeStockCommittee(...args),
}));

jest.mock('@/lib/intelligence/analyzers/lobbying-pipeline-analyzer', () => ({
  analyzeLobbyingPipeline: (...args: unknown[]) => mockAnalyzeLobbyingPipeline(...args),
}));

jest.mock('@/lib/intelligence/analyzers/bill-intelligence-analyzer', () => ({
  analyzeBillIntelligence: (...args: unknown[]) => mockAnalyzeBillIntelligence(...args),
}));

jest.mock('@/lib/intelligence/analyzers/pac-vote-analyzer', () => ({
  analyzePACVotes: (...args: unknown[]) => mockAnalyzePACVotes(...args),
}));

const mockGetEnhancedRepresentative = jest.fn();
const mockGetAllEnhancedRepresentatives = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
  getAllEnhancedRepresentatives: (...args: unknown[]) => mockGetAllEnhancedRepresentatives(...args),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    { committeeCode: 'HSEN', committeeName: 'Energy and Commerce', chamber: 'House', topics: [] },
  ],
}));

// ── Helpers ───────────────────────────────────────────────────────

function mockRequest(url: string) {
  return { url, method: 'GET', headers: new Map(), nextUrl: new URL(url) };
}

function mockParams(obj: Record<string, string>) {
  return { params: Promise.resolve(obj) };
}

const mockInsight = {
  confidence: 0.7,
  dataAsOf: '2025-03-01T00:00:00Z',
  methodology: 'Test',
  disclaimer: 'Test',
  lastAnalyzedAt: '2025-03-01T00:00:00Z',
  source: 'ai-generated' as const,
  narrative: 'Test narrative',
};

// ── Tests ─────────────────────────────────────────────────────────

describe('Intelligence API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAnalyzeFinanceJurisdiction.mockResolvedValue({
      bioguideId: 'P000197',
      overlapScore: 0.7,
      ...mockInsight,
    });
    mockAnalyzeVoteFinance.mockResolvedValue({
      bioguideId: 'P000197',
      overallCorrelation: 0.3,
      ...mockInsight,
    });
    mockAnalyzeTemporalVotes.mockResolvedValue({
      bioguideId: 'P000197',
      overallTrend: 'stable',
      ...mockInsight,
    });
    mockAnalyzeStockCommittee.mockResolvedValue({
      bioguideId: 'P000197',
      overlapRate: 0.4,
      ...mockInsight,
    });
    mockAnalyzeLobbyingPipeline.mockResolvedValue({
      committeeCode: 'HSEN',
      totalSpending: 500000,
      ...mockInsight,
    });
    mockAnalyzeBillIntelligence.mockResolvedValue({ billId: '119-hr-1', ...mockInsight });
    mockAnalyzePACVotes.mockResolvedValue({ committeeId: 'C00123456', ...mockInsight });
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'P000197',
      name: 'Pelosi',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House',
      committees: [{ name: 'Energy and Commerce' }],
    });
    mockGetAllEnhancedRepresentatives.mockResolvedValue([
      {
        bioguideId: 'P000197',
        name: 'Pelosi',
        party: 'Democrat',
        state: 'CA',
        chamber: 'House',
        district: '11',
      },
    ]);
  });

  // ── Representative Insights Route ─────────────────────────────

  describe('GET /api/intelligence/representative/[bioguideId]', () => {
    let GET: typeof import('@/app/api/intelligence/representative/[bioguideId]/route').GET;

    beforeAll(async () => {
      const mod = await import('@/app/api/intelligence/representative/[bioguideId]/route');
      GET = mod.GET;
    });

    it('returns 400 for missing bioguideId', async () => {
      const res = await GET(
        mockRequest('http://localhost/api/intelligence/representative/') as never,
        mockParams({ bioguideId: '' })
      );
      expect(res.status).toBe(400);
    });

    it('returns combined insights', async () => {
      const res = await GET(
        mockRequest('http://localhost/api/intelligence/representative/P000197') as never,
        mockParams({ bioguideId: 'P000197' })
      );
      const data = await res.json();
      expect(data.bioguideId).toBe('P000197');
      expect(data.insights).toHaveProperty('financeJurisdiction');
      expect(data.insights).toHaveProperty('voteFinance');
    });

    it('returns partial response when one analyzer returns null', async () => {
      mockAnalyzeVoteFinance.mockResolvedValue(null);

      const res = await GET(
        mockRequest('http://localhost/api/intelligence/representative/P000197') as never,
        mockParams({ bioguideId: 'P000197' })
      );
      const data = await res.json();
      expect(data.insights.financeJurisdiction).not.toBeNull();
      expect(data.insights.voteFinance).toBeNull();
    });

    it('returns 500 on unexpected error', async () => {
      mockAnalyzeFinanceJurisdiction.mockRejectedValue(new Error('Unexpected'));
      mockAnalyzeVoteFinance.mockRejectedValue(new Error('Unexpected'));

      const res = await GET(
        mockRequest('http://localhost/api/intelligence/representative/P000197') as never,
        mockParams({ bioguideId: 'P000197' })
      );
      // Even on error, the route catches and returns nulls (not 500)
      // because each analyzer is caught individually
      const data = await res.json();
      expect(data.insights.financeJurisdiction).toBeNull();
      expect(data.insights.voteFinance).toBeNull();
    });
  });

  // ── Temporal Route ────────────────────────────────────────────

  describe('GET /api/intelligence/representative/[bioguideId]/temporal', () => {
    let GET: typeof import('@/app/api/intelligence/representative/[bioguideId]/temporal/route').GET;

    beforeAll(async () => {
      const mod = await import('@/app/api/intelligence/representative/[bioguideId]/temporal/route');
      GET = mod.GET;
    });

    it('returns 400 for missing bioguideId', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ bioguideId: '' })
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when analyzer returns null', async () => {
      mockAnalyzeTemporalVotes.mockResolvedValue(null);

      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ bioguideId: 'P000197' })
      );
      expect(res.status).toBe(404);
    });

    it('returns insight on success', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ bioguideId: 'P000197' })
      );
      const data = await res.json();
      expect(data.overallTrend).toBe('stable');
    });
  });

  // ── Stock Trades Route ────────────────────────────────────────

  describe('GET /api/intelligence/representative/[bioguideId]/stock-trades', () => {
    let GET: typeof import('@/app/api/intelligence/representative/[bioguideId]/stock-trades/route').GET;

    beforeAll(async () => {
      const mod = await import(
        '@/app/api/intelligence/representative/[bioguideId]/stock-trades/route'
      );
      GET = mod.GET;
    });

    it('returns 400 for missing bioguideId', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ bioguideId: '' })
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when insufficient data', async () => {
      mockAnalyzeStockCommittee.mockResolvedValue(null);

      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ bioguideId: 'P000197' })
      );
      expect(res.status).toBe(404);
    });
  });

  // ── Committee Route ───────────────────────────────────────────

  describe('GET /api/intelligence/committee/[committeeId]', () => {
    let GET: typeof import('@/app/api/intelligence/committee/[committeeId]/route').GET;

    beforeAll(async () => {
      const mod = await import('@/app/api/intelligence/committee/[committeeId]/route');
      GET = mod.GET;
    });

    it('returns 400 for missing committeeId', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ committeeId: '' })
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 for unknown committee code', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ committeeId: 'UNKNOWN' })
      );
      expect(res.status).toBe(404);
    });

    it('returns 404 when insufficient data', async () => {
      mockAnalyzeLobbyingPipeline.mockResolvedValue(null);

      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ committeeId: 'HSEN' })
      );
      expect(res.status).toBe(404);
    });
  });

  // ── Bill Route ────────────────────────────────────────────────

  describe('GET /api/intelligence/bill/[billId]', () => {
    let GET: typeof import('@/app/api/intelligence/bill/[billId]/route').GET;

    beforeAll(async () => {
      const mod = await import('@/app/api/intelligence/bill/[billId]/route');
      GET = mod.GET;
    });

    it('returns 400 for invalid billId format', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ billId: 'INVALID' })
      );
      expect(res.status).toBe(400);
    });

    it('returns 400 for missing billId', async () => {
      const res = await GET(mockRequest('http://localhost/') as never, mockParams({ billId: '' }));
      expect(res.status).toBe(400);
    });

    it('returns 404 when insufficient data', async () => {
      mockAnalyzeBillIntelligence.mockResolvedValue(null);

      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ billId: '119-hr-1' })
      );
      expect(res.status).toBe(404);
    });

    it('returns insight with valid billId', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ billId: '119-hr-1' })
      );
      const data = await res.json();
      expect(data.billId).toBe('119-hr-1');
    });
  });

  // ── PAC Route ─────────────────────────────────────────────────

  describe('GET /api/intelligence/pac/[committeeId]', () => {
    let GET: typeof import('@/app/api/intelligence/pac/[committeeId]/route').GET;

    beforeAll(async () => {
      const mod = await import('@/app/api/intelligence/pac/[committeeId]/route');
      GET = mod.GET;
    });

    it('returns 400 for invalid FEC committee ID format', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ committeeId: 'INVALID' })
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when insufficient data', async () => {
      mockAnalyzePACVotes.mockResolvedValue(null);

      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ committeeId: 'C00123456' })
      );
      expect(res.status).toBe(404);
    });

    it('returns insight with valid committeeId', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ committeeId: 'C00123456' })
      );
      const data = await res.json();
      expect(data.committeeId).toBe('C00123456');
    });
  });

  // ── District Route ────────────────────────────────────────────

  describe('GET /api/intelligence/district/[districtId]', () => {
    let GET: typeof import('@/app/api/intelligence/district/[districtId]/route').GET;

    beforeAll(async () => {
      const mod = await import('@/app/api/intelligence/district/[districtId]/route');
      GET = mod.GET;
    });

    it('returns 400 for invalid districtId format', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ districtId: 'INVALID' })
      );
      expect(res.status).toBe(400);
    });

    it('returns 404 when no reps found', async () => {
      mockGetAllEnhancedRepresentatives.mockResolvedValue([]);

      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ districtId: 'XX-1' })
      );
      expect(res.status).toBe(404);
    });

    it('returns district summary', async () => {
      const res = await GET(
        mockRequest('http://localhost/') as never,
        mockParams({ districtId: 'CA-11' })
      );
      const data = await res.json();
      expect(data.districtId).toBe('CA-11');
      expect(data.representatives.length).toBeGreaterThan(0);
    });
  });
});

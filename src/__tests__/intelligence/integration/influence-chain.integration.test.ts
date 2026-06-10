/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration tests for GET /api/intelligence/representative/[bioguideId]/influence-chain
 *
 * Mocks data sources but lets the influence chain analyzer run its
 * computation logic. Tests the full request → response pipeline.
 */

// ── Mocks (data-source level) ──────────────────────────────────────

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const mockRedisStore = new Map<string, unknown>();
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockImplementation(async (key: string) => mockRedisStore.get(key) ?? null),
    set: jest
      .fn()
      .mockImplementation(async (key: string, value: unknown) => mockRedisStore.set(key, value)),
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
  }),
}));

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: jest.fn().mockReturnValue('H0CA12345'),
}));

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getSampleContributions: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseMemberVotes: jest.fn().mockResolvedValue([]),
    getSenateMemberVotes: jest.fn().mockResolvedValue([]),
  },
}));

const mockFetchRecentFilings = jest.fn();
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: {
    fetchRecentFilings: (...args: unknown[]) => mockFetchRecentFilings(...args),
  },
}));

jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: jest.fn().mockReturnValue([]),
  getResolvedCommittees: jest.fn().mockReturnValue([]),
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: jest.fn().mockReturnValue(false) },
}));

jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: { getSummary: jest.fn().mockResolvedValue(null) },
}));

jest.mock('@/lib/intelligence/embeddings', () => ({
  classifyBillSectors: jest.fn().mockResolvedValue([]),
  classifyBillSectorsZeroShot: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

jest.mock('@/lib/intelligence/statistics/civic-stats', () => ({
  peerComparison: jest.fn().mockReturnValue(null),
  confidenceScore: jest.fn().mockReturnValue(0.7),
  MIN_PEERS: 3,
}));

// ── Helpers ──────────────────────────────────────────────────────────

function mockRequest(url: string) {
  return { url, method: 'GET', headers: new Map(), nextUrl: new URL(url) };
}

function mockParams(obj: Record<string, string>) {
  return { params: Promise.resolve(obj) };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('Integration: GET /api/intelligence/representative/[bioguideId]/influence-chain', () => {
  let GET: typeof import('@/app/api/intelligence/representative/[bioguideId]/influence-chain/route').GET;

  beforeAll(async () => {
    const mod = await import(
      '@/app/api/intelligence/representative/[bioguideId]/influence-chain/route'
    );
    GET = mod.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();
  });

  it('returns 404 when representative not found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ bioguideId: 'UNKNOWN' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when representative has no committees', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'T000001',
      name: 'Test Rep',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House',
      committees: [],
    });
    mockFetchRecentFilings.mockResolvedValue([]);

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ bioguideId: 'T000001' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 400 for empty bioguideId', async () => {
    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ bioguideId: '' })
    );
    expect(res.status).toBe(400);
  });

  it('returns 404 when no lobbying filings found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'T000001',
      name: 'Test Rep',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House',
      committees: [{ name: 'Armed Services' }],
    });
    mockFetchRecentFilings.mockResolvedValue([]);

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ bioguideId: 'T000001' })
    );
    // No filings means no chains can be built, returns 404
    expect(res.status).toBe(404);
  });

  it('returns cached insight on cache hit', async () => {
    const cached = {
      bioguideId: 'T000001',
      chains: [],
      totalChainsDetected: 0,
      chainsDropped: 0,
      peerComparison: null,
      peerComparisonUnavailableReason:
        'Fewer than 5 other House members have comparable data right now, so no peer comparison is shown.',
      narrative: 'Cached narrative',
      confidence: 0.8,
      dataAsOf: new Date().toISOString(),
      methodology: 'test',
      disclaimer: 'test',
      lastAnalyzedAt: new Date().toISOString(),
      source: 'statistical-fallback',
    };
    mockRedisStore.set('insight:influence_chain:T000001', cached);

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ bioguideId: 'T000001' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.bioguideId).toBe('T000001');
    expect(data.narrative).toBe('Cached narrative');
  });
});

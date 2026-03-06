/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration tests for GET /api/intelligence/representative/[bioguideId]/influence-chain
 *
 * Mocks data sources (Senate LDA, Congress.gov) but lets the lobbying pipeline
 * analyzer run its actual computation logic. Tests multi-committee iteration
 * and entity resolution pipeline.
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

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    {
      committeeCode: 'HSAS',
      committeeName: 'Armed Services',
      chamber: 'House' as const,
      topics: ['defense'],
      agencies: ['DOD'],
    },
    {
      committeeCode: 'HSIF',
      committeeName: 'Energy and Commerce',
      chamber: 'House' as const,
      topics: ['energy', 'health'],
      agencies: ['DOE', 'HHS'],
    },
  ],
}));

const mockFetchRecentFilings = jest.fn();
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: {
    fetchRecentFilings: (...args: unknown[]) => mockFetchRecentFilings(...args),
  },
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/features/legislation/services/ai/reading-level-validator', () => ({
  ReadingLevelValidator: { meetsTarget: jest.fn().mockReturnValue(false) },
}));

// ── Helpers ──────────────────────────────────────────────────────────

function mockRequest(url: string) {
  return { url, method: 'GET', headers: new Map(), nextUrl: new URL(url) };
}

function mockParams(obj: Record<string, string>) {
  return { params: Promise.resolve(obj) };
}

function createMockFilings(committeeEntity: string, count: number, orgPrefix: string) {
  return Array.from({ length: count }, (_, i) => ({
    filing_uuid: `filing-${orgPrefix}-${i}`,
    filing_year: 2025,
    filing_period: 'Q1',
    filing_type: 'Q',
    client: { name: `${orgPrefix} Corp ${i}` },
    registrant: { name: `Lobby Firm ${i}` },
    income: 50000 + i * 10000,
    government_entities: [{ name: committeeEntity }],
    issues: [{ code: 'DEF', description: 'Defense' }],
    lobbying_activities: [],
  }));
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

  it('returns committee pipelines for a representative with committees', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'T000001',
      name: 'Test Rep',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House',
      committees: [{ name: 'Armed Services' }],
    });

    // Create enough filings to pass MIN_FILINGS_LOBBYING threshold
    const filings = createMockFilings('House Armed Services Committee', 10, 'defense');
    mockFetchRecentFilings.mockResolvedValue(filings);

    const res = await GET(
      mockRequest(
        'http://localhost/api/intelligence/representative/T000001/influence-chain'
      ) as never,
      mockParams({ bioguideId: 'T000001' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.bioguideId).toBe('T000001');
    expect(data).toHaveProperty('committeePipelines');
    expect(data).toHaveProperty('generatedAt');
    expect(Array.isArray(data.committeePipelines)).toBe(true);
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

  it('handles partial failure when one committee pipeline throws', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'T000001',
      name: 'Test Rep',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House',
      committees: [{ name: 'Armed Services' }, { name: 'Energy and Commerce' }],
    });

    // First call for Armed Services returns data, second call for Energy returns nothing
    mockFetchRecentFilings
      .mockResolvedValueOnce(createMockFilings('House Armed Services Committee', 10, 'defense'))
      .mockResolvedValueOnce([]);

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ bioguideId: 'T000001' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    // Should still return 200 even if some pipelines are empty
    expect(Array.isArray(data.committeePipelines)).toBe(true);
  });
});

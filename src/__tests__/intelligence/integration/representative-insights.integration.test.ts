/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration tests for GET /api/intelligence/representative/[bioguideId]
 *
 * Mocks data sources (FEC, Congress.gov) but lets the analyzers run
 * their actual computation logic. Tests the full route → analyzer → response pipeline.
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

const mockGetFECIdFromBioguide = jest.fn();
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: (...args: unknown[]) => mockGetFECIdFromBioguide(...args),
}));

const mockGetSampleContributions = jest.fn();
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getSampleContributions: (...args: unknown[]) => mockGetSampleContributions(...args),
  },
}));

const mockGetHouseMemberVotes = jest.fn();
const mockGetSenateMemberVotes = jest.fn();
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseMemberVotes: (...args: unknown[]) => mockGetHouseMemberVotes(...args),
    getSenateMemberVotes: (...args: unknown[]) => mockGetSenateMemberVotes(...args),
  },
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

// ── Helpers ──────────────────────────────────────────────────────────

function mockRequest(url: string) {
  return { url, method: 'GET', headers: new Map(), nextUrl: new URL(url) };
}

function mockParams(obj: Record<string, string>) {
  return { params: Promise.resolve(obj) };
}

const mockContributions = [
  { contributor_employer: 'Acme Defense Corp', contribution_receipt_amount: 5000 },
  { contributor_employer: 'Health Systems Inc', contribution_receipt_amount: 3000 },
  { contributor_employer: 'Tech Solutions LLC', contribution_receipt_amount: 2000 },
  { contributor_employer: 'Defense Dynamics', contribution_receipt_amount: 4000 },
  { contributor_employer: 'Farm Aid Co', contribution_receipt_amount: 1000 },
];

const mockRep = {
  bioguideId: 'T000001',
  name: 'Test Rep',
  party: 'Democrat',
  state: 'CA',
  chamber: 'House' as const,
  district: '12',
  committees: [{ name: 'Armed Services' }, { name: 'Energy and Commerce' }],
};

// ── Tests ────────────────────────────────────────────────────────────

describe('Integration: GET /api/intelligence/representative/[bioguideId]', () => {
  let GET: typeof import('@/app/api/intelligence/representative/[bioguideId]/route').GET;

  beforeAll(async () => {
    const mod = await import('@/app/api/intelligence/representative/[bioguideId]/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();

    mockGetEnhancedRepresentative.mockResolvedValue(mockRep);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue(mockContributions);
    mockGetHouseMemberVotes.mockResolvedValue([
      {
        bill: { type: 'hr', number: '1', congress: 119, title: 'Defense Authorization Act' },
        position: 'Yea',
        date: '2025-03-01',
      },
      {
        bill: { type: 'hr', number: '2', congress: 119, title: 'Health Care Reform' },
        position: 'Nay',
        date: '2025-03-15',
      },
    ]);
  });

  it('returns well-formed response with both insights', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/representative/T000001') as never,
      mockParams({ bioguideId: 'T000001' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.bioguideId).toBe('T000001');
    expect(data).toHaveProperty('insights');
    expect(data).toHaveProperty('generatedAt');
    expect(data.insights).toHaveProperty('financeJurisdiction');
    expect(data.insights).toHaveProperty('voteFinance');
  });

  it('returns partial response when one analyzer fails', async () => {
    // Finance-jurisdiction will work (has committees + FEC data)
    // Vote-finance will fail (no votes returned)
    mockGetHouseMemberVotes.mockResolvedValue([]);

    const res = await GET(
      mockRequest('http://localhost/api/intelligence/representative/T000001') as never,
      mockParams({ bioguideId: 'T000001' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    // Finance-jurisdiction should still work
    expect(data.insights.financeJurisdiction).not.toBeNull();
    // Vote-finance returns null without votes
    expect(data.insights.voteFinance).toBeNull();
  });

  it('returns nulls for both insights when FEC data unavailable', async () => {
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const res = await GET(
      mockRequest('http://localhost/api/intelligence/representative/T000001') as never,
      mockParams({ bioguideId: 'T000001' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    // Both analyzers require FEC data
    expect(data.insights.financeJurisdiction).toBeNull();
    expect(data.insights.voteFinance).toBeNull();
  });

  it('returns 400 for empty bioguideId', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/representative/') as never,
      mockParams({ bioguideId: '' })
    );
    expect(res.status).toBe(400);
  });

  it('normalizes bioguideId to uppercase', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/representative/t000001') as never,
      mockParams({ bioguideId: 't000001' })
    );

    const data = await res.json();
    expect(data.bioguideId).toBe('T000001');
    expect(mockGetEnhancedRepresentative).toHaveBeenCalledWith('T000001');
  });
});

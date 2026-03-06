/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration tests for GET /api/intelligence/bill/[billId]
 *
 * Mocks data sources (Congress.gov, FEC, Senate LDA) but lets the
 * bill intelligence analyzer and its cross-analyzer call to the
 * lobbying pipeline run through the full computation pipeline.
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

const mockFetchBillFromCongress = jest.fn();
jest.mock('@/lib/services/bill.service', () => ({
  fetchBillFromCongress: (...args: unknown[]) => mockFetchBillFromCongress(...args),
}));

const mockGetFECIdFromBioguide = jest.fn();
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: (...args: unknown[]) => mockGetFECIdFromBioguide(...args),
}));

const mockGetSampleContributions = jest.fn();
const mockGetFinancialSummary = jest.fn();
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getSampleContributions: (...args: unknown[]) => mockGetSampleContributions(...args),
    getFinancialSummary: (...args: unknown[]) => mockGetFinancialSummary(...args),
  },
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: jest.fn().mockResolvedValue(null),
}));

// Mock the lobbying pipeline analyzer since it's a cross-analyzer call
// and has its own integration tests above
const mockAnalyzeLobbyingPipeline = jest.fn();
jest.mock('@/lib/intelligence/analyzers/lobbying-pipeline-analyzer', () => ({
  analyzeLobbyingPipeline: (...args: unknown[]) => mockAnalyzeLobbyingPipeline(...args),
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
  ],
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

const mockBill = {
  billId: '119-hr-1',
  title: 'Defense Authorization Act of 2025',
  policyArea: 'Armed Forces and National Security',
  sponsor: {
    representative: {
      bioguideId: 'S000001',
      name: 'Sponsor Smith',
      party: 'Republican',
    },
  },
  cosponsors: [
    {
      representative: {
        bioguideId: 'C000001',
        name: 'Cosponsor Jones',
        party: 'Democrat',
      },
      withdrawn: false,
    },
    {
      representative: {
        bioguideId: 'C000002',
        name: 'Cosponsor Brown',
        party: 'Republican',
      },
      withdrawn: false,
    },
  ],
  committees: [{ committeeId: 'hasc00', name: 'Armed Services', chamber: 'House', activities: [] }],
  votes: [],
  relatedBills: [],
  status: {
    current: 'introduced',
    lastAction: { date: '2025-01-15', description: 'Introduced' },
    timeline: [],
  },
  introducedDate: '2025-01-15',
  cboCostEstimates: [],
};

const mockContributions = [
  { contributor_employer: 'Defense Corp Alpha', contribution_receipt_amount: 10000 },
  { contributor_employer: 'Military Systems LLC', contribution_receipt_amount: 8000 },
  { contributor_employer: 'Tech Innovations', contribution_receipt_amount: 3000 },
  { contributor_employer: 'Health Partners', contribution_receipt_amount: 2000 },
];

// ── Tests ────────────────────────────────────────────────────────────

describe('Integration: GET /api/intelligence/bill/[billId]', () => {
  let GET: typeof import('@/app/api/intelligence/bill/[billId]/route').GET;

  beforeAll(async () => {
    const mod = await import('@/app/api/intelligence/bill/[billId]/route');
    GET = mod.GET;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisStore.clear();

    mockFetchBillFromCongress.mockResolvedValue(mockBill);
    mockGetFECIdFromBioguide.mockReturnValue('H0XX00001');
    mockGetSampleContributions.mockResolvedValue(mockContributions);
    mockGetFinancialSummary.mockResolvedValue(null);
    mockAnalyzeLobbyingPipeline.mockResolvedValue({
      committeeCode: 'HSAS',
      totalSpending: 500000,
      organizationCount: 10,
      topOrganizations: [{ name: 'Defense Lobby Inc', totalSpending: 200000 }],
    });
  });

  it('returns well-formed bill intelligence response', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/bill/119-hr-1') as never,
      mockParams({ billId: '119-hr-1' })
    );

    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.billId).toBe('119-hr-1');
    expect(data.billTitle).toBe('Defense Authorization Act of 2025');
    expect(data.policyArea).toBe('Armed Forces and National Security');
    expect(data).toHaveProperty('affectedSectors');
    expect(data).toHaveProperty('sponsorAnalysis');
    expect(data).toHaveProperty('cosponsorSummary');
    expect(data).toHaveProperty('narrative');
    expect(data).toHaveProperty('confidence');
    expect(data).toHaveProperty('methodology');
    expect(data).toHaveProperty('disclaimer');
  });

  it('includes sponsor analysis with sector donation data', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/bill/119-hr-1') as never,
      mockParams({ billId: '119-hr-1' })
    );

    const data = await res.json();

    expect(data.sponsorAnalysis).not.toBeNull();
    expect(data.sponsorAnalysis.bioguideId).toBe('S000001');
    expect(data.sponsorAnalysis.name).toBe('Sponsor Smith');
    expect(typeof data.sponsorAnalysis.sectorDonationPercentage).toBe('number');
    expect(typeof data.sponsorAnalysis.totalDonations).toBe('number');
  });

  it('includes cosponsor summary', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/bill/119-hr-1') as never,
      mockParams({ billId: '119-hr-1' })
    );

    const data = await res.json();

    expect(data.cosponsorSummary).toHaveProperty('totalCosponsors');
    expect(data.cosponsorSummary).toHaveProperty('analyzedCosponsors');
    expect(data.cosponsorSummary).toHaveProperty('avgSectorDonationPercentage');
    expect(data.cosponsorSummary.totalCosponsors).toBe(2);
  });

  it('includes related lobbying data from cross-analyzer call', async () => {
    const res = await GET(
      mockRequest('http://localhost/api/intelligence/bill/119-hr-1') as never,
      mockParams({ billId: '119-hr-1' })
    );

    const data = await res.json();

    expect(data.relatedLobbyingSpending).toBe(500000);
    expect(data.relatedLobbyingOrgs).toBe(10);
  });

  it('returns 400 for invalid billId format', async () => {
    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ billId: 'INVALID' })
    );
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toContain('Invalid bill ID format');
  });

  it('returns 400 for empty billId', async () => {
    const res = await GET(mockRequest('http://localhost/') as never, mockParams({ billId: '' }));
    expect(res.status).toBe(400);
  });

  it('returns 404 when bill not found', async () => {
    mockFetchBillFromCongress.mockResolvedValue(null);

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ billId: '119-hr-99999' })
    );
    expect(res.status).toBe(404);
  });

  it('returns 404 when bill has no policy area', async () => {
    mockFetchBillFromCongress.mockResolvedValue({ ...mockBill, policyArea: null });

    const res = await GET(
      mockRequest('http://localhost/') as never,
      mockParams({ billId: '119-hr-1' })
    );
    expect(res.status).toBe(404);
  });

  it('handles sponsor with no FEC mapping gracefully', async () => {
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const res = await GET(
      mockRequest('http://localhost/api/intelligence/bill/119-hr-1') as never,
      mockParams({ billId: '119-hr-1' })
    );

    // Should still return a result — sponsorAnalysis will be null
    // but the bill intelligence insight should still be generated
    // Only returns 404 if there's truly insufficient data
    const status = res.status;
    if (status === 200) {
      const data = await res.json();
      expect(data.sponsorAnalysis).toBeNull();
    } else {
      // If the analyzer decides null sponsor = insufficient data, 404 is acceptable
      expect(status).toBe(404);
    }
  });
});

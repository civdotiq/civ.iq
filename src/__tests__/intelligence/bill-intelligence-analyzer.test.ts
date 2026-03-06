/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Bill Intelligence Analyzer.
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
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

const mockFetchBillFromCongress = jest.fn();
jest.mock('@/lib/services/bill.service', () => ({
  fetchBillFromCongress: (...args: unknown[]) => mockFetchBillFromCongress(...args),
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

jest.mock('@/lib/fec/industry-taxonomy', () => ({
  aggregateByIndustrySector: jest.fn().mockReturnValue([
    { sector: 'HEALTH', totalAmount: 50000 },
    { sector: 'DEFENSE', totalAmount: 20000 },
  ]),
  IndustrySector: { HEALTH: 'HEALTH', DEFENSE: 'DEFENSE' },
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue(['HEALTH']),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    {
      committeeCode: 'HSEN',
      committeeName: 'Energy and Commerce',
      chamber: 'House',
      topics: ['Energy', 'Health'],
    },
  ],
}));

// Mock lobbying pipeline (called internally)
jest.mock('@/lib/intelligence/analyzers/lobbying-pipeline-analyzer', () => ({
  analyzeLobbyingPipeline: jest.fn().mockResolvedValue(null),
}));

// Mock senate lobbying (transitive dependency)
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: { fetchRecentFilings: jest.fn().mockResolvedValue([]) },
}));

jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: jest.fn(),
  getResolvedCommittees: jest.fn(),
}));

jest.mock('@/lib/intelligence/entity-resolution/lda-issue-policy-map', () => ({
  getLDAIssueLabel: jest.fn(),
  getPolicyAreasForLDAIssue: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn().mockResolvedValue([]),
}));

import { analyzeBillIntelligence } from '@/lib/intelligence/analyzers/bill-intelligence-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockBill = {
  title: 'Medicare Improvement Act',
  policyArea: 'Health',
  sponsor: {
    representative: {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      party: 'Democrat',
    },
  },
  cosponsors: [
    {
      representative: { bioguideId: 'A000001', name: 'Cosponsor One', party: 'Democrat' },
      withdrawn: false,
    },
    {
      representative: { bioguideId: 'A000002', name: 'Cosponsor Two', party: 'Republican' },
      withdrawn: false,
    },
  ],
  committees: [{ committeeId: 'HSEN', name: 'Energy and Commerce' }],
};

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeBillIntelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockFetchBillFromCongress.mockResolvedValue(mockBill);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue([{ amount: 5000 }]);
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { billId: '119-hr-1', billTitle: 'Test' };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toEqual(cached);
    expect(mockFetchBillFromCongress).not.toHaveBeenCalled();
  });

  it('returns null when bill not found', async () => {
    mockFetchBillFromCongress.mockResolvedValue(null);

    const result = await analyzeBillIntelligence('119-hr-99999');
    expect(result).toBeNull();
  });

  it('returns null when bill has no policy area', async () => {
    mockFetchBillFromCongress.mockResolvedValue({ ...mockBill, policyArea: null });

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toBeNull();
  });

  it('returns null when no sectors map to policy area', async () => {
    const policyMap = jest.requireMock<{ getIndustrySectorsForPolicyArea: jest.Mock }>(
      '@/lib/connections/policy-area-map'
    );
    policyMap.getIndustrySectorsForPolicyArea.mockReturnValueOnce([]);

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toBeNull();
  });

  it('analyzes sponsor funding by sector', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorAnalysis).not.toBeNull();
    expect(result!.sponsorAnalysis!.bioguideId).toBe('P000197');
    expect(result!.sponsorAnalysis!.sectorDonationPercentage).toBeGreaterThanOrEqual(0);
  });

  it('analyzes cosponsor funding', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.cosponsorSummary.totalCosponsors).toBe(2);
    expect(result!.cosponsorSummary.analyzedCosponsors).toBeGreaterThanOrEqual(0);
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeBillIntelligence('119-hr-1');

    const setCalls = mockRedisSet.mock.calls;
    const insightCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:bill_intelligence:119-hr-1'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('uses findCommitteeMapping for committee matching', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    // Lobbying pipeline should have been called if committee maps correctly
    const lobbyingMod = jest.requireMock<{ analyzeLobbyingPipeline: jest.Mock }>(
      '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer'
    );
    expect(lobbyingMod.analyzeLobbyingPipeline).toHaveBeenCalled();
  });
});

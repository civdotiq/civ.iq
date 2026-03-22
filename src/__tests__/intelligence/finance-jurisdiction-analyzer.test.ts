/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Finance-Jurisdiction Overlap Analyzer (Insight 1).
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
  generateAIText: jest.fn().mockResolvedValue('AI narrative text.'),
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
    { sector: 'HEALTH', totalAmount: 50000, contributionCount: 20 },
    { sector: 'DEFENSE', totalAmount: 30000, contributionCount: 10 },
    { sector: 'ENERGY_NATURAL_RESOURCES', totalAmount: 20000, contributionCount: 5 },
  ]),
  IndustrySector: {
    HEALTH: 'HEALTH',
    DEFENSE: 'DEFENSE',
    ENERGY_NATURAL_RESOURCES: 'ENERGY_NATURAL_RESOURCES',
  },
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    { committeeCode: 'HSAG', committeeName: 'Agriculture', topics: ['Agriculture'] },
    { committeeCode: 'HSEN', committeeName: 'Energy and Commerce', topics: ['Energy', 'Health'] },
  ],
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getJurisdictionSectorsForTopics: jest
    .fn()
    .mockReturnValue(['HEALTH', 'ENERGY_NATURAL_RESOURCES']),
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

import { analyzeFinanceJurisdiction } from '@/lib/intelligence/analyzers/finance-jurisdiction-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockRep = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democrat',
  state: 'CA',
  chamber: 'House',
  committees: [{ name: 'Energy and Commerce', role: 'Member' }],
};

const mockContributions = [{ contributor_name: 'Test Corp', amount: 5000, employer: 'Test Corp' }];

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeFinanceJurisdiction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    mockGetEnhancedRepresentative.mockResolvedValue(mockRep);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue(mockContributions);
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { bioguideId: 'P000197', overlapScore: 0.7, source: 'ai-generated' };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeFinanceJurisdiction('P000197');

    expect(result).toEqual(cached);
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('computes overlap score from sector donations vs committee jurisdictions', async () => {
    const result = await analyzeFinanceJurisdiction('P000197');

    expect(result).not.toBeNull();
    expect(result!.bioguideId).toBe('P000197');
    expect(result!.overlapScore).toBeGreaterThanOrEqual(0);
    expect(result!.overlapScore).toBeLessThanOrEqual(1);
    expect(result!.committees.length).toBeGreaterThan(0);
  });

  it('returns null when no committees', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      ...mockRep,
      committees: [],
    });

    const result = await analyzeFinanceJurisdiction('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no FEC mapping', async () => {
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const result = await analyzeFinanceJurisdiction('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no contributions', async () => {
    mockGetSampleContributions.mockResolvedValue([]);

    const result = await analyzeFinanceJurisdiction('P000197');
    expect(result).toBeNull();
  });

  it('returns null when rep not found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const result = await analyzeFinanceJurisdiction('UNKNOWN');
    expect(result).toBeNull();
  });

  it('uses mget for peer comparison batch fetch', async () => {
    mockRedisKeys.mockResolvedValue([
      'overlap-score:HSEN:A000001',
      'overlap-score:HSEN:A000002',
      'overlap-score:HSEN:A000003',
      'overlap-score:HSEN:A000004',
      'overlap-score:HSEN:A000005',
    ]);
    mockRedisMget.mockResolvedValue([0.4, 0.5, 0.6, 0.45, 0.55]);

    const result = await analyzeFinanceJurisdiction('P000197');

    expect(result).not.toBeNull();
    expect(mockRedisMget).toHaveBeenCalled();
    expect(result!.peerComparison.peerCount).toBe(5);
  });

  it('recomputes confidence after peer comparison', async () => {
    mockRedisKeys.mockResolvedValue([
      'overlap-score:HSEN:A000001',
      'overlap-score:HSEN:A000002',
      'overlap-score:HSEN:A000003',
      'overlap-score:HSEN:A000004',
      'overlap-score:HSEN:A000005',
    ]);
    mockRedisMget.mockResolvedValue([0.4, 0.5, 0.6, 0.45, 0.55]);

    const result = await analyzeFinanceJurisdiction('P000197');

    // Confidence should reflect peer count > 0
    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThan(0);
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeFinanceJurisdiction('P000197');

    const setCalls = mockRedisSet.mock.calls;
    const insightCacheCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:finance_jurisdiction:P000197'
    );
    expect(insightCacheCall).toBeDefined();
    expect(insightCacheCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('includes required InsightBase fields', async () => {
    const result = await analyzeFinanceJurisdiction('P000197');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
    expect(result!.lastAnalyzedAt).toBeTruthy();
    expect(['ai-generated', 'statistical-fallback']).toContain(result!.source);
  });

  it('caps confidence at 0.5 when using statistical fallback', async () => {
    const aiProvider = jest.requireMock<{ generateAIText: jest.Mock }>('@/lib/ai/provider');
    aiProvider.generateAIText.mockResolvedValue(null);

    const result = await analyzeFinanceJurisdiction('P000197');

    expect(result).not.toBeNull();
    expect(result!.source).toBe('statistical-fallback');
    expect(result!.confidence).toBeLessThanOrEqual(0.5);
  });
});

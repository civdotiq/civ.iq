/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Vote-Finance Correlation Analyzer (Insight 2).
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

const mockGetSummary = jest.fn();
jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: { getSummary: (...args: unknown[]) => mockGetSummary(...args) },
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

jest.mock('@/lib/fec/industry-taxonomy', () => ({
  aggregateByIndustrySector: jest.fn().mockReturnValue([
    { sector: 'HEALTH', totalAmount: 50000, contributionCount: 20 },
    { sector: 'DEFENSE', totalAmount: 30000, contributionCount: 10 },
  ]),
  IndustrySector: { HEALTH: 'HEALTH', DEFENSE: 'DEFENSE' },
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue(['HEALTH']),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [],
}));

import { analyzeVoteFinance } from '@/lib/intelligence/analyzers/vote-finance-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockRep = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democrat',
  state: 'CA',
  chamber: 'House',
  committees: [{ name: 'Energy and Commerce' }],
};

function makeVotes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    bill: { type: 'hr', number: String(i + 1), congress: 119, title: `Health bill ${i + 1}` },
    position: i % 3 === 0 ? 'Nay' : 'Yea',
    date: '2025-03-01',
    question: 'On Passage',
    result: 'Passed',
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeVoteFinance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    mockGetEnhancedRepresentative.mockResolvedValue(mockRep);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue([{ amount: 5000 }]);
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(15));
    mockGetSenateMemberVotes.mockResolvedValue([]);
    mockGetSummary.mockResolvedValue({ affectedIndustries: ['HEALTH'] });
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { bioguideId: 'P000197', overallCorrelation: 0.5 };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeVoteFinance('P000197');
    expect(result).toEqual(cached);
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('fetches both sessions of 119th Congress', async () => {
    await analyzeVoteFinance('P000197');

    // Should call getHouseMemberVotes with sessions 1 and 2
    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith('P000197', 119, 1, 200);
    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith('P000197', 119, 2, 200);
  });

  it('classifies votes by sector', async () => {
    const result = await analyzeVoteFinance('P000197');

    expect(result).not.toBeNull();
    expect(result!.correlations.length).toBeGreaterThan(0);
    expect(result!.correlations[0]!.sector).toBeTruthy();
  });

  it('returns null when no FEC mapping', async () => {
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const result = await analyzeVoteFinance('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no representative', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const result = await analyzeVoteFinance('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no votes', async () => {
    mockGetHouseMemberVotes.mockResolvedValue([]);

    const result = await analyzeVoteFinance('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no contributions', async () => {
    mockGetSampleContributions.mockResolvedValue([]);

    const result = await analyzeVoteFinance('P000197');
    expect(result).toBeNull();
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzeVoteFinance('P000197');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
    expect(result!.lastAnalyzedAt).toBeTruthy();
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeVoteFinance('P000197');

    const setCalls = mockRedisSet.mock.calls;
    const insightCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:vote_finance:P000197'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('uses Senate vote service for senators', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockRep, chamber: 'Senate' });
    mockGetSenateMemberVotes.mockResolvedValue(makeVotes(15));

    await analyzeVoteFinance('P000197');

    expect(mockGetSenateMemberVotes).toHaveBeenCalled();
    expect(mockGetHouseMemberVotes).not.toHaveBeenCalled();
  });
});

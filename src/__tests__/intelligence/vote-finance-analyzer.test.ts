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

// Force both ML tiers to miss so getBillSectors reaches the keyword inference
// path, which uses the mocked policy-area-map above. Keeps the tests
// deterministic without loading ONNX / transformer models.
jest.mock('@/lib/intelligence/embeddings', () => ({
  classifyBillSectors: jest.fn().mockResolvedValue([]),
  classifyBillSectorsZeroShot: jest.fn().mockResolvedValue([]),
  embedText: jest.fn().mockResolvedValue([]),
  classifyZeroShot: jest.fn().mockResolvedValue([]),
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
    // Restore happy-path AI provider mock in case a prior test overrode it.
    const provider = jest.requireMock('@/lib/ai/provider') as {
      generateAIText: jest.Mock;
    };
    provider.generateAIText.mockReset();
    provider.generateAIText.mockResolvedValue('AI narrative.');
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

    // Should call getHouseMemberVotes with sessions 1 and 2, trimmed cap (MR12)
    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith('P000197', 119, 1, 120);
    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith('P000197', 119, 2, 120);
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
      (call: unknown[]) => (call[0] as string) === 'insight:vote_finance:v4:P000197'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('bails out for senators with upstream-block reason and skips vote fetches (MR10)', async () => {
    // Senate roll-call XML is Akamai-blocked for Vercel cloud IPs. The
    // analyzer must fail fast instead of spinning hundreds of timeouts.
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockRep, chamber: 'Senate' });

    const { analyzeVoteFinanceWithReason } = await import(
      '@/lib/intelligence/analyzers/vote-finance-analyzer'
    );
    const outcome = await analyzeVoteFinanceWithReason('P000197');

    expect(outcome.insight).toBeNull();
    expect(outcome.unavailableReason).toBe(
      'Senate roll-call data is temporarily unavailable from Vercel due to upstream CDN blocking by senate.gov.'
    );
    expect(mockGetSenateMemberVotes).not.toHaveBeenCalled();
    expect(mockGetHouseMemberVotes).not.toHaveBeenCalled();
  });

  it('writes per-bill sector cache on first classify (MR2)', async () => {
    // BillSummaryCache misses force getBillSectors to fall through to the
    // embedding/keyword tiers, whose resolved result must land in Redis
    // under `insight:bill_sectors:v2:{billId}` (v2 introduced in MR15 when
    // the classifier started consuming bill subjects + policyArea).
    mockGetSummary.mockResolvedValue(null);
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(3));
    mockGetSenateMemberVotes.mockResolvedValue([]);

    await analyzeVoteFinance('P000197');

    const sectorCacheWrite = mockRedisSet.mock.calls.find((call: unknown[]) =>
      (call[0] as string).startsWith('insight:bill_sectors:v2:')
    );
    expect(sectorCacheWrite).toBeDefined();
    // 30-day TTL
    expect(sectorCacheWrite![2]).toBe(30 * 24 * 60 * 60);
  });

  it('prefers cached bill-sector result over recomputing (MR2)', async () => {
    mockGetSummary.mockResolvedValue(null);
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(2));
    mockGetSenateMemberVotes.mockResolvedValue([]);
    // First call: insight cache miss; bill-sector cache returns a
    // pre-populated classification, so BillSummaryCache.getSummary must
    // NOT be consulted.
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key.startsWith('insight:bill_sectors:v2:')) return ['HEALTH'];
      return null;
    });

    await analyzeVoteFinance('P000197');

    expect(mockGetSummary).not.toHaveBeenCalled();
  });

  it('falls back to statistical narrative when LLM exceeds 7s budget (MR2)', async () => {
    // Force AI provider to hang well past the narrative timeout.
    const provider = jest.requireMock('@/lib/ai/provider') as {
      generateAIText: jest.Mock;
    };
    const originalImpl = provider.generateAIText.getMockImplementation();
    provider.generateAIText.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve('slow text'), 30_000))
    );

    try {
      const result = await analyzeVoteFinance('P000197');

      expect(result).not.toBeNull();
      expect(result!.source).toBe('statistical-fallback');
      expect(result!.narrative).toBeTruthy();
      // Confidence is halved for statistical fallbacks
      expect(result!.confidence).toBeLessThanOrEqual(0.5);
    } finally {
      // Restore so later tests don't inherit the slow implementation.
      if (originalImpl) {
        provider.generateAIText.mockImplementation(originalImpl);
      } else {
        provider.generateAIText.mockResolvedValue('AI narrative.');
      }
    }
  }, 15_000);

  it('cold compute completes well under Vercel 60s budget on mocked inputs (MR2)', async () => {
    // Regression benchmark: with all I/O mocked, the analyzer's own logic
    // (classification pool, peer fetch, narrative) must finish in a few
    // seconds. CI uses a 20s ceiling; real prod budget is 55s.
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(60));
    mockGetSenateMemberVotes.mockResolvedValue(makeVotes(60));
    mockGetSummary.mockResolvedValue({ affectedIndustries: ['HEALTH'] });

    const start = Date.now();
    const result = await analyzeVoteFinance('P000197');
    const elapsedMs = Date.now() - start;

    expect(result).not.toBeNull();
    expect(elapsedMs).toBeLessThan(20_000);
  }, 30_000);

  it('produces correlations and alignment that are numerically stable (MR2 regression guard)', async () => {
    // Deterministic vote pattern → fixed overallAlignment and per-sector
    // alignmentScore. Snapshots the expected values so future structural
    // changes cannot drift correlations silently.
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(30));
    mockGetSenateMemberVotes.mockResolvedValue([]);
    mockGetSummary.mockResolvedValue({ affectedIndustries: ['HEALTH'] });

    const result = await analyzeVoteFinance('P000197');
    expect(result).not.toBeNull();

    // 30 votes, every 3rd is Nay → 20 yea, 10 nay → 0.6667 yea rate
    const health = result!.correlations.find(c => c.sector === 'HEALTH');
    expect(health).toBeDefined();
    expect(health!.alignmentScore).toBeCloseTo(20 / 30, 2);
    expect(result!.overallAlignment).toBeCloseTo(20 / 30, 2);
  });
});

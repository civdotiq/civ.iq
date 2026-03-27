/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Vote Prediction Analyzer (ML-based independence scoring).
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisKeys = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    keys: mockRedisKeys,
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

const mockGetModelMetadata = jest.fn();
const mockPredictVote = jest.fn();
const mockBuildFeatureVector = jest.fn();
jest.mock('@/lib/intelligence/ml/vote-predictor', () => ({
  getModelMetadata: (...args: unknown[]) => mockGetModelMetadata(...args),
  predictVote: (...args: unknown[]) => mockPredictVote(...args),
  buildFeatureVector: (...args: unknown[]) => mockBuildFeatureVector(...args),
}));

const mockGetBillSectors = jest.fn();
jest.mock('@/lib/intelligence/analyzers/shared', () => {
  const actual = jest.requireActual('@/lib/intelligence/analyzers/shared');
  return {
    ...actual,
    getBillSectors: (...args: unknown[]) => mockGetBillSectors(...args),
    generateInsightNarrative: jest.fn().mockResolvedValue({
      narrative: 'Test narrative.',
      source: 'statistical-fallback' as const,
    }),
    withInsightTracking: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
    trackInsightCacheHit: jest.fn(),
    classifySignal: jest.fn(() => 'pattern' as const),
    SourceCollector: jest.fn().mockImplementation(() => ({
      add: jest.fn(),
      toSources: jest.fn(() => []),
      count: 0,
    })),
  };
});

import { analyzeVotePrediction } from '@/lib/intelligence/analyzers/vote-prediction-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockRep = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democrat',
  state: 'CA',
  chamber: 'House' as const,
  yearsInOffice: 38,
  committees: [{ name: 'Appropriations' }],
};

const mockModelMetadata = {
  modelVersion: '1.0.0',
  trainedAt: '2025-03-01',
  trainingRecords: 50000,
  testAccuracy: 0.712,
  testAUC: 0.78,
  featureNames: ['donor_bill_overlap', 'party_R', 'years_in_office'],
  predictionThreshold: 0.6,
  topFeatures: [
    { feature: 'donor_bill_overlap', importance: 0.35 },
    { feature: 'party_R', importance: 0.25 },
    { feature: 'years_in_office', importance: 0.15 },
  ],
};

function makeVotes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    voteId: `vote-${i}`,
    bill: { type: 'hr', number: String(i + 1), congress: 119, title: `Bill ${i + 1}` },
    position: i % 3 === 0 ? 'Nay' : 'Yea',
    date: '2025-03-01',
    question: 'On Passage',
    result: 'Passed',
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeVotePrediction', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Defaults
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockGetModelMetadata.mockReturnValue(mockModelMetadata);
    mockGetEnhancedRepresentative.mockResolvedValue(mockRep);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue([{ amount: 5000 }]);
    // fetchVotes calls both session 1 and session 2, so each call returns half
    mockGetHouseMemberVotes
      .mockResolvedValueOnce(makeVotes(15))
      .mockResolvedValueOnce(makeVotes(15));
    mockGetSenateMemberVotes.mockResolvedValue([]);
    mockGetSummary.mockResolvedValue({ affectedIndustries: ['HEALTH'] });
    mockGetBillSectors.mockResolvedValue(['HEALTH']);
    mockBuildFeatureVector.mockReturnValue(new Float32Array(10));

    // Default: model predicts yea with 0.8 probability for all votes
    mockPredictVote.mockResolvedValue({
      predictedVote: 'yea',
      yeaProbability: 0.8,
      topFactors: [
        { feature: 'donor_bill_overlap', humanLabel: 'Donor-bill overlap', contribution: 0.35 },
      ],
      shapFactors: [
        {
          feature: 'donor_bill_overlap',
          humanLabel: 'Donor-bill overlap',
          importance: 0.35,
          featureValue: 0.7,
          direction: 'toward_yea',
        },
      ],
    });
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { bioguideId: 'P000197', independenceScore: { score: 0.33 } };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeVotePrediction('P000197');
    expect(result).toEqual(cached);
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('returns null when model is not available', async () => {
    mockGetModelMetadata.mockReturnValue(null);

    const result = await analyzeVotePrediction('P000197');
    expect(result).toBeNull();
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('returns null when no FEC mapping', async () => {
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const result = await analyzeVotePrediction('P000197');
    expect(result).toBeNull();
  });

  it('returns null when representative not found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const result = await analyzeVotePrediction('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no votes available', async () => {
    mockGetHouseMemberVotes.mockReset().mockResolvedValue([]);
    mockGetSenateMemberVotes.mockReset().mockResolvedValue([]);

    const result = await analyzeVotePrediction('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no contributions', async () => {
    mockGetSampleContributions.mockResolvedValue([]);

    const result = await analyzeVotePrediction('P000197');
    expect(result).toBeNull();
  });

  it('returns null with insufficient confident predictions', async () => {
    // Make predictVote return uncertain so confidentPredictions stays 0
    mockPredictVote.mockResolvedValue({
      predictedVote: 'uncertain',
      yeaProbability: 0.5,
      topFactors: [],
      shapFactors: [],
    });

    const result = await analyzeVotePrediction('P000197');
    expect(result).toBeNull();
  });

  it('computes independence score correctly', async () => {
    // Setup: 30 votes, model predicts yea for all, but indices 0,3,6,9,12,15,18,21,24,27 are Nay
    // So 10 votes are nay but model says yea = 10 deviations
    // All 30 have sectors (mockGetBillSectors returns ['HEALTH']) = 30 confident predictions
    // Independence = 10/30 = 0.333...
    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.independenceScore.score).toBeCloseTo(10 / 30, 2);
    expect(result!.independenceScore.confidentPredictions).toBe(30);
    expect(result!.independenceScore.deviations).toBe(10);
  });

  it('reports model accuracy from metadata', async () => {
    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.modelAccuracy).toBe(0.712);
  });

  it('sorts notable deviations by confidence gap', async () => {
    // Make different votes return different yeaProbabilities
    // Nay votes (deviations) at indices 0,3,6,9,...
    // Give each deviation a different yeaProbability so sorting is testable
    let callIndex = 0;
    mockPredictVote.mockImplementation(async () => {
      const idx = callIndex++;
      // Vary yeaProbability: higher distance from 0.5 = higher confidence gap
      const probabilities = [0.95, 0.8, 0.65, 0.9, 0.8, 0.7, 0.85, 0.8, 0.75, 0.8];
      const probIndex = Math.floor(idx / 3); // One deviation per 3 votes (at i%3===0)
      const yeaProb = probabilities[probIndex % probabilities.length]!;
      return {
        predictedVote: 'yea',
        yeaProbability: yeaProb,
        topFactors: [],
        shapFactors: [],
      };
    });

    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.notableDeviations.length).toBeGreaterThan(0);

    // Verify sorted by descending abs(yeaProbability - 0.5)
    for (let i = 1; i < result!.notableDeviations.length; i++) {
      const prevGap = Math.abs(result!.notableDeviations[i - 1]!.yeaProbability - 0.5);
      const currGap = Math.abs(result!.notableDeviations[i]!.yeaProbability - 0.5);
      expect(prevGap).toBeGreaterThanOrEqual(currGap);
    }
  });

  it('includes top predictive factors from metadata', async () => {
    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.topPredictiveFactors).toHaveLength(3);
    expect(result!.topPredictiveFactors[0]!.feature).toBe('donor_bill_overlap');
    expect(result!.topPredictiveFactors[0]!.importance).toBe(0.35);
    expect(result!.topPredictiveFactors[0]!.humanLabel).toBeTruthy();
  });

  it('includes all InsightBase fields', async () => {
    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer).toBeTruthy();
    expect(result!.lastAnalyzedAt).toBeTruthy();
    expect(result!.narrative).toBe('Test narrative.');
    expect(result!.source).toBeTruthy();
  });

  it('caps confidence at 0.5 for statistical fallback', async () => {
    // generateInsightNarrative mock already returns source: 'statistical-fallback'
    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeLessThanOrEqual(0.5);
    expect(result!.source).toBe('statistical-fallback');
  });

  it('computes peer comparison when peer data available', async () => {
    // Mock cached independence scores for peers (need >= MIN_PEERS = 5)
    mockRedisKeys.mockResolvedValue([
      'independence-score:A000001',
      'independence-score:B000002',
      'independence-score:C000003',
      'independence-score:D000004',
      'independence-score:E000005',
    ]);
    // Return scores for each peer
    mockRedisGet.mockImplementation(async (key: string) => {
      if (key.startsWith('independence-score:')) return 0.25;
      return null;
    });

    const result = await analyzeVotePrediction('P000197');

    expect(result).not.toBeNull();
    expect(result!.peerComparison.peerCount).toBeGreaterThan(0);
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeVotePrediction('P000197');

    const insightCall = mockRedisSet.mock.calls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:vote_prediction:P000197'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('caches independence score separately', async () => {
    await analyzeVotePrediction('P000197');

    const scoreCall = mockRedisSet.mock.calls.find(
      (call: unknown[]) => (call[0] as string) === 'independence-score:P000197'
    );
    expect(scoreCall).toBeDefined();
    expect(scoreCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('uses Senate vote service for senators', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockRep, chamber: 'Senate' });
    mockGetSenateMemberVotes
      .mockResolvedValueOnce(makeVotes(15))
      .mockResolvedValueOnce(makeVotes(15));

    await analyzeVotePrediction('P000197');

    expect(mockGetSenateMemberVotes).toHaveBeenCalled();
    expect(mockGetHouseMemberVotes).not.toHaveBeenCalled();
  });
});

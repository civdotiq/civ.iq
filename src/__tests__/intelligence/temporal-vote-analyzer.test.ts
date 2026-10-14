/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for Temporal Vote Pattern Shifts Analyzer (Insight 3).
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

jest.mock('@/features/legislation/services/ai/bill-summary-cache', () => ({
  BillSummaryCache: { getSummary: jest.fn().mockResolvedValue(null) },
}));

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

const mockReadChamberCorpus = jest.fn();
jest.mock('@/lib/intelligence/analyzers/roll-corpus-reader', () => ({
  MIN_CORPUS_COVERAGE: 0.9,
  readChamberCorpus: (...args: unknown[]) => mockReadChamberCorpus(...args),
}));

jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: jest.fn(() => null),
}));

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getSampleContributions: jest.fn(() => Promise.resolve([])),
  },
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [],
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

import { analyzeTemporalVotes } from '@/lib/intelligence/analyzers/temporal-vote-analyzer';
import type { StandardizedVote } from '@/features/representatives/services/batch-voting-service';

// ── Test Data ─────────────────────────────────────────────────────

const mockRep = {
  bioguideId: 'P000197',
  name: 'Nancy Pelosi',
  party: 'Democrat',
  state: 'CA',
  chamber: 'House',
  committees: [{ name: 'Financial Services' }],
  nextElection: '2026',
};

const PEER_DEMOCRATS = Array.from({ length: 10 }, (_, i) => `D${String(i).padStart(6, '0')}`);
const REPUBLICANS = Array.from({ length: 10 }, (_, i) => `R${String(i).padStart(6, '0')}`);

/**
 * Build a corpus with 12 roll calls per quarter starting 2025-Q1. Democrats
 * vote Yea on every roll; the target member breaks with them on the last 3
 * rolls of each quarter (75% alignment). Republicans vote Nay.
 */
function makeCorpusRolls(quarters: number, chamber: 'House' | 'Senate' = 'House') {
  const rolls: StandardizedVote[] = [];
  for (let q = 0; q < quarters; q++) {
    const year = 2025 + Math.floor(q / 4);
    const month = (q % 4) * 3 + 1;
    for (let v = 0; v < 12; v++) {
      const roll = q * 12 + v + 1;
      rolls.push({
        voteId: `${chamber.toLowerCase()}-119-${year % 2 === 1 ? 1 : 2}-${roll}`,
        congress: 119,
        session: year % 2 === 1 ? 1 : 2,
        chamber,
        rollCallNumber: roll,
        date: `${year}-${String(month).padStart(2, '0')}-${String(v + 1).padStart(2, '0')}T15:00:00Z`,
        question: '',
        result: '',
        totals: { yea: 0, nay: 0, present: 0, notVoting: 0 },
        memberVotes: [
          {
            bioguideId: 'P000197',
            name: '',
            party: 'D',
            state: '',
            position: v < 9 ? 'Yea' : 'Nay',
          },
          ...PEER_DEMOCRATS.map(b => ({
            bioguideId: b,
            name: '',
            party: 'D',
            state: '',
            position: 'Yea' as const,
          })),
          ...REPUBLICANS.map(b => ({
            bioguideId: b,
            name: '',
            party: 'R',
            state: '',
            position: 'Nay' as const,
          })),
        ],
        sourceUrl: '',
        processedAt: '',
      });
    }
  }
  return rolls;
}

function corpus(rolls: StandardizedVote[], coverage = 1) {
  return { rolls, expected: Math.round(rolls.length / coverage), coverage };
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeTemporalVotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    mockGetEnhancedRepresentative.mockResolvedValue(mockRep);

    mockReadChamberCorpus.mockResolvedValue(corpus(makeCorpusRolls(5)));
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { bioguideId: 'P000197', overallTrend: 'stable' };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeTemporalVotes('P000197');
    expect(result).toEqual(cached);
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('partitions votes into quarterly windows', async () => {
    const result = await analyzeTemporalVotes('P000197');

    expect(result).not.toBeNull();
    expect(result!.quarters.length).toBeGreaterThanOrEqual(4);
    for (const q of result!.quarters) {
      expect(q.quarter).toMatch(/^\d{4}-Q[1-4]$/);
      expect(q.voteCount).toBeGreaterThan(0);
      expect(q.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(q.alignmentScore).toBeLessThanOrEqual(1);
    }
  });

  it('returns null when fewer than 4 quarters of data', async () => {
    mockReadChamberCorpus.mockResolvedValue(corpus(makeCorpusRolls(3)));

    const result = await analyzeTemporalVotes('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no representative found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const result = await analyzeTemporalVotes('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns null when the corpus is empty', async () => {
    mockReadChamberCorpus.mockResolvedValue({ rolls: [], expected: 0, coverage: 0 });

    const result = await analyzeTemporalVotes('P000197');
    expect(result).toBeNull();
  });

  it('classifies trend as stable, increasing, decreasing, or volatile', async () => {
    const result = await analyzeTemporalVotes('P000197');

    expect(result).not.toBeNull();
    expect(['stable', 'increasing', 'decreasing', 'volatile']).toContain(result!.overallTrend);
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzeTemporalVotes('P000197');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer).toBeTruthy();
  });

  it('caches result with 14-day TTL', async () => {
    const result = await analyzeTemporalVotes('P000197');
    if (!result) return; // Skip if null (insufficient data)

    const setCalls = mockRedisSet.mock.calls;
    const insightCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:temporal_votes:v2:P000197'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(14 * 24 * 60 * 60);
  });

  it('computes quarterly alignment against the party majority on each roll', async () => {
    const result = await analyzeTemporalVotes('P000197');

    expect(result).not.toBeNull();
    expect(result!.quarters.map(q => q.quarter)).toEqual([
      '2025-Q1',
      '2025-Q2',
      '2025-Q3',
      '2025-Q4',
      '2026-Q1',
    ]);
    for (const q of result!.quarters) {
      expect(q.voteCount).toBe(12);
      expect(q.alignmentScore).toBeCloseTo(0.75);
    }
  });

  it('returns null when corpus coverage is below 90%', async () => {
    mockReadChamberCorpus.mockResolvedValue(corpus(makeCorpusRolls(5), 0.8));

    const result = await analyzeTemporalVotes('P000197');
    expect(result).toBeNull();
    expect(mockRedisSet).not.toHaveBeenCalled();
  });

  it('returns null for a member without a D/R party majority', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockRep, party: 'Independent' });

    const result = await analyzeTemporalVotes('P000197');
    expect(result).toBeNull();
    expect(mockReadChamberCorpus).not.toHaveBeenCalled();
  });

  it('compares against same-party chamber members from the same corpus', async () => {
    const result = await analyzeTemporalVotes('P000197');

    expect(result!.peerComparison).toEqual(
      expect.objectContaining({
        value: 0.75,
        peerAverage: 1,
        peerCount: PEER_DEMOCRATS.length,
        peerGroupLabel: 'other House Democrats',
      })
    );
  });

  it("reads the member's own chamber corpus", async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockRep, chamber: 'Senate' });
    mockReadChamberCorpus.mockResolvedValue(corpus(makeCorpusRolls(5, 'Senate')));

    const result = await analyzeTemporalVotes('P000197');
    expect(mockReadChamberCorpus).toHaveBeenCalledWith('Senate', 119);
    expect(result!.quarters).toHaveLength(5);
  });
});

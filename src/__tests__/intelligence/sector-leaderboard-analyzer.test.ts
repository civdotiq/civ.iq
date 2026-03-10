/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Sector Leaderboard Analyzer.
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

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

// ── Imports ───────────────────────────────────────────────────────

import { buildSectorLeaderboard } from '@/lib/intelligence/analyzers/sector-leaderboard-analyzer';
import type { SectorLeaderboardResponse } from '@/lib/intelligence/types';
import type { IndustrySector } from '@/lib/fec/industry-taxonomy';

// ── Helpers ───────────────────────────────────────────────────────

const SECTOR: IndustrySector = 'Health' as IndustrySector;

const insightBase = {
  confidence: 0.85,
  dataAsOf: '2026-01-15T00:00:00.000Z',
  methodology: 'test',
  disclaimer: 'test disclaimer',
  lastAnalyzedAt: '2026-01-15T00:00:00.000Z',
  source: 'statistical-fallback' as const,
  overallCorrelation: 0.5,
  peerComparison: {
    peerGroup: 'chamber',
    peerCount: 10,
    peerMean: 0.5,
    peerMedian: 0.5,
    percentile: 50,
    standardDeviationsFromMean: 0,
  },
  narrative: 'Test narrative.',
};

function makeInsight(bioguideId: string, alignmentScore: number, meetsSampleSize = true) {
  return {
    ...insightBase,
    bioguideId,
    correlations: [
      {
        sector: SECTOR,
        donationAmount: alignmentScore * 100000,
        billsVotedOn: 15,
        alignmentScore,
        meetsSampleSize,
      },
    ],
  };
}

const reps: Record<string, { name: string; party: string; state: string; chamber: string }> = {
  A000001: { name: 'Alice Rep', party: 'D', state: 'CA', chamber: 'House' },
  B000002: { name: 'Bob Sen', party: 'R', state: 'TX', chamber: 'Senate' },
  C000003: { name: 'Carol Rep', party: 'D', state: 'NY', chamber: 'House' },
  D000004: { name: 'Dan Rep', party: 'R', state: 'FL', chamber: 'House' },
};

function setupRepMock() {
  mockGetEnhancedRepresentative.mockImplementation((id: string) =>
    Promise.resolve(reps[id] ?? null)
  );
}

function setupInsightKeys(...bioguideIds: string[]) {
  const keys = bioguideIds.map(id => `insight:vote_finance:${id}`);
  mockRedisKeys.mockResolvedValue(keys);
}

function setupMget(...insights: unknown[]) {
  mockRedisMget.mockResolvedValue(insights);
}

// ── Tests ─────────────────────────────────────────────────────────

describe('buildSectorLeaderboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    setupRepMock();
  });

  it('returns cached leaderboard on cache hit', async () => {
    const cached: SectorLeaderboardResponse = {
      sector: SECTOR,
      sectorLabel: 'Health',
      chamber: 'all',
      party: null,
      entries: [],
      stats: {
        mean: 0.5,
        median: 0.5,
        standardDeviation: 0,
        includedMembers: 0,
        excludedMembers: 0,
      },
      generatedAt: '2026-01-15T00:00:00.000Z',
      dataAsOf: '2026-01-15T00:00:00.000Z',
    };

    mockRedisGet.mockResolvedValue(cached);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).toEqual(cached);
    expect(mockRedisKeys).not.toHaveBeenCalled();
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('returns null when no vote-finance insights exist', async () => {
    mockRedisKeys.mockResolvedValue([]);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).toBeNull();
  });

  it('ranks members by sector alignment score', async () => {
    const insightA = makeInsight('A000001', 0.8);
    const insightB = makeInsight('B000002', 0.6);
    const insightC = makeInsight('C000003', 0.9);

    setupInsightKeys('A000001', 'B000002', 'C000003');
    setupMget(insightA, insightB, insightC);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(3);
    expect(result!.entries[0].bioguideId).toBe('C000003');
    expect(result!.entries[0].sectorAlignmentScore).toBe(0.9);
    expect(result!.entries[0].rank).toBe(1);
    expect(result!.entries[1].bioguideId).toBe('A000001');
    expect(result!.entries[1].sectorAlignmentScore).toBe(0.8);
    expect(result!.entries[1].rank).toBe(2);
    expect(result!.entries[2].bioguideId).toBe('B000002');
    expect(result!.entries[2].sectorAlignmentScore).toBe(0.6);
    expect(result!.entries[2].rank).toBe(3);
  });

  it('excludes members where sector meetsSampleSize is false', async () => {
    const insightA = makeInsight('A000001', 0.8, true);
    const insightB = makeInsight('B000002', 0.9, false);
    const insightC = makeInsight('C000003', 0.7, true);

    setupInsightKeys('A000001', 'B000002', 'C000003');
    setupMget(insightA, insightB, insightC);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);

    const ids = result!.entries.map(e => e.bioguideId);
    expect(ids).not.toContain('B000002');
    expect(ids).toContain('A000001');
    expect(ids).toContain('C000003');

    expect(result!.stats.excludedMembers).toBe(1);
  });

  it('filters by chamber', async () => {
    const insightA = makeInsight('A000001', 0.8); // House
    const insightB = makeInsight('B000002', 0.9); // Senate
    const insightC = makeInsight('C000003', 0.7); // House

    setupInsightKeys('A000001', 'B000002', 'C000003');
    setupMget(insightA, insightB, insightC);

    const result = await buildSectorLeaderboard(SECTOR, { chamber: 'house' });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    expect(result!.entries.every(e => e.chamber === 'House')).toBe(true);
    expect(result!.chamber).toBe('house');
  });

  it('filters by party', async () => {
    const insightA = makeInsight('A000001', 0.8); // D
    const insightB = makeInsight('B000002', 0.9); // R
    const insightC = makeInsight('C000003', 0.7); // D

    setupInsightKeys('A000001', 'B000002', 'C000003');
    setupMget(insightA, insightB, insightC);

    const result = await buildSectorLeaderboard(SECTOR, { party: 'R' });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].bioguideId).toBe('B000002');
    expect(result!.entries[0].party).toBe('R');
    expect(result!.party).toBe('R');
  });

  it('computes correct statistics (mean, median, std dev)', async () => {
    // Scores: 0.9, 0.8, 0.6 => sorted descending
    const insightA = makeInsight('A000001', 0.8);
    const insightB = makeInsight('B000002', 0.6);
    const insightC = makeInsight('C000003', 0.9);

    setupInsightKeys('A000001', 'B000002', 'C000003');
    setupMget(insightA, insightB, insightC);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).not.toBeNull();
    const { stats } = result!;

    // mean of [0.8, 0.6, 0.9] = 2.3 / 3 ≈ 0.7667
    expect(stats.mean).toBeCloseTo((0.8 + 0.6 + 0.9) / 3, 4);
    // median of [0.6, 0.8, 0.9] = 0.8
    expect(stats.median).toBeCloseTo(0.8, 4);
    // sample std dev of [0.8, 0.6, 0.9]
    const m = (0.8 + 0.6 + 0.9) / 3;
    const variance = ((0.8 - m) ** 2 + (0.6 - m) ** 2 + (0.9 - m) ** 2) / 2;
    expect(stats.standardDeviation).toBeCloseTo(Math.sqrt(variance), 4);
    expect(stats.includedMembers).toBe(3);
    expect(stats.excludedMembers).toBe(0);
  });

  it('respects limit parameter', async () => {
    const insightA = makeInsight('A000001', 0.8);
    const insightB = makeInsight('B000002', 0.6);
    const insightC = makeInsight('C000003', 0.9);

    setupInsightKeys('A000001', 'B000002', 'C000003');
    setupMget(insightA, insightB, insightC);

    const result = await buildSectorLeaderboard(SECTOR, { limit: 2 });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);
    // Should be the top 2 by alignment score
    expect(result!.entries[0].sectorAlignmentScore).toBe(0.9);
    expect(result!.entries[1].sectorAlignmentScore).toBe(0.8);
    // Stats still reflect all included members (3), not just the limited entries
    expect(result!.stats.includedMembers).toBe(3);
  });
});

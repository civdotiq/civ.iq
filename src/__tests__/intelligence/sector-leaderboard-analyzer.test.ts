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
const mockRedisMget = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    mget: mockRedisMget,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  trackInsightCacheHit: jest.fn(),
  withInsightTracking: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  classifySignal: jest.fn(() => 'pattern' as const),
  SourceCollector: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    toSources: jest.fn(() => []),
    count: 0,
  })),
}));

const mockGetEnhancedRepresentative = jest.fn();
const mockGetAllEnhancedRepresentatives = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
  getAllEnhancedRepresentatives: () => mockGetAllEnhancedRepresentatives(),
}));

// ── Imports ───────────────────────────────────────────────────────

import { buildSectorLeaderboard } from '@/lib/intelligence/analyzers/sector-leaderboard-analyzer';
import logger from '@/lib/logging/simple-logger';
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
  E000005: { name: 'Eve Rep', party: 'R', state: 'TX', chamber: 'House' },
};

function setupRepMock() {
  mockGetEnhancedRepresentative.mockImplementation((id: string) =>
    Promise.resolve(reps[id] ?? null)
  );
}

function setupInsightKeys(...bioguideIds: string[]) {
  mockGetAllEnhancedRepresentatives.mockResolvedValue(
    bioguideIds.map(bioguideId => ({ bioguideId }))
  );
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
    mockGetAllEnhancedRepresentatives.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    setupRepMock();
  });

  it('returns cached leaderboard on cache hit', async () => {
    const cached: SectorLeaderboardResponse = {
      sector: SECTOR,
      sectorLabel: 'Health',
      chamber: 'all',
      party: null,
      coverageNote: 'House members only.',
      entries: [],
      stats: {
        mean: 0.5,
        median: 0.5,
        standardDeviation: 0,
        includedMembers: 0,
        excludedMembers: 0,
      },
      dataAvailability: { cachedInsights: 100, minimumRequired: 50, status: 'sufficient' },
      generatedAt: '2026-01-15T00:00:00.000Z',
      dataAsOf: '2026-01-15T00:00:00.000Z',
    };

    mockRedisGet.mockResolvedValue(cached);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).toEqual(cached);
    expect(mockGetAllEnhancedRepresentatives).not.toHaveBeenCalled();
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('returns null when no vote-finance insights exist', async () => {
    mockGetAllEnhancedRepresentatives.mockResolvedValue([]);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).toBeNull();
  });

  it('orders members by state then name, not by score, with no rank or money', async () => {
    const insightA = makeInsight('A000001', 0.8); // CA
    const insightC = makeInsight('C000003', 0.9); // NY
    const insightD = makeInsight('D000004', 0.6); // FL

    setupInsightKeys('A000001', 'C000003', 'D000004');
    setupMget(insightA, insightC, insightD);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).not.toBeNull();
    expect(result!.entries.map(e => e.bioguideId)).toEqual(['A000001', 'D000004', 'C000003']);
    for (const entry of result!.entries) {
      expect(entry).not.toHaveProperty('rank');
      expect(entry).not.toHaveProperty('sectorDonationAmount');
    }
    expect(result!.coverageNote).toMatch(/House members only/);
  });

  it('leaves out senators (vote-finance is House only)', async () => {
    setupInsightKeys('A000001', 'B000002');
    setupMget(makeInsight('A000001', 0.8), makeInsight('B000002', 0.9));

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result!.entries.map(e => e.bioguideId)).toEqual(['A000001']);
    expect(await buildSectorLeaderboard(SECTOR, { chamber: 'senate' })).toBeNull();
  });

  it('excludes members where sector meetsSampleSize is false', async () => {
    const insightA = makeInsight('A000001', 0.8, true);
    const insightD = makeInsight('D000004', 0.9, false);
    const insightC = makeInsight('C000003', 0.7, true);

    setupInsightKeys('A000001', 'D000004', 'C000003');
    setupMget(insightA, insightD, insightC);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(2);

    const ids = result!.entries.map(e => e.bioguideId);
    expect(ids).not.toContain('D000004');
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
    const insightE = makeInsight('E000005', 0.9); // R
    const insightC = makeInsight('C000003', 0.7); // D

    setupInsightKeys('A000001', 'E000005', 'C000003');
    setupMget(insightA, insightE, insightC);

    const result = await buildSectorLeaderboard(SECTOR, { party: 'R' });

    expect(result).not.toBeNull();
    expect(result!.entries).toHaveLength(1);
    expect(result!.entries[0].bioguideId).toBe('E000005');
    expect(result!.entries[0].party).toBe('R');
    expect(result!.party).toBe('R');
  });

  it('matches a party code against full roster party names', async () => {
    reps.F000006 = { name: 'Fay Rep', party: 'Republican', state: 'OH', chamber: 'House' };
    reps.G000007 = { name: 'Gus Rep', party: 'Democrat', state: 'OH', chamber: 'House' };
    setupInsightKeys('F000006', 'G000007');
    setupMget(makeInsight('F000006', 0.5), makeInsight('G000007', 0.6));

    const result = await buildSectorLeaderboard(SECTOR, { party: 'R' });

    expect(result!.entries.map(e => e.bioguideId)).toEqual(['F000006']);
  });

  it('computes correct statistics (mean, median, std dev)', async () => {
    const insightA = makeInsight('A000001', 0.8);
    const insightD = makeInsight('D000004', 0.6);
    const insightC = makeInsight('C000003', 0.9);

    setupInsightKeys('A000001', 'D000004', 'C000003');
    setupMget(insightA, insightD, insightC);

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

  it('returns every included member by default and treats limit as a cap', async () => {
    const insights = [
      makeInsight('A000001', 0.8),
      makeInsight('D000004', 0.6),
      makeInsight('C000003', 0.9),
    ];
    setupInsightKeys('A000001', 'D000004', 'C000003');
    setupMget(...insights);

    const all = await buildSectorLeaderboard(SECTOR);
    expect(all!.entries).toHaveLength(3);

    setupMget(...insights);
    mockRedisGet.mockResolvedValue(null);
    const capped = await buildSectorLeaderboard(SECTOR, { limit: 2 });
    expect(capped!.entries.map(e => e.bioguideId)).toEqual(['A000001', 'D000004']);
    // Stats still reflect all included members (3), not just the capped entries
    expect(capped!.stats.includedMembers).toBe(3);
  });

  it('returns null and logs warning when Redis has no cached insights', async () => {
    mockGetAllEnhancedRepresentatives.mockResolvedValue([]);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      '[SectorLeaderboard] No cached insights found — leaderboard unavailable until representative pages warm the cache'
    );
  });

  it('returns partial dataAvailability when fewer than 50 insights exist', async () => {
    const insights = [
      makeInsight('A000001', 0.8),
      makeInsight('B000002', 0.6),
      makeInsight('C000003', 0.9),
      makeInsight('D000004', 0.7),
    ];
    // We have no E000005 rep mock, so use only 4 with existing reps
    setupInsightKeys('A000001', 'B000002', 'C000003', 'D000004');
    setupMget(...insights);

    const result = await buildSectorLeaderboard(SECTOR);

    expect(result).not.toBeNull();
    expect(result!.dataAvailability).toEqual({
      cachedInsights: 4,
      minimumRequired: 50,
      status: 'partial',
    });
  });

  it('reads each current member by exact v4 key, in MGET chunks of 100', async () => {
    const ids = Array.from({ length: 250 }, (_, i) => `X${String(i).padStart(6, '0')}`);
    setupInsightKeys(...ids);
    mockRedisMget.mockImplementation((keys: string[]) => Promise.resolve(keys.map(() => null)));

    await buildSectorLeaderboard(SECTOR);

    const calls = mockRedisMget.mock.calls.map(([keys]) => keys as string[]);
    expect(calls.map(keys => keys.length)).toEqual([100, 100, 50]);
    expect(calls[0][0]).toBe('insight:vote_finance:v4:X000000');
    expect(calls[2][49]).toBe('insight:vote_finance:v4:X000249');
  });
});

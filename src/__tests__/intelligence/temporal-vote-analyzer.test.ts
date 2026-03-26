/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
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

const mockGetHouseMemberVotes = jest.fn();
const mockGetSenateMemberVotes = jest.fn();
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseMemberVotes: (...args: unknown[]) => mockGetHouseMemberVotes(...args),
    getSenateMemberVotes: (...args: unknown[]) => mockGetSenateMemberVotes(...args),
  },
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

/** Generate votes spread across quarters with party alignment XML responses. */
function makeTemporalVotes(quarters: number) {
  const votes: Array<{
    voteId: string;
    date: string;
    position: string;
    rollCallNumber: number;
  }> = [];

  // Generate votes across specified number of quarters starting from 2025-Q1
  for (let q = 0; q < quarters; q++) {
    const year = 2025 + Math.floor(q / 4);
    const month = (q % 4) * 3 + 1;
    for (let v = 0; v < 12; v++) {
      votes.push({
        voteId: `house-${year}-${q * 20 + v}`,
        date: `${year}-${String(month).padStart(2, '0')}-${String((v % 28) + 1).padStart(2, '0')}`,
        position: v < 9 ? 'Yea' : 'Nay',
        rollCallNumber: q * 20 + v + 1,
      });
    }
  }

  return votes;
}

// Build party breakdown XML for mock fetch responses
function buildHouseXml(yeaCount: number, nayCount: number) {
  let xml = '<rollcall-vote>';
  for (let i = 0; i < yeaCount; i++) {
    xml += `<recorded-vote><legislator party="D"/><vote>Yea</vote></recorded-vote>`;
  }
  for (let i = 0; i < nayCount; i++) {
    xml += `<recorded-vote><legislator party="D"/><vote>Nay</vote></recorded-vote>`;
  }
  xml += '</rollcall-vote>';
  return xml;
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

    const votes = makeTemporalVotes(5);
    mockGetHouseMemberVotes.mockResolvedValue(votes);
    mockGetSenateMemberVotes.mockResolvedValue([]);

    // Mock global.fetch for roll call XML
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('clerk.house.gov')) {
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(buildHouseXml(100, 50)),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
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
    // Only provide votes for 1 quarter
    const fewVotes = makeTemporalVotes(1);
    mockGetHouseMemberVotes.mockResolvedValue(fewVotes);

    const result = await analyzeTemporalVotes('P000197');
    expect(result).toBeNull();
  });

  it('returns null when no representative found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const result = await analyzeTemporalVotes('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns null when no votes', async () => {
    mockGetHouseMemberVotes.mockResolvedValue([]);

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
      (call: unknown[]) => (call[0] as string) === 'insight:temporal_votes:P000197'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(14 * 24 * 60 * 60);
  });

  it('fetches votes from both sessions', async () => {
    await analyzeTemporalVotes('P000197');

    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith('P000197', 119, 1, 250);
    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith('P000197', 119, 2, 250);
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Tests for PAC-to-Legislator Vote Tracing Analyzer (Insight 5).
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisHashSet = jest.fn();
const mockRedisHashGetAll = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    hashSet: mockRedisHashSet,
    hashGetAll: mockRedisHashGetAll,
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
  BillSummaryCache: { getSummary: jest.fn().mockResolvedValue({ affectedIndustries: ['HEALTH'] }) },
}));

const mockGetCommitteeInfo = jest.fn();
const mockGetSampleContributions = jest.fn();
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getCommitteeInfo: (...args: unknown[]) => mockGetCommitteeInfo(...args),
    getSampleContributions: (...args: unknown[]) => mockGetSampleContributions(...args),
  },
}));

jest.mock('@/lib/fec/industry-taxonomy', () => ({
  categorizePACByName: jest.fn().mockReturnValue({ sector: 'HEALTH', category: 'Health' }),
  IndustrySector: {
    HEALTH: 'HEALTH',
    OTHER: 'OTHER',
  },
}));

const mockResolveCommitteeRecipients = jest.fn();
jest.mock('@/lib/fec/recipient-resolver', () => ({
  resolveCommitteeRecipients: (...args: unknown[]) => mockResolveCommitteeRecipients(...args),
}));

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

const mockGetHouseMemberVotes = jest.fn();
const mockGetSenateMemberVotes = jest.fn();
const mockGetPartyYeaRate = jest.fn();
jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseMemberVotes: (...args: unknown[]) => mockGetHouseMemberVotes(...args),
    getSenateMemberVotes: (...args: unknown[]) => mockGetSenateMemberVotes(...args),
    getPartyYeaRate: (...args: unknown[]) => mockGetPartyYeaRate(...args),
  },
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getPolicyAreasForSector: jest.fn().mockReturnValue(['Health']),
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue(['HEALTH']),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [],
}));

import { analyzePACVotes } from '@/lib/intelligence/analyzers/pac-vote-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockRecipients = [
  { bioguideId: 'A000001', chamber: 'House', totalAmount: 5000, candidateId: 'H0CA01' },
  { bioguideId: 'A000002', chamber: 'House', totalAmount: 3000, candidateId: 'H0CA02' },
  { bioguideId: 'A000003', chamber: 'Senate', totalAmount: 2000, candidateId: 'S0CA03' },
];

function makeVotes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    bill: { type: 'hr', number: String(i + 1), congress: 119, title: `Health bill ${i}` },
    position: i < Math.ceil(count * 0.7) ? 'Yea' : 'Nay',
    date: '2025-03-01',
    rollCallNumber: i + 1,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzePACVotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisHashSet.mockResolvedValue(true);
    mockRedisHashGetAll.mockResolvedValue({});

    mockGetCommitteeInfo.mockResolvedValue({ name: 'Health PAC', id: 'C00123456' });
    mockResolveCommitteeRecipients.mockResolvedValue(mockRecipients);
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'A000001',
      name: 'Test Rep',
      party: 'Democrat',
      state: 'CA',
      chamber: 'House',
    });
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(10));
    mockGetSenateMemberVotes.mockResolvedValue(makeVotes(10));
    mockGetPartyYeaRate.mockReturnValue({ yeaRate: 0.6 });
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { committeeId: 'C00123456', sector: 'HEALTH' };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzePACVotes('C00123456');
    expect(result).toEqual(cached);
    expect(mockGetCommitteeInfo).not.toHaveBeenCalled();
  });

  it('fetches each recipient once across the whole 119th Congress', async () => {
    await analyzePACVotes('C00123456');

    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith(expect.any(String), 119, undefined, 200);
    expect(mockGetHouseMemberVotes).not.toHaveBeenCalledWith(expect.any(String), 119, 1, 200);
    expect(mockGetHouseMemberVotes).not.toHaveBeenCalledWith(expect.any(String), 119, 2, 200);
  });

  it('returns null when PAC cannot be classified', async () => {
    mockGetCommitteeInfo.mockResolvedValue(null);

    const result = await analyzePACVotes('C00123456');
    expect(result).toBeNull();
  });

  it('returns null when PAC sector is OTHER', async () => {
    const taxonomy = jest.requireMock<{ categorizePACByName: jest.Mock }>(
      '@/lib/fec/industry-taxonomy'
    );
    taxonomy.categorizePACByName.mockReturnValueOnce({ sector: 'OTHER' });

    const result = await analyzePACVotes('C00123456');
    expect(result).toBeNull();
  });

  it('returns null when fewer than MIN_PAC_RECIPIENTS', async () => {
    mockResolveCommitteeRecipients.mockResolvedValue([mockRecipients[0]]);

    const result = await analyzePACVotes('C00123456');
    expect(result).toBeNull();
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzePACVotes('C00123456');
    if (!result) return;

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
    expect(result.dataAsOf).toBeTruthy();
    expect(result.methodology).toBeTruthy();
    expect(result.disclaimer.toLowerCase()).toContain('correlation');
  });

  it('computes aggregate yea rate', async () => {
    const result = await analyzePACVotes('C00123456');
    if (!result) return;

    expect(result.aggregateYeaRate).toBeGreaterThanOrEqual(0);
    expect(result.aggregateYeaRate).toBeLessThanOrEqual(1);
  });

  describe('peer comparison', () => {
    const fresh = (yeaRate: number) => JSON.stringify({ yeaRate, asOf: new Date().toISOString() });
    const fivePeers = {
      C00000001: fresh(0.5),
      C00000002: fresh(0.6),
      C00000003: fresh(0.7),
      C00000004: fresh(0.8),
      C00000005: fresh(0.9),
    };

    it('reads peers from the sector index with one HGETALL, no KEYS', async () => {
      mockRedisHashGetAll.mockResolvedValue(fivePeers);

      const result = await analyzePACVotes('C00123456');

      expect(mockRedisHashGetAll).toHaveBeenCalledWith('pac-alignment-index:v1:HEALTH');
      expect(result?.peerComparison?.peerCount).toBe(5);
      expect(result?.peerComparison?.peerAverage).toBeCloseTo(0.7);
      expect(result?.peerComparisonUnavailableReason).toBeUndefined();
    });

    it('excludes the PAC itself and rows older than 7 days', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      mockRedisHashGetAll.mockResolvedValue({
        ...fivePeers,
        C00000005: JSON.stringify({ yeaRate: 0.9, asOf: eightDaysAgo }),
        C00123456: fresh(0.1),
      });

      const result = await analyzePACVotes('C00123456');

      expect(result?.peerComparison).toBeNull();
      expect(result?.peerComparisonUnavailableReason).toBeTruthy();
    });

    it('ignores malformed rows', async () => {
      mockRedisHashGetAll.mockResolvedValue({
        ...fivePeers,
        C00000005: 'not json',
        C00000006: JSON.stringify({ yeaRate: 'high', asOf: new Date().toISOString() }),
      });

      const result = await analyzePACVotes('C00123456');
      expect(result?.peerComparison).toBeNull();
    });

    it('reports no peers when Redis cannot be read', async () => {
      mockRedisHashGetAll.mockResolvedValue(null);

      const result = await analyzePACVotes('C00123456');
      expect(result?.peerComparison).toBeNull();
    });

    it('writes its own yea rate to the sector index', async () => {
      const result = await analyzePACVotes('C00123456');

      expect(mockRedisHashSet).toHaveBeenCalledWith(
        'pac-alignment-index:v1:HEALTH',
        'C00123456',
        expect.any(String)
      );
      const row = JSON.parse(mockRedisHashSet.mock.calls[0][2] as string) as {
        yeaRate: number;
        asOf: string;
      };
      expect(row.yeaRate).toBe(result?.aggregateYeaRate);
      expect(Number.isNaN(Date.parse(row.asOf))).toBe(false);
    });
  });
});

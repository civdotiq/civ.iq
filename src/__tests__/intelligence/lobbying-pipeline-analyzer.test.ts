/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Lobbying-Committee-Legislation Pipeline Analyzer (Insight 4).
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

// Corpus loader — default unavailable so the analyzer uses the sample + cached
// peer path (the historical behavior these tests cover). One test overrides it.
const mockGetCommitteeCorpusTotals = jest.fn().mockResolvedValue(null);
const mockGetAllCommitteeWindowTotals = jest.fn().mockResolvedValue(null);
jest.mock('@/lib/data-sources/lda-corpus/load', () => ({
  getCommitteeCorpusTotals: (...args: unknown[]) => mockGetCommitteeCorpusTotals(...args),
  getAllCommitteeWindowTotals: (...args: unknown[]) => mockGetAllCommitteeWindowTotals(...args),
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

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    {
      committeeCode: 'HSEN',
      committeeName: 'Energy and Commerce',
      chamber: 'House',
      topics: ['Energy', 'Health'],
    },
    {
      committeeCode: 'HSAG',
      committeeName: 'Agriculture',
      chamber: 'House',
      topics: ['Agriculture'],
    },
    {
      committeeCode: 'HSWM',
      committeeName: 'Ways and Means',
      chamber: 'House',
      topics: ['Taxation'],
    },
    {
      committeeCode: 'HSBA',
      committeeName: 'Financial Services',
      chamber: 'House',
      topics: ['Finance'],
    },
    {
      committeeCode: 'HSJU',
      committeeName: 'Judiciary',
      chamber: 'House',
      topics: ['Law'],
    },
    {
      committeeCode: 'HSAS',
      committeeName: 'Armed Services',
      chamber: 'House',
      topics: ['Defense'],
    },
  ],
}));

const mockFetchRecentFilings = jest.fn();
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: {
    fetchRecentFilings: (...args: unknown[]) => mockFetchRecentFilings(...args),
  },
}));

jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: jest.fn().mockReturnValue([]),
  getResolvedCommittees: jest.fn().mockReturnValue([{ committeeCode: 'HSEN' }]),
}));

jest.mock('@/lib/intelligence/entity-resolution/lda-issue-policy-map', () => ({
  getLDAIssueLabel: jest.fn().mockReturnValue('Health'),
  getPolicyAreasForLDAIssue: jest.fn().mockReturnValue(['Health']),
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn().mockResolvedValue([]),
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

import { analyzeLobbyingPipeline } from '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

function makeFilings(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    filing_uuid: `filing-${i}`,
    client: { name: `Org ${i % 5}` },
    income: 100000 + i * 10000,
    government_entities: [{ name: 'Energy and Commerce' }],
    issues: [{ code: 'HCR', description: 'Health Care' }],
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeLobbyingPipeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);
    mockFetchRecentFilings.mockResolvedValue(makeFilings(20));
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { committeeCode: 'HSEN', totalSpending: 500000 };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeLobbyingPipeline('HSEN');
    expect(result).toEqual(cached);
    expect(mockFetchRecentFilings).not.toHaveBeenCalled();
  });

  it('returns null for unknown committee code', async () => {
    const result = await analyzeLobbyingPipeline('UNKNOWN');
    expect(result).toBeNull();
  });

  it('returns null when no filings found', async () => {
    mockFetchRecentFilings.mockResolvedValue([]);

    const result = await analyzeLobbyingPipeline('HSEN');
    expect(result).toBeNull();
  });

  it('returns null when fewer than MIN_FILINGS_LOBBYING matched', async () => {
    mockFetchRecentFilings.mockResolvedValue(makeFilings(2));

    const result = await analyzeLobbyingPipeline('HSEN');
    expect(result).toBeNull();
  });

  it('groups filings by organization', async () => {
    const result = await analyzeLobbyingPipeline('HSEN');

    expect(result).not.toBeNull();
    expect(result!.topOrganizations.length).toBeGreaterThan(0);
    for (const org of result!.topOrganizations) {
      expect(org.name).toBeTruthy();
      expect(org.totalSpending).toBeGreaterThanOrEqual(0);
      expect(org.filingCount).toBeGreaterThan(0);
    }
  });

  it('groups filings by LDA issue code', async () => {
    const result = await analyzeLobbyingPipeline('HSEN');

    expect(result).not.toBeNull();
    expect(result!.issueAlignments.length).toBeGreaterThan(0);
    for (const alignment of result!.issueAlignments) {
      expect(alignment.issueCode).toBeTruthy();
      expect(alignment.lobbyingSpending).toBeGreaterThanOrEqual(0);
    }
  });

  it('uses mget for peer comparison when the corpus is unavailable', async () => {
    mockRedisMget.mockResolvedValue([100000, 200000, 300000, 150000, 250000]);

    const result = await analyzeLobbyingPipeline('HSEN');

    expect(result).not.toBeNull();
    expect(mockRedisMget).toHaveBeenCalled();
  });

  it('prefers the corpus total and corpus peers over the sample when available', async () => {
    mockGetCommitteeCorpusTotals.mockResolvedValueOnce({ windowTotal: 6_000_000_000 });
    mockGetAllCommitteeWindowTotals.mockResolvedValueOnce(
      new Map([
        ['HSEN', 6_000_000_000],
        ['HSAG', 1_000_000_000],
        ['HSWM', 4_000_000_000],
        ['HSBA', 3_000_000_000],
        ['HSJU', 800_000_000],
        ['HSAS', 2_000_000_000],
      ])
    );

    const result = await analyzeLobbyingPipeline('HSEN');

    expect(result).not.toBeNull();
    // Corpus total replaces the sample-derived figure
    expect(result!.totalSpending).toBe(6_000_000_000);
    // Peer ranking comes from the corpus, not the cached sample scores
    expect(mockRedisMget).not.toHaveBeenCalled();
    expect(result!.peerComparison).not.toBeNull();
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzeLobbyingPipeline('HSEN');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeLobbyingPipeline('HSEN');

    const setCalls = mockRedisSet.mock.calls;
    const insightCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:lobbying_pipeline:HSEN'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(7 * 24 * 60 * 60);
  });
});

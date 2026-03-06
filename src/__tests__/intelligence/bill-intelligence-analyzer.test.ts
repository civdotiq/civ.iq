/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Bill Intelligence Analyzer.
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    keys: jest.fn().mockResolvedValue([]),
    mget: jest.fn().mockResolvedValue([]),
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

const mockFetchBillFromCongress = jest.fn();
jest.mock('@/lib/services/bill.service', () => ({
  fetchBillFromCongress: (...args: unknown[]) => mockFetchBillFromCongress(...args),
}));

const mockGetFECIdFromBioguide = jest.fn();
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  getFECIdFromBioguide: (...args: unknown[]) => mockGetFECIdFromBioguide(...args),
}));

const mockGetSampleContributions = jest.fn();
const mockGetFinancialSummary = jest.fn();
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getSampleContributions: (...args: unknown[]) => mockGetSampleContributions(...args),
    getFinancialSummary: (...args: unknown[]) => mockGetFinancialSummary(...args),
  },
}));

const mockGetEnhancedRepresentative = jest.fn();
jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: (...args: unknown[]) => mockGetEnhancedRepresentative(...args),
}));

jest.mock('@/lib/fec/industry-taxonomy', () => ({
  aggregateByIndustrySector: jest.fn().mockReturnValue([
    { sector: 'HEALTH', totalAmount: 50000 },
    { sector: 'DEFENSE', totalAmount: 20000 },
  ]),
  IndustrySector: { HEALTH: 'HEALTH', DEFENSE: 'DEFENSE' },
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue(['HEALTH']),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [
    {
      committeeCode: 'HSEN',
      committeeName: 'Energy and Commerce',
      chamber: 'House',
      topics: ['Energy', 'Health'],
    },
  ],
}));

// Mock lobbying pipeline (called internally)
jest.mock('@/lib/intelligence/analyzers/lobbying-pipeline-analyzer', () => ({
  analyzeLobbyingPipeline: jest.fn().mockResolvedValue(null),
}));

// Mock senate lobbying (transitive dependency)
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: { fetchRecentFilings: jest.fn().mockResolvedValue([]) },
}));

jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: jest.fn(),
  getResolvedCommittees: jest.fn(),
}));

jest.mock('@/lib/intelligence/entity-resolution/lda-issue-policy-map', () => ({
  getLDAIssueLabel: jest.fn(),
  getPolicyAreasForLDAIssue: jest.fn(),
}));

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn().mockResolvedValue([]),
}));

import { analyzeBillIntelligence } from '@/lib/intelligence/analyzers/bill-intelligence-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const mockBill = {
  title: 'Medicare Improvement Act',
  policyArea: 'Health',
  sponsor: {
    representative: {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      party: 'Democrat',
    },
  },
  cosponsors: [
    {
      representative: { bioguideId: 'A000001', name: 'Cosponsor One', party: 'Democrat' },
      withdrawn: false,
    },
    {
      representative: { bioguideId: 'A000002', name: 'Cosponsor Two', party: 'Republican' },
      withdrawn: false,
    },
  ],
  committees: [
    { committeeId: 'HSEN', name: 'Energy and Commerce', chamber: 'House', activities: [] },
  ],
  votes: [],
  relatedBills: [],
  status: {
    current: 'introduced',
    lastAction: { date: '2025-01-15', description: 'Introduced' },
    timeline: [],
  },
  introducedDate: '2025-01-15',
  cboCostEstimates: [],
};

const mockBillWithVote = {
  ...mockBill,
  votes: [
    {
      voteId: 'v1',
      chamber: 'House' as const,
      date: '2025-03-01',
      question: 'On Passage',
      result: 'Passed' as const,
      votes: { yea: 230, nay: 195, present: 2, notVoting: 8 },
      breakdown: {
        democratic: { yea: 210, nay: 3, present: 0, notVoting: 2 },
        republican: { yea: 20, nay: 192, present: 2, notVoting: 6 },
        independent: { yea: 0, nay: 0, present: 0, notVoting: 0 },
      },
    },
  ],
};

const mockBillWithBipartisanVote = {
  ...mockBill,
  votes: [
    {
      voteId: 'v2',
      chamber: 'Senate' as const,
      date: '2025-03-01',
      question: 'On Passage',
      result: 'Passed' as const,
      votes: { yea: 78, nay: 22, present: 0, notVoting: 0 },
      breakdown: {
        democratic: { yea: 42, nay: 7, present: 0, notVoting: 0 },
        republican: { yea: 36, nay: 15, present: 0, notVoting: 0 },
        independent: { yea: 0, nay: 0, present: 0, notVoting: 0 },
      },
    },
  ],
};

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeBillIntelligence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockFetchBillFromCongress.mockResolvedValue(mockBill);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue([{ amount: 5000 }]);
    mockGetFinancialSummary.mockResolvedValue(null);
    mockGetEnhancedRepresentative.mockResolvedValue(null);
  });

  it('returns cached insight on cache hit', async () => {
    const cached = { billId: '119-hr-1', billTitle: 'Test' };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toEqual(cached);
    expect(mockFetchBillFromCongress).not.toHaveBeenCalled();
  });

  it('returns null when bill not found', async () => {
    mockFetchBillFromCongress.mockResolvedValue(null);

    const result = await analyzeBillIntelligence('119-hr-99999');
    expect(result).toBeNull();
  });

  it('returns null when bill has no policy area', async () => {
    mockFetchBillFromCongress.mockResolvedValue({ ...mockBill, policyArea: null });

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toBeNull();
  });

  it('returns null when no sectors map to policy area', async () => {
    const policyMap = jest.requireMock<{ getIndustrySectorsForPolicyArea: jest.Mock }>(
      '@/lib/connections/policy-area-map'
    );
    policyMap.getIndustrySectorsForPolicyArea.mockReturnValueOnce([]);

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toBeNull();
  });

  it('analyzes sponsor funding by sector', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorAnalysis).not.toBeNull();
    expect(result!.sponsorAnalysis!.bioguideId).toBe('P000197');
    expect(result!.sponsorAnalysis!.sectorDonationPercentage).toBeGreaterThanOrEqual(0);
  });

  it('analyzes cosponsor funding', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.cosponsorSummary.totalCosponsors).toBe(2);
    expect(result!.cosponsorSummary.analyzedCosponsors).toBeGreaterThanOrEqual(0);
  });

  it('includes InsightBase fields', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeBillIntelligence('119-hr-1');

    const setCalls = mockRedisSet.mock.calls;
    const insightCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === 'insight:bill_intelligence:119-hr-1'
    );
    expect(insightCall).toBeDefined();
    expect(insightCall![2]).toBe(7 * 24 * 60 * 60);
  });

  it('uses findCommitteeMapping for committee matching', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    const lobbyingMod = jest.requireMock<{ analyzeLobbyingPipeline: jest.Mock }>(
      '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer'
    );
    expect(lobbyingMod.analyzeLobbyingPipeline).toHaveBeenCalled();
  });

  // ── Story context tests ───────────────────────────────────────

  it('includes bill progress from bill status', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.billProgress).toBeDefined();
    expect(result!.billProgress!.status).toBe('introduced');
    expect(result!.billProgress!.daysSinceIntroduction).toBeGreaterThanOrEqual(0);
    expect(result!.billProgress!.passedCommittee).toBe(false);
  });

  it('detects bipartisan cosponsorship', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.bipartisanCosponsorship).toBe(true);
  });

  it('detects non-bipartisan cosponsorship', async () => {
    const unipartisanBill = {
      ...mockBill,
      cosponsors: [
        {
          representative: { bioguideId: 'A000001', name: 'One', party: 'Democrat' },
          withdrawn: false,
        },
        {
          representative: { bioguideId: 'A000002', name: 'Two', party: 'Democrat' },
          withdrawn: false,
        },
      ],
    };
    mockFetchBillFromCongress.mockResolvedValue(unipartisanBill);

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result!.bipartisanCosponsorship).toBe(false);
  });

  it('extracts vote outcome with party-line detection', async () => {
    mockFetchBillFromCongress.mockResolvedValue(mockBillWithVote);

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.voteOutcome).toBeDefined();
    expect(result!.voteOutcome!.chamber).toBe('House');
    expect(result!.voteOutcome!.result).toBe('Passed');
    expect(result!.voteOutcome!.yea).toBe(230);
    expect(result!.voteOutcome!.nay).toBe(195);
    expect(result!.voteOutcome!.partyLine).toBe(true);
    expect(result!.voteOutcome!.bipartisan).toBe(false);
  });

  it('detects bipartisan vote', async () => {
    mockFetchBillFromCongress.mockResolvedValue(mockBillWithBipartisanVote);

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.voteOutcome).toBeDefined();
    expect(result!.voteOutcome!.partyLine).toBe(false);
    expect(result!.voteOutcome!.bipartisan).toBe(true);
  });

  it('includes sponsor-committee connection when sponsor sits on bill committee', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      committees: [{ name: 'Energy and Commerce', role: 'Member' }],
    });

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorCommitteeConnection).toBeDefined();
    expect(result!.sponsorCommitteeConnection!.connected).toBe(true);
    expect(result!.sponsorCommitteeConnection!.committeeName).toBe('Energy and Commerce');
    expect(result!.sponsorCommitteeConnection!.sponsorRole).toBe('Member');
  });

  it('reports no sponsor-committee connection when sponsor not on committee', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      committees: [{ name: 'Judiciary', role: 'Member' }],
    });

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorCommitteeConnection).toBeDefined();
    expect(result!.sponsorCommitteeConnection!.connected).toBe(false);
  });

  it('includes sponsor funding context from financial summary', async () => {
    mockGetFinancialSummary.mockResolvedValue({ receipts: 1200000 });

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorFundingContext).toBeDefined();
    expect(result!.sponsorFundingContext!.totalRaised).toBe(1200000);
  });

  it('includes CBO fiscal impact when available', async () => {
    const billWithCBO = {
      ...mockBill,
      cboCostEstimates: [
        {
          title: 'CBO',
          description: 'Would increase deficit by $50B over 10 years',
          url: '',
          pubDate: '',
        },
      ],
    };
    mockFetchBillFromCongress.mockResolvedValue(billWithCBO);

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.fiscalImpact).toBe('Would increase deficit by $50B over 10 years');
  });

  it('includes top lobbying org names when available', async () => {
    const lobbyingMod = jest.requireMock<{ analyzeLobbyingPipeline: jest.Mock }>(
      '@/lib/intelligence/analyzers/lobbying-pipeline-analyzer'
    );
    lobbyingMod.analyzeLobbyingPipeline.mockResolvedValue({
      totalSpending: 2300000,
      organizationCount: 8,
      topOrganizations: [
        { name: 'American Road Builders', totalSpending: 900000 },
        { name: 'Construction Industry Council', totalSpending: 600000 },
      ],
    });

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.topLobbyingOrgs).toEqual([
      'American Road Builders',
      'Construction Industry Council',
    ]);
    expect(result!.relatedLobbyingSpending).toBe(2300000);
  });

  it('includes related bill count', async () => {
    const billWithRelated = {
      ...mockBill,
      relatedBills: [
        { number: 'S. 100', title: 'Senate version', relationship: 'identical' as const },
        { number: 'H.R. 200', title: 'Related', relationship: 'related' as const },
      ],
    };
    mockFetchBillFromCongress.mockResolvedValue(billWithRelated);

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.relatedBillCount).toBe(2);
  });

  // ── Graceful degradation ─────────────────────────────────────

  it('degrades gracefully when getFinancialSummary fails', async () => {
    mockGetFinancialSummary.mockRejectedValue(new Error('FEC API down'));

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorFundingContext).toBeUndefined();
    expect(result!.sponsorAnalysis).not.toBeNull();
  });

  it('degrades gracefully when getEnhancedRepresentative fails', async () => {
    mockGetEnhancedRepresentative.mockRejectedValue(new Error('Congress API down'));

    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.sponsorCommitteeConnection).toBeUndefined();
  });

  it('omits voteOutcome when bill has no votes', async () => {
    const result = await analyzeBillIntelligence('119-hr-1');

    expect(result).not.toBeNull();
    expect(result!.voteOutcome).toBeUndefined();
  });

  it('higher confidence when enrichment data is available', async () => {
    // First: baseline with no enrichment
    const baseline = await analyzeBillIntelligence('119-hr-1');

    // Reset mocks and add enrichment data
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockFetchBillFromCongress.mockResolvedValue(mockBillWithVote);
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');
    mockGetSampleContributions.mockResolvedValue([{ amount: 5000 }]);
    mockGetFinancialSummary.mockResolvedValue({ receipts: 1200000 });
    mockGetEnhancedRepresentative.mockResolvedValue({
      committees: [{ name: 'Energy and Commerce', role: 'Member' }],
    });

    const enriched = await analyzeBillIntelligence('119-hr-1');

    expect(baseline).not.toBeNull();
    expect(enriched).not.toBeNull();
    expect(enriched!.confidence).toBeGreaterThan(baseline!.confidence);
  });

  // ── Backward compatibility ───────────────────────────────────

  it('old cached insights without new fields still work', async () => {
    const oldCached = {
      billId: '119-hr-1',
      billTitle: 'Old Bill',
      policyArea: 'Health',
      affectedSectors: ['HEALTH'],
      sponsorAnalysis: null,
      cosponsorSummary: {
        totalCosponsors: 0,
        analyzedCosponsors: 0,
        avgSectorDonationPercentage: 0,
      },
      relatedLobbyingSpending: 0,
      relatedLobbyingOrgs: 0,
      narrative: 'Old narrative.',
      confidence: 0.5,
      dataAsOf: '2025-01-01',
      methodology: 'Old methodology.',
      disclaimer: 'Correlation disclaimer.',
      lastAnalyzedAt: '2025-01-01',
      source: 'statistical-fallback',
      // No new fields — backward compatible
    };
    mockRedisGet.mockResolvedValueOnce(oldCached);

    const result = await analyzeBillIntelligence('119-hr-1');
    expect(result).toEqual(oldCached);
    expect(result!.voteOutcome).toBeUndefined();
    expect(result!.billProgress).toBeUndefined();
  });
});

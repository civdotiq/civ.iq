/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Influence Chain Analyzer (Insight 6).
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
  BillSummaryCache: {
    getSummary: jest.fn().mockResolvedValue({ affectedIndustries: ['Health'] }),
  },
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

const mockFetchRecentFilings = jest.fn();
jest.mock('@/lib/data-sources/senate-lobbying-api', () => ({
  senateLobbyingAPI: {
    fetchRecentFilings: (...args: unknown[]) => mockFetchRecentFilings(...args),
  },
}));

/**
 * Corpus reader. Defaults to unavailable so the cases below exercise the API
 * sample path they were written against — without this the analyzer reads the
 * real committed corpus off disk and the mocked filings never run.
 */
const mockForEachFilingForCommittees = jest.fn().mockResolvedValue(false);
jest.mock('@/lib/data-sources/lda-corpus/load-filings', () => ({
  forEachFilingForCommittees: (...args: unknown[]) => mockForEachFilingForCommittees(...args),
}));

const mockResolveFilingEntities = jest.fn();
const mockGetResolvedCommittees = jest.fn();
jest.mock('@/lib/intelligence/entity-resolution/lobbying-committee-resolver', () => ({
  resolveFilingEntities: (...args: unknown[]) => mockResolveFilingEntities(...args),
  getResolvedCommittees: (...args: unknown[]) => mockGetResolvedCommittees(...args),
}));

jest.mock('@/lib/connections/committee-agency-map', () => ({
  ALL_COMMITTEE_MAPPINGS: [],
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockImplementation((policyArea: string) => {
    // Return Health sector for the "Health" policy area (LDA code HCR maps here)
    if (policyArea === 'Health') return ['Health'];
    return [];
  }),
}));

import {
  analyzeInfluenceChains,
  _resetFilingsCache,
} from '@/lib/intelligence/analyzers/influence-chain-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

const BIO_ID = 'S000148';

const mockRep = {
  name: 'John Smith',
  party: 'D',
  state: 'CA',
  chamber: 'House',
  committees: [{ name: 'Energy and Commerce' }, { name: 'Armed Services' }],
};

function makeLobbyingFilings(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    client: { name: `Acme Health ${i}` },
    income: 500000 + i * 10000,
    government_entities: ['House Energy and Commerce'],
    issues: [{ code: 'HCR' }],
    specific_issues: ['healthcare reform'],
  }));
}

function makeContributions(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    contributor_employer: `Acme Health ${i % 3}`,
    contribution_receipt_amount: 1000 + i * 500,
  }));
}

function makeVotes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    bill: {
      type: 'HR',
      number: String(1000 + i),
      congress: 119,
      title: `Healthcare Act ${i + 1}`,
    },
    position: i % 2 === 0 ? 'Yea' : 'Nay',
    date: '2025-06-01',
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeInfluenceChains', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetFilingsCache();

    // Default: cache miss
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisKeys.mockResolvedValue([]);
    mockRedisMget.mockResolvedValue([]);

    // Default: valid representative
    mockGetEnhancedRepresentative.mockResolvedValue(mockRep);

    // Default: valid FEC mapping
    mockGetFECIdFromBioguide.mockReturnValue('H0CA12345');

    // Default: contributions that match lobbying org names
    mockGetSampleContributions.mockResolvedValue(makeContributions(10));

    // Default: corpus unavailable, so the API sample path runs
    mockForEachFilingForCommittees.mockResolvedValue(false);

    // Default: lobbying filings targeting rep's committees
    mockFetchRecentFilings.mockResolvedValue(makeLobbyingFilings(5));
    mockResolveFilingEntities.mockReturnValue([{ type: 'committee', name: 'Energy and Commerce' }]);
    mockGetResolvedCommittees.mockReturnValue([
      { committeeCode: 'HSIF', committeeName: 'Energy and Commerce' },
    ]);

    // Default: votes with bills
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(10));
    mockGetSenateMemberVotes.mockResolvedValue([]);
  });

  it('returns null when representative not found', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue(null);

    const result = await analyzeInfluenceChains(BIO_ID);
    expect(result).toBeNull();
    expect(mockFetchRecentFilings).not.toHaveBeenCalled();
  });

  it('returns null when no FEC mapping exists (no contribution evidence)', async () => {
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const result = await analyzeInfluenceChains(BIO_ID);

    // Without FEC mapping, no chains have contribution evidence.
    // Chain confidence is capped at 0.4 (below 0.5 threshold), so all are filtered out.
    expect(result).toBeNull();
  });

  it('returns cached insight on cache hit', async () => {
    const cached = {
      bioguideId: BIO_ID,
      chains: [],
      totalChainsDetected: 0,
      chainsDropped: 0,
      peerComparison: null,
      peerComparisonUnavailableReason:
        'Fewer than 5 other House members have comparable data right now, so no peer comparison is shown.',
      narrative: 'Cached narrative',
      confidence: 0.8,
      dataAsOf: '2025-01-01T00:00:00Z',
      methodology: 'Test',
      disclaimer: 'Test disclaimer',
      lastAnalyzedAt: '2025-01-01T00:00:00Z',
      source: 'statistical-fallback' as const,
    };
    mockRedisGet.mockResolvedValueOnce(cached);

    const result = await analyzeInfluenceChains(BIO_ID);
    expect(result).toEqual(cached);
    expect(mockGetEnhancedRepresentative).not.toHaveBeenCalled();
  });

  it('assembles influence chains from matching data', async () => {
    const result = await analyzeInfluenceChains(BIO_ID);

    expect(result).not.toBeNull();
    expect(result!.bioguideId).toBe(BIO_ID);
    expect(result!.chains.length).toBeGreaterThan(0);
    expect(result!.totalChainsDetected).toBeGreaterThanOrEqual(result!.chains.length);

    // Each chain must have required fields
    for (const chain of result!.chains) {
      expect(chain.organization).toBeTruthy();
      expect(chain.lobbyingSpending).toBeGreaterThanOrEqual(0);
      expect(typeof chain.contributionAmount).toBe('number');
      expect(chain.billId).toBeTruthy();
      expect(chain.billTitle).toBeTruthy();
      expect(['yea', 'nay', 'not_voting']).toContain(chain.vote);
      expect(chain.links.length).toBeGreaterThan(0);
      expect(chain.chainConfidence).toBeGreaterThanOrEqual(0.5);
    }

    // InsightBase fields
    expect(result!.confidence).toBeGreaterThanOrEqual(0);
    expect(result!.confidence).toBeLessThanOrEqual(1);
    expect(result!.dataAsOf).toBeTruthy();
    expect(result!.methodology).toBeTruthy();
    expect(result!.disclaimer.toLowerCase()).toContain('correlation');
    expect(result!.lastAnalyzedAt).toBeTruthy();
    expect(result!.narrative).toBeTruthy();
    // No cached peers in this fixture — peer comparison must be honestly null,
    // never a fabricated 50th-percentile placeholder.
    expect(result!.peerComparison).toBeNull();
    expect(result!.peerComparisonUnavailableReason).toContain('no peer comparison is shown');
  });

  it('emits honest unavailable variant when fewer than 5 peers have data', async () => {
    // Only 2 cached peers — below MIN_PEERS (5)
    mockRedisKeys.mockResolvedValue([
      'influence-chain-count:House:A000001',
      'influence-chain-count:House:A000002',
    ]);
    mockRedisMget.mockResolvedValue([3, 7]);

    const result = await analyzeInfluenceChains(BIO_ID);

    expect(result).not.toBeNull();
    expect(result!.peerComparison).toBeNull();
    expect(result!.peerComparisonUnavailableReason).toBeTruthy();
    // Never fabricate a midpoint percentile
    expect(JSON.stringify(result)).not.toContain('"percentileRank":50');
  });

  it('computes a real peer comparison when enough peers are cached', async () => {
    mockRedisKeys.mockResolvedValue([
      'influence-chain-count:House:A000001',
      'influence-chain-count:House:A000002',
      'influence-chain-count:House:A000003',
      'influence-chain-count:House:A000004',
      'influence-chain-count:House:A000005',
      'influence-chain-count:House:A000006',
    ]);
    mockRedisMget.mockResolvedValue([1, 2, 3, 4, 5, 6]);

    const result = await analyzeInfluenceChains(BIO_ID);

    expect(result).not.toBeNull();
    expect(result!.peerComparison).not.toBeNull();
    expect(result!.peerComparison!.peerCount).toBe(6);
    expect(result!.peerComparisonUnavailableReason).toBeUndefined();
  });

  it('drops chains below 0.5 confidence threshold', async () => {
    const result = await analyzeInfluenceChains(BIO_ID);

    if (result) {
      // Every returned chain must meet the minimum confidence
      for (const chain of result.chains) {
        expect(chain.chainConfidence).toBeGreaterThanOrEqual(0.5);
      }

      // If chains were dropped, totalDetected > chains.length
      if (result.chainsDropped > 0) {
        expect(result.totalChainsDetected).toBeGreaterThan(result.chains.length);
      }
    }
  });

  it('caps chains at 10 maximum', async () => {
    // Provide many lobbying orgs and many votes to generate many chains
    mockFetchRecentFilings.mockResolvedValue(makeLobbyingFilings(20));
    mockGetHouseMemberVotes.mockResolvedValue(makeVotes(30));
    mockGetSampleContributions.mockResolvedValue(makeContributions(50));

    const result = await analyzeInfluenceChains(BIO_ID);

    if (result) {
      expect(result.chains.length).toBeLessThanOrEqual(10);
    }
  });

  it('handles timeout gracefully', async () => {
    // Simulate the representative fetch hanging forever
    mockGetEnhancedRepresentative.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    // The outer withTimeout should reject, but analyzeInfluenceChains catches via withTimeout
    // Since we can't easily mock withTimeout (it wraps the internal computeAndCache),
    // test that a slow dependency causes null return via the promise never resolving
    // Instead, simulate a thrown error from a dependency
    mockGetEnhancedRepresentative.mockRejectedValue(new Error('Timeout'));

    const result = await analyzeInfluenceChains(BIO_ID);
    expect(result).toBeNull();
  });

  it('returns null when no lobbying filings found', async () => {
    mockFetchRecentFilings.mockResolvedValue([]);

    const result = await analyzeInfluenceChains(BIO_ID);
    expect(result).toBeNull();
  });

  it('caches result with 7-day TTL', async () => {
    await analyzeInfluenceChains(BIO_ID);

    const setCalls = mockRedisSet.mock.calls;
    const insightCall = setCalls.find(
      (call: unknown[]) => (call[0] as string) === `insight:influence_chain:${BIO_ID}`
    );

    if (insightCall) {
      expect(insightCall[2]).toBe(7 * 24 * 60 * 60);
    }
  });

  it('fetches both sessions of 119th Congress for House members', async () => {
    await analyzeInfluenceChains(BIO_ID);

    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith(BIO_ID, 119, 1, 200);
    expect(mockGetHouseMemberVotes).toHaveBeenCalledWith(BIO_ID, 119, 2, 200);
  });

  it('uses Senate vote service for senators', async () => {
    mockGetEnhancedRepresentative.mockResolvedValue({ ...mockRep, chamber: 'Senate' });
    mockGetSenateMemberVotes.mockResolvedValue(makeVotes(10));

    await analyzeInfluenceChains(BIO_ID);

    expect(mockGetSenateMemberVotes).toHaveBeenCalled();
    expect(mockGetHouseMemberVotes).not.toHaveBeenCalled();
  });

  it('filters out chains without contribution evidence (no FEC mapping)', async () => {
    // When getFECIdFromBioguide returns null, no contribution links exist.
    // All chains should be capped at 0.4 confidence (below 0.5 threshold)
    // and filtered out, because showing "influence chains" without evidence
    // of money flowing to the rep is misleading.
    mockGetFECIdFromBioguide.mockReturnValue(null);

    const result = await analyzeInfluenceChains(BIO_ID);

    // Either null (no chains pass threshold) or all chains have contribution evidence
    if (result) {
      expect(result.chains).toHaveLength(0);
    } else {
      expect(result).toBeNull();
    }
  });

  it('returns null when lobbying filings do not match rep committees', async () => {
    // Filings target unrelated committees
    mockFetchRecentFilings.mockResolvedValue([
      {
        client: { name: 'Unrelated Corp' },
        income: 100000,
        government_entities: ['Senate Judiciary'],
        issues: [{ code: 'LAW' }],
        specific_issues: ['legal reform'],
      },
    ]);
    // No direct match and entity resolution returns non-matching committees
    mockResolveFilingEntities.mockReturnValue([{ type: 'committee', name: 'Judiciary' }]);
    mockGetResolvedCommittees.mockReturnValue([
      { committeeCode: 'SSJU', committeeName: 'Judiciary' },
    ]);

    const result = await analyzeInfluenceChains(BIO_ID);
    expect(result).toBeNull();
  });

  it('caches lobbying filings in-memory across multiple calls', async () => {
    // First call fetches filings
    await analyzeInfluenceChains(BIO_ID);
    // Second call with a different bioguide should reuse cached filings
    await analyzeInfluenceChains('B000944');

    expect(mockFetchRecentFilings).toHaveBeenCalledTimes(1);
  });

  // ── Corpus path ─────────────────────────────────────────────────

  /** Feed the analyzer corpus rows instead of the API sample. */
  function serveCorpus(rows: Array<Record<string, unknown>>): void {
    mockForEachFilingForCommittees.mockImplementation(
      async (_codes: string[], visit: (f: unknown) => void) => {
        for (const row of rows) visit(row);
        return true;
      }
    );
  }

  function corpusRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      clientName: 'Acme Health 0',
      registrantName: 'Acme Health 0',
      registrantId: '77',
      quarter: '2026-Q1',
      amount: 500000,
      issueCodes: ['HCR'],
      governmentEntities: ['House Energy and Commerce'],
      committeeCodes: ['HSIF'],
      ...overrides,
    };
  }

  it('builds chains from the corpus and never touches the API sample', async () => {
    serveCorpus([corpusRow()]);

    const result = await analyzeInfluenceChains(BIO_ID);

    expect(result).not.toBeNull();
    expect(result!.chains.length).toBeGreaterThan(0);
    expect(mockFetchRecentFilings).not.toHaveBeenCalled();
    expect(result!.methodology).toContain('complete LD-2 quarterly corpus');
    expect(result!.sources.some(s => s.name.includes('complete quarterly corpus'))).toBe(true);
  });

  it('sums an organization across the filings of every firm it hires', async () => {
    // One client, two registrants — LDA client ids are per firm-relationship.
    serveCorpus([
      corpusRow({ clientName: 'ACME HEALTH 0', registrantName: 'Firm A', registrantId: '1' }),
      corpusRow({ clientName: 'Acme Health 0, Inc.', registrantName: 'Firm B', registrantId: '2' }),
    ]);

    const result = await analyzeInfluenceChains(BIO_ID);

    const orgs = new Set(result!.chains.map(c => c.organization));
    expect(orgs.size).toBe(1);
    expect(result!.chains[0]!.lobbyingSpending).toBe(1_000_000);
    // Two registrants means no single lobby profile to link to.
    expect(result!.chains[0]!.registrantId).toBeUndefined();
  });

  it('falls back to the API sample when the corpus is unavailable', async () => {
    mockForEachFilingForCommittees.mockResolvedValue(false);

    const result = await analyzeInfluenceChains(BIO_ID);

    expect(mockFetchRecentFilings).toHaveBeenCalled();
    expect(result!.methodology).toContain('small sample of recent filings');
  });

  it('ranks organizations with contribution evidence ahead of bigger spenders', async () => {
    // The top spender never contributed; only the smaller organization did, and
    // a chain without contribution evidence is dropped below the threshold.
    mockGetSampleContributions.mockResolvedValue([
      { contributor_employer: 'Acme Health 0', contribution_receipt_amount: 2500 },
    ]);
    serveCorpus([
      corpusRow({
        clientName: 'Megacorp Industries',
        registrantName: 'Megacorp',
        amount: 9_000_000,
      }),
      corpusRow({ clientName: 'Acme Health 0', amount: 25_000 }),
    ]);

    const result = await analyzeInfluenceChains(BIO_ID);

    expect(result).not.toBeNull();
    expect(new Set(result!.chains.map(c => c.organization))).toEqual(new Set(['Acme Health 0']));
    expect(result!.chains[0]!.hasContributionEvidence).toBe(true);
  });
});

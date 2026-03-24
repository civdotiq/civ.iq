/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for Influence Graph Analyzer (Phase 4 — Full 6-Node Graph).
 */

// ── Mocks ─────────────────────────────────────────────────────────

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisMget = jest.fn();
const mockRedisKeys = jest.fn();

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
    mget: mockRedisMget,
    keys: mockRedisKeys,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/ai/provider', () => ({
  generateAIText: jest.fn().mockResolvedValue('AI narrative about influence graph.'),
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

jest.mock('@/lib/analytics/insight-tracker', () => ({
  trackInsightRun: jest.fn(),
  ANALYZER_NAMES: ['influence-graph'] as const,
}));

jest.mock('@/lib/connections/policy-area-map', () => ({
  getIndustrySectorsForPolicyArea: jest.fn().mockReturnValue([]),
}));

// Mock the influence chain analyzer
const mockAnalyzeInfluenceChains = jest.fn();
jest.mock('@/lib/intelligence/analyzers/influence-chain-analyzer', () => ({
  analyzeInfluenceChains: (...args: unknown[]) => mockAnalyzeInfluenceChains(...args),
}));

// Mock federal register service
const mockFindRegulationsForBill = jest.fn();
jest.mock('@/lib/data-sources/federal-register-service', () => ({
  findRegulationsForBill: (...args: unknown[]) => mockFindRegulationsForBill(...args),
}));

// Mock CourtListener service
const mockSearchAgencyCases = jest.fn();
jest.mock('@/lib/data-sources/courtlistener-service', () => ({
  courtListenerService: {
    searchAgencyCases: (...args: unknown[]) => mockSearchAgencyCases(...args),
  },
}));

// Mock FRED economic service
const mockGetStateIndicators = jest.fn();
jest.mock('@/lib/data-sources/fred-economic-service', () => ({
  fredEconomicService: {
    getStateIndicators: (...args: unknown[]) => mockGetStateIndicators(...args),
  },
}));

// Mock embeddings (used by getBillSectors)
jest.mock('@/lib/intelligence/embeddings', () => ({
  classifyBillSectors: jest.fn().mockResolvedValue([]),
  classifyBillSectorsZeroShot: jest.fn().mockResolvedValue([]),
}));

import { analyzeInfluenceGraph } from '@/lib/intelligence/analyzers/influence-graph-analyzer';

// ── Test Data ─────────────────────────────────────────────────────

function makeChainInsight(chainCount: number) {
  return {
    bioguideId: 'A000001',
    chains: Array.from({ length: chainCount }, (_, i) => ({
      organization: `Lobbying Org ${i}`,
      lobbyingSpending: 100000 + i * 50000,
      contributionAmount: 5000 + i * 1000,
      billId: `119-hr-${1000 + i}`,
      billTitle: `Environmental Standards Act ${i}`,
      vote: 'yea' as const,
      textSimilarity: null,
      links: [
        {
          type: 'lobbying' as const,
          label: `Lobbying Org ${i} spent $${(100000 + i * 50000).toLocaleString()}`,
          confidence: 0.9,
          data: {},
        },
        {
          type: 'contribution' as const,
          label: `Employees donated $${(5000 + i * 1000).toLocaleString()}`,
          confidence: 0.8,
          data: {},
        },
        {
          type: 'committee' as const,
          label: 'Member of Energy and Commerce',
          confidence: 1.0,
          data: { committeeName: 'Energy and Commerce', state: 'CA' },
        },
        {
          type: 'bill_match' as const,
          label: 'Bill matches lobbied sectors',
          confidence: 0.7,
          data: {},
        },
        {
          type: 'vote' as const,
          label: 'Voted Yea',
          confidence: 1.0,
          data: {},
        },
      ],
      chainConfidence: 0.7,
      hasContributionEvidence: true,
    })),
    totalChainsDetected: chainCount + 2,
    chainsDropped: 2,
    peerComparison: {
      value: chainCount,
      peerAverage: 5,
      peerCount: 10,
      peerGroupLabel: 'House members',
      percentileRank: 60,
    },
    narrative: 'Test narrative.',
    confidence: 0.75,
    dataAsOf: '2025-03-01T00:00:00Z',
    methodology: 'Test methodology',
    disclaimer: 'Test disclaimer',
    lastAnalyzedAt: '2025-03-15T00:00:00Z',
    source: 'statistical-fallback' as const,
  };
}

function makeRegulationNodes(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    docketId: `epa-2025-${String(i).padStart(5, '0')}`,
    agency: 'Environmental Protection Agency',
    agencySlug: 'environmental-protection-agency',
    title: `Clean Air Rule ${i}`,
    type: 'final_rule' as const,
    status: 'final' as const,
    publicationDate: `2025-0${(i % 9) + 1}-15`,
    rin: `2060-A${String(i).padStart(3, '0')}`,
    commentCount: 100 + i * 50,
    linkMethod: 'committee_agency' as const,
    linkConfidence: 0.8,
  }));
}

// ── Tests ─────────────────────────────────────────────────────────

describe('analyzeInfluenceGraph', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue(undefined);
    mockRedisMget.mockResolvedValue([]);
    mockRedisKeys.mockResolvedValue([]);
    mockFindRegulationsForBill.mockResolvedValue([]);
    mockSearchAgencyCases.mockResolvedValue([]);
    mockGetStateIndicators.mockResolvedValue([]);
  });

  it('returns cached insight on cache hit', async () => {
    const cachedInsight = {
      bioguideId: 'A000001',
      chains: [],
      confidence: 0.8,
    };
    mockRedisGet.mockResolvedValueOnce(cachedInsight);

    const result = await analyzeInfluenceGraph('A000001');
    expect(result).toEqual(cachedInsight);
    expect(mockAnalyzeInfluenceChains).not.toHaveBeenCalled();
  });

  it('returns null when no influence chains exist', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(null);

    const result = await analyzeInfluenceGraph('A000001');
    expect(result).toBeNull();
  });

  it('returns null when influence chains are empty', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce({
      ...makeChainInsight(0),
      chains: [],
    });

    const result = await analyzeInfluenceGraph('A000001');
    expect(result).toBeNull();
  });

  it('builds graph chains from existing influence chains', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(3));
    mockFindRegulationsForBill.mockResolvedValue(makeRegulationNodes(1));

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    expect(result?.bioguideId).toBe('A000001');
    expect(result?.chains.length).toBeGreaterThan(0);
    expect(result?.graphStats).toBeDefined();
  });

  it('includes regulation nodes when found', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(2));
    mockFindRegulationsForBill.mockResolvedValue(makeRegulationNodes(1));

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    const chainsWithReg = result?.chains.filter(c => c.regulationNode !== null) ?? [];
    expect(chainsWithReg.length).toBeGreaterThan(0);
    expect(result?.graphStats.regulationLinks).toBeGreaterThan(0);
  });

  it('includes court cases when regulation node exists', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(1));
    mockFindRegulationsForBill.mockResolvedValue(makeRegulationNodes(1));
    mockSearchAgencyCases.mockResolvedValue([
      {
        docketId: 1,
        caseName: 'EPA v. Polluter Inc',
        court: 'D.C. Circuit',
        dateFiled: '2025-01-15',
        dateTerminated: null,
        parties: ['EPA', 'Polluter Inc'],
        natureOfSuit: 'Environmental',
      },
    ]);

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    const chainsWithCourt = result?.chains.filter(c => c.courtCases.length > 0) ?? [];
    expect(chainsWithCourt.length).toBeGreaterThan(0);
    expect(chainsWithCourt[0]?.courtCases[0]?.caseName).toBe('EPA v. Polluter Inc');
  });

  it('includes outcome signals from FRED when state available', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(1));
    mockGetStateIndicators.mockResolvedValue([
      {
        seriesId: 'CAUR',
        name: 'California Unemployment Rate',
        category: 'employment',
        latestValue: 4.5,
        latestDate: '2025-02-01',
        previousValue: 4.8,
        previousDate: '2025-01-01',
        changePercent: -6.3,
      },
    ]);

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    const chainsWithOutcome = result?.chains.filter(c => c.outcomeSignals.length > 0) ?? [];
    expect(chainsWithOutcome.length).toBeGreaterThan(0);
  });

  it('computes graph statistics correctly', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(3));
    mockFindRegulationsForBill.mockResolvedValue(makeRegulationNodes(1));

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    expect(result?.graphStats.nodesCount).toBeGreaterThan(0);
    expect(result?.graphStats.edgesCount).toBeGreaterThan(0);
    expect(result?.graphStats.avgChainLength).toBeGreaterThan(0);
  });

  it('includes InsightBase metadata', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(2));

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    expect(result?.dataAsOf).toBeTruthy();
    expect(result?.lastAnalyzedAt).toBeTruthy();
    expect(result?.methodology).toContain('Influence graph');
    expect(result?.disclaimer).toContain('Correlation');
    expect(result?.source).toMatch(/^(ai-generated|statistical-fallback)$/);
  });

  it('caches result on success', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(2));

    await analyzeInfluenceGraph('A000001');

    expect(mockRedisSet).toHaveBeenCalled();
  });

  it('handles regulation search failure gracefully', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(3));
    mockFindRegulationsForBill.mockRejectedValue(new Error('FR API down'));

    const result = await analyzeInfluenceGraph('A000001');

    // Should still produce a result, just without regulation nodes
    expect(result).not.toBeNull();
    expect(result?.chains.every(c => c.regulationNode === null)).toBe(true);
  });

  it('handles court search failure gracefully', async () => {
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(makeChainInsight(2));
    mockFindRegulationsForBill.mockResolvedValue(makeRegulationNodes(1));
    mockSearchAgencyCases.mockRejectedValue(new Error('CourtListener down'));

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    // Should have regulation but no court cases
    expect(result?.chains.every(c => c.courtCases.length === 0)).toBe(true);
  });

  it('preserves backward compatibility — original chain data intact', async () => {
    const originalInsight = makeChainInsight(2);
    mockAnalyzeInfluenceChains.mockResolvedValueOnce(originalInsight);

    const result = await analyzeInfluenceGraph('A000001');

    expect(result).not.toBeNull();
    for (const chain of result?.chains ?? []) {
      // All original chain fields should still be present
      expect(chain.organization).toBeDefined();
      expect(chain.lobbyingSpending).toBeGreaterThan(0);
      expect(chain.billId).toBeDefined();
      expect(chain.vote).toBeDefined();
      expect(chain.links.length).toBeGreaterThanOrEqual(5);
      expect(chain.chainConfidence).toBeGreaterThan(0);
      // New fields should also be present
      expect(chain).toHaveProperty('regulationNode');
      expect(chain).toHaveProperty('enforcementActions');
      expect(chain).toHaveProperty('courtCases');
      expect(chain).toHaveProperty('outcomeSignals');
    }
  });
});

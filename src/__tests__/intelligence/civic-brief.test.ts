/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { detectPatterns } from '@/lib/intelligence/analyzers/civic-brief-patterns';
import type { PatternInput } from '@/lib/intelligence/analyzers/civic-brief-patterns';
import type {
  BriefIdentity,
  BriefFunding,
  BriefVoting,
  BriefOversight,
  BriefPattern,
} from '@/lib/intelligence/types';

// ── Test Fixtures ────────────────────────────────────────────────────

function makeIdentity(overrides: Partial<BriefIdentity> = {}): BriefIdentity {
  return {
    name: 'Jane Doe',
    party: 'D',
    state: 'CA',
    district: '12',
    chamber: 'House',
    termStart: '2023',
    committees: [
      { name: 'Committee on Financial Services', role: 'Member' },
      { name: 'Committee on Science, Space, and Technology', role: 'Member' },
    ],
    ...overrides,
  };
}

function makeFunding(overrides: Partial<BriefFunding> = {}): BriefFunding {
  return {
    totalRaised: 2_500_000,
    totalSpent: 1_800_000,
    cashOnHand: 700_000,
    inStatePct: 45,
    topSectors: [
      {
        sector: 'Finance/Insurance/Real Estate',
        amount: 250_000,
        pct: 35,
        overlapsCommittee: true,
      },
      { sector: 'Health', amount: 120_000, pct: 17, overlapsCommittee: false },
      { sector: 'Lawyers & Lobbyists', amount: 80_000, pct: 11, overlapsCommittee: false },
      { sector: 'Communications/Electronics', amount: 60_000, pct: 8, overlapsCommittee: true },
      { sector: 'Labor', amount: 50_000, pct: 7, overlapsCommittee: false },
    ],
    contributionsSampled: 200,
    cycle: 2026,
    ...overrides,
  };
}

function makeVoting(overrides: Partial<BriefVoting> = {}): BriefVoting {
  return {
    totalVotes: 150,
    partyAlignmentPct: 85,
    missedVotePct: 3,
    billsSponsored: 8,
    billsCosponsored: 45,
    ...overrides,
  };
}

function makeOversight(overrides: Partial<BriefOversight> = {}): BriefOversight {
  return {
    jurisdictionOverlapScore: 0.42,
    lobbyingAlignmentScore: 0.38,
    topLobbyingMatches: [
      {
        filing: 'American Bankers Association',
        bill: 'Financial Innovation Act',
        similarity: 0.62,
      },
      { filing: 'Tech Industry Council', bill: 'AI Safety Standards Act', similarity: 0.55 },
    ],
    ...overrides,
  };
}

function makePatternInput(overrides: Partial<PatternInput> = {}): PatternInput {
  return {
    identity: makeIdentity(),
    funding: makeFunding(),
    voting: makeVoting(),
    oversight: makeOversight(),
    peerPartyAlignmentPct: 92,
    peerPartyAlignmentStd: 4,
    peerInStatePctMean: 55,
    peerInStatePctStd: 8,
    bioguideId: 'J000299',
    fecId: 'H8LA04011',
    ...overrides,
  };
}

// ── Pattern Detection Tests ──────────────────────────────────────────

describe('civic-brief-patterns', () => {
  describe('detectPatterns', () => {
    it('returns at most 5 patterns sorted by significance', () => {
      const input = makePatternInput();
      const patterns = detectPatterns(input);
      expect(patterns.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < patterns.length; i++) {
        expect(patterns[i]!.significance).toBeLessThanOrEqual(patterns[i - 1]!.significance);
      }
    });

    it('returns no patterns with insufficient data', () => {
      const input = makePatternInput({
        funding: makeFunding({
          totalRaised: null,
          topSectors: [],
          contributionsSampled: 0,
          inStatePct: null,
        }),
        voting: makeVoting({
          totalVotes: 0,
          partyAlignmentPct: null,
          billsSponsored: 0,
          billsCosponsored: 0,
        }),
        oversight: makeOversight({
          jurisdictionOverlapScore: null,
          lobbyingAlignmentScore: null,
          topLobbyingMatches: [],
        }),
        peerPartyAlignmentPct: null,
        peerPartyAlignmentStd: null,
        peerInStatePctMean: null,
        peerInStatePctStd: null,
      });
      const patterns = detectPatterns(input);
      expect(patterns.length).toBe(0);
    });

    it('all patterns have required fields', () => {
      const input = makePatternInput();
      const patterns = detectPatterns(input);

      for (const pattern of patterns) {
        expect(pattern.type).toBeTruthy();
        expect(pattern.headline).toBeTruthy();
        expect(pattern.detail).toBeTruthy();
        expect(typeof pattern.significance).toBe('number');
        expect(pattern.significance).toBeGreaterThanOrEqual(1.5);
        expect(pattern.dataPoints).toBeDefined();
      }
    });
  });

  describe('funding-jurisdiction-overlap', () => {
    it('detects significant overlap', () => {
      const input = makePatternInput({
        funding: makeFunding({
          topSectors: [
            {
              sector: 'Finance/Insurance/Real Estate',
              amount: 400_000,
              pct: 55,
              overlapsCommittee: true,
            },
            { sector: 'Health', amount: 100_000, pct: 14, overlapsCommittee: false },
          ],
        }),
      });
      const patterns = detectPatterns(input);
      const overlap = patterns.find(p => p.type === 'funding-jurisdiction-overlap');
      expect(overlap).toBeDefined();
      expect(overlap!.significance).toBeGreaterThanOrEqual(1.5);
    });

    it('does not fire with low overlap', () => {
      const input = makePatternInput({
        funding: makeFunding({
          topSectors: [
            { sector: 'Health', amount: 200_000, pct: 28, overlapsCommittee: false },
            { sector: 'Labor', amount: 100_000, pct: 14, overlapsCommittee: false },
          ],
        }),
      });
      const patterns = detectPatterns(input);
      const overlap = patterns.find(p => p.type === 'funding-jurisdiction-overlap');
      expect(overlap).toBeUndefined();
    });
  });

  describe('voting-party-divergence', () => {
    it('detects low party alignment relative to peers', () => {
      const input = makePatternInput({
        voting: makeVoting({ partyAlignmentPct: 78 }),
        peerPartyAlignmentPct: 92,
        peerPartyAlignmentStd: 4,
      });
      const patterns = detectPatterns(input);
      const divergence = patterns.find(p => p.type === 'voting-party-divergence');
      expect(divergence).toBeDefined();
      expect(divergence!.dataPoints['differencePct']).toBe(14);
    });

    it('does not fire with average alignment', () => {
      const input = makePatternInput({
        voting: makeVoting({ partyAlignmentPct: 91 }),
        peerPartyAlignmentPct: 92,
        peerPartyAlignmentStd: 4,
      });
      const patterns = detectPatterns(input);
      const divergence = patterns.find(p => p.type === 'voting-party-divergence');
      expect(divergence).toBeUndefined();
    });
  });

  describe('donor-concentration', () => {
    it('detects high single-sector concentration', () => {
      const input = makePatternInput({
        funding: makeFunding({
          topSectors: [
            { sector: 'Defense', amount: 500_000, pct: 65, overlapsCommittee: false },
            { sector: 'Health', amount: 50_000, pct: 7, overlapsCommittee: false },
          ],
        }),
      });
      const patterns = detectPatterns(input);
      const concentration = patterns.find(p => p.type === 'donor-concentration');
      expect(concentration).toBeDefined();
      expect(concentration!.dataPoints['topSectorPct']).toBe(65);
    });
  });

  describe('in-state-funding-ratio', () => {
    it('detects unusually low in-state funding', () => {
      const input = makePatternInput({
        funding: makeFunding({ inStatePct: 25 }),
        peerInStatePctMean: 55,
        peerInStatePctStd: 8,
      });
      const patterns = detectPatterns(input);
      const inState = patterns.find(p => p.type === 'in-state-funding-ratio');
      expect(inState).toBeDefined();
    });

    it('does not fire with average in-state funding', () => {
      const input = makePatternInput({
        funding: makeFunding({ inStatePct: 52 }),
        peerInStatePctMean: 55,
        peerInStatePctStd: 8,
      });
      const patterns = detectPatterns(input);
      const inState = patterns.find(p => p.type === 'in-state-funding-ratio');
      expect(inState).toBeUndefined();
    });
  });

  describe('lastName handling', () => {
    it('uses second-to-last name when last part is a suffix', () => {
      const input = makePatternInput({
        identity: makeIdentity({ name: 'Robert F. Kennedy Jr.' }),
        funding: makeFunding({
          topSectors: [
            { sector: 'Defense', amount: 500_000, pct: 65, overlapsCommittee: false },
            { sector: 'Health', amount: 50_000, pct: 7, overlapsCommittee: false },
          ],
        }),
      });
      const patterns = detectPatterns(input);
      const concentration = patterns.find(p => p.type === 'donor-concentration');
      expect(concentration).toBeDefined();
      expect(concentration!.headline).toContain('Kennedy');
      expect(concentration!.headline).not.toContain('Jr.');
    });
  });

  describe('committee-power-position', () => {
    it('detects chair/ranking positions', () => {
      const input = makePatternInput({
        identity: makeIdentity({
          committees: [
            { name: 'Committee on Financial Services', role: 'Chair' },
            { name: 'Committee on Science', role: 'Member' },
          ],
        }),
      });
      const patterns = detectPatterns(input);
      const power = patterns.find(p => p.type === 'committee-power-position');
      expect(power).toBeDefined();
      expect(power!.dataPoints['leadershipPositions']).toBe(1);
    });

    it('does not fire for regular members', () => {
      const input = makePatternInput({
        identity: makeIdentity({
          committees: [
            { name: 'Committee on Financial Services', role: 'Member' },
            { name: 'Committee on Science', role: 'Member' },
          ],
        }),
      });
      const patterns = detectPatterns(input);
      const power = patterns.find(p => p.type === 'committee-power-position');
      expect(power).toBeUndefined();
    });
  });

  describe('lobbying-legislation-alignment', () => {
    it('detects high lobbying alignment', () => {
      const input = makePatternInput({
        oversight: makeOversight({
          lobbyingAlignmentScore: 0.55,
          topLobbyingMatches: [{ filing: 'Corp A', bill: 'Bill 1', similarity: 0.7 }],
        }),
      });
      const patterns = detectPatterns(input);
      const lobbying = patterns.find(p => p.type === 'lobbying-legislation-alignment');
      expect(lobbying).toBeDefined();
    });

    it('does not fire with low alignment', () => {
      const input = makePatternInput({
        oversight: makeOversight({
          lobbyingAlignmentScore: 0.2,
          topLobbyingMatches: [{ filing: 'Corp A', bill: 'Bill 1', similarity: 0.3 }],
        }),
      });
      const patterns = detectPatterns(input);
      const lobbying = patterns.find(p => p.type === 'lobbying-legislation-alignment');
      expect(lobbying).toBeUndefined();
    });
  });
});

// ── Type Tests ───────────────────────────────────────────────────────

describe('CivicBriefInsight types', () => {
  it('BriefPattern has all required fields', () => {
    const pattern: BriefPattern = {
      type: 'funding-jurisdiction-overlap',
      headline: 'Test headline',
      detail: 'Test detail with numbers',
      dataPoints: { pct: 42, sector: 'Health' },
      significance: 2.0,
    };
    expect(pattern.type).toBe('funding-jurisdiction-overlap');
    expect(pattern.significance).toBe(2.0);
  });
});

// ── Assembler Integration Tests (mocked) ─────────────────────────────

describe('civic-brief-assembler', () => {
  // Mock all external dependencies
  jest.mock('@/features/representatives/services/congress.service', () => ({
    getEnhancedRepresentative: jest.fn(),
  }));

  jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
    getFECIdFromBioguide: jest.fn(() => 'H0CA12345'),
  }));

  jest.mock('@/lib/fec/fec-api-service', () => ({
    fecApiService: {
      getFinancialSummary: jest.fn(),
      getSampleContributions: jest.fn(),
    },
  }));

  jest.mock('@/features/representatives/services/batch-voting-service', () => ({
    batchVotingService: {
      getHouseMemberVotes: jest.fn(() => Promise.resolve([])),
      getSenateMemberVotes: jest.fn(() => Promise.resolve([])),
    },
  }));

  jest.mock('@/lib/cache/redis-client', () => ({
    getRedisCache: () => ({
      get: jest.fn(() => Promise.resolve(null)),
      set: jest.fn(() => Promise.resolve(true)),
      keys: jest.fn(() => Promise.resolve([])),
      mget: jest.fn(() => Promise.resolve([])),
    }),
  }));

  jest.mock('@/lib/ai/provider', () => ({
    generateAIText: jest.fn(),
  }));

  jest.mock('@civiq/entity-resolution', () => ({
    aggregateByIndustrySector: jest.fn(() => []),
  }));

  jest.mock('@/lib/connections/committee-agency-map', () => ({
    getTopicsForCommittee: jest.fn(() => []),
  }));

  jest.mock('@/lib/connections/policy-area-map', () => ({
    getJurisdictionSectorsForTopics: jest.fn(() => []),
  }));

  it('returns null when representative not found', async () => {
    const { getEnhancedRepresentative } = await import(
      '@/features/representatives/services/congress.service'
    );
    (getEnhancedRepresentative as jest.Mock).mockResolvedValue(null);

    const { assembleCivicBrief } = await import(
      '@/lib/intelligence/analyzers/civic-brief-assembler'
    );
    const result = await assembleCivicBrief('NOTFOUND');
    expect(result).toBeNull();
  });

  it('produces fallback summary when AI unavailable', async () => {
    const { getEnhancedRepresentative } = await import(
      '@/features/representatives/services/congress.service'
    );
    (getEnhancedRepresentative as jest.Mock).mockResolvedValue({
      name: 'Test Rep',
      party: 'D',
      state: 'CA',
      district: '12',
      chamber: 'House',
      terms: [{ startYear: '2023' }],
      committees: [],
    });

    const { generateAIText } = await import('@/lib/ai/provider');
    (generateAIText as jest.Mock).mockRejectedValue(new Error('AI unavailable'));

    const { assembleCivicBrief } = await import(
      '@/lib/intelligence/analyzers/civic-brief-assembler'
    );
    const result = await assembleCivicBrief('T000001');

    expect(result).not.toBeNull();
    expect(result!.source).toBe('statistical-fallback');
    expect(result!.summary).toContain('Test Rep');
    expect(result!.summary).toContain('Your representative'); // addresses the reader directly
    expect(result!.summary).toContain('Democrat'); // citizen-friendly party name
    expect(result!.identity.name).toBe('Test Rep');
    expect(result!.disclaimer).toContain('Correlation');
  });
});

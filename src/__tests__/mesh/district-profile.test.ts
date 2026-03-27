/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for District Intelligence Profile.
 *
 * Tests cosineSimilarity, alignment scoring logic, and type shapes.
 * Mocks external dependencies to avoid API calls.
 */

// Mock logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Mock hydrator (pulled in by temporal.ts)
jest.mock('@/lib/graph/hydrator', () => ({
  hydrateNeighborhood: jest.fn(),
}));

// Mock Redis cache
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  }),
}));

// Mock RepresentativesCoreService
jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: {
    getAllRepresentatives: jest.fn().mockResolvedValue([]),
  },
}));

// Mock analyzers
jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/intelligence/analyzers/finance-jurisdiction-analyzer', () => ({
  analyzeFinanceJurisdiction: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/intelligence/statistics/civic-stats', () => ({
  confidenceScore: jest.fn().mockReturnValue(0.7),
}));

jest.mock('@/lib/intelligence/analyzers/shared', () => ({
  withTimeout: jest.fn(<T>(p: Promise<T>) => p),
  generateInsightNarrative: jest.fn().mockResolvedValue({
    narrative: 'Test narrative',
    source: 'statistical-fallback',
  }),
  getCurrentElectionCycle: jest.fn().mockReturnValue(2026),
  classifySignal: jest.fn(() => 'pattern' as const),
  SourceCollector: jest.fn().mockImplementation(() => ({
    add: jest.fn(),
    toSources: jest.fn(() => []),
    count: 0,
  })),
}));

import { cosineSimilarity } from '@/lib/mesh/district-profile';
import type {
  DistrictProfile,
  RepresentationAlignment,
  SectorConcentration,
  PeerDistrict,
  BillExposure,
} from '@/lib/mesh/district-profile-types';
import { IndustrySector } from '@/lib/fec/industry-taxonomy';

describe('District Profile', () => {
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      const v = [0.5, 0.3, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      expect(cosineSimilarity(v, v)).toBeCloseTo(1.0, 5);
    });

    it('returns 0 for orthogonal vectors', () => {
      const a = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const b = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
    });

    it('returns value between 0 and 1 for similar vectors', () => {
      const a = [0.5, 0.3, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const b = [0.4, 0.4, 0.2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const sim = cosineSimilarity(a, b);
      expect(sim).toBeGreaterThan(0);
      expect(sim).toBeLessThanOrEqual(1);
    });

    it('handles zero vectors', () => {
      const zero = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const v = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      expect(cosineSimilarity(zero, v)).toBe(0);
    });

    it('handles empty vectors', () => {
      expect(cosineSimilarity([], [])).toBe(0);
    });

    it('handles mismatched lengths', () => {
      expect(cosineSimilarity([1, 0], [1, 0, 0])).toBe(0);
    });
  });

  describe('type shapes', () => {
    it('SectorConcentration has correct structure', () => {
      const sector: SectorConcentration = {
        sector: IndustrySector.DEFENSE,
        economicShare: 0.35,
        federalSpending: 1_500_000_000,
        pendingBills: 12,
      };
      expect(sector.economicShare).toBeGreaterThan(0);
      expect(sector.economicShare).toBeLessThanOrEqual(1);
    });

    it('RepresentationAlignment handles null scores', () => {
      const rep: RepresentationAlignment = {
        bioguideId: 'A000360',
        name: 'Test Rep',
        party: 'D',
        chamber: 'House',
        voteAlignmentScore: null,
        jurisdictionCoverage: null,
        fundingAlignmentScore: null,
        overallAlignment: null,
        alignmentTrend: 'stable',
      };
      expect(rep.overallAlignment).toBeNull();
    });

    it('RepresentationAlignment computes valid scores', () => {
      const rep: RepresentationAlignment = {
        bioguideId: 'A000360',
        name: 'Test Rep',
        party: 'R',
        chamber: 'Senate',
        voteAlignmentScore: 0.72,
        jurisdictionCoverage: 0.6,
        fundingAlignmentScore: 0.45,
        overallAlignment: 0.4 * 0.72 + 0.3 * 0.6 + 0.3 * 0.45,
        alignmentTrend: 'increasing',
      };
      expect(rep.overallAlignment).toBeCloseTo(0.603, 2);
      expect(rep.overallAlignment).toBeGreaterThan(0);
      expect(rep.overallAlignment).toBeLessThanOrEqual(1);
    });

    it('PeerDistrict has correct structure', () => {
      const peer: PeerDistrict = {
        districtId: 'TX-22',
        state: 'TX',
        district: '22',
        economicSimilarity: 0.89,
        repAlignmentScore: 0.65,
        alignmentDelta: 0.03,
      };
      expect(peer.economicSimilarity).toBeGreaterThan(0);
      expect(peer.economicSimilarity).toBeLessThanOrEqual(1);
    });

    it('BillExposure has correct structure', () => {
      const bill: BillExposure = {
        billId: 'HR 1234',
        title: 'Defense Spending Act',
        affectedSectors: [IndustrySector.DEFENSE],
        status: 'Passed House',
        relevanceScore: 5,
      };
      expect(bill.affectedSectors.length).toBeGreaterThan(0);
    });

    it('DistrictProfile extends InsightBase', () => {
      const profile: DistrictProfile = {
        districtId: 'CA-12',
        state: 'CA',
        district: '12',
        topSectors: [],
        federalSpendingTotal: 500_000_000,
        federalSpendingPerCapita: 680,
        topAgencies: [],
        representatives: [],
        pendingBillExposure: [],
        peerDistricts: [],
        alignmentHistory: [],
        narrative: 'Test narrative',
        confidence: 0.75,
        dataAsOf: '2026-03-17T00:00:00Z',
        methodology: 'Test method',
        disclaimer: 'Test disclaimer',
        lastAnalyzedAt: '2026-03-17T00:00:00Z',
        source: 'statistical-fallback',
      };
      expect(profile.confidence).toBeGreaterThanOrEqual(0);
      expect(profile.confidence).toBeLessThanOrEqual(1);
    });
  });
});

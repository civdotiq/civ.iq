/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/finance/route';
import { createMockRequest } from '../../utils/test-helpers';

// Mock the logger
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

// Mock the cache
jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

// Mock FEC API service
jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getFinancialSummary: jest.fn(),
    getSampleContributions: jest.fn(),
    getIndependentExpenditures: jest.fn(),
    getPACContributions: jest.fn(),
    getCommitteeInfo: jest.fn(),
  },
  classifyPACType: jest.fn(),
}));

// Mock bioguide to FEC mapping
jest.mock('@/lib/data/bioguide-fec-mapping', () => ({
  bioguideToFECMapping: {
    K000367: { fecId: 'S6MN00267', name: 'KLOBUCHAR, AMY' },
    P000197: { fecId: 'H8CA05050', name: 'PELOSI, NANCY' },
  },
}));

// Mock entity resolution
jest.mock('@/lib/fec/entity-resolution', () => ({
  deduplicateContributions: jest.fn(() => []),
  standardizeEmployerName: jest.fn(name => name?.toUpperCase() || ''),
}));

// Mock industry taxonomy
jest.mock('@/lib/fec/industry-taxonomy', () => ({
  aggregateByIndustrySector: jest.fn(() => []),
  getTopCategories: jest.fn(() => []),
  categorizeContribution: jest.fn(() => ({ sector: 'Unknown', category: 'Unknown' })),
}));

// Mock interest groups
jest.mock('@/lib/fec/interest-groups', () => ({
  categorizeIntoBaskets: jest.fn(() => []),
  getInterestGroupMetrics: jest.fn(() => ({
    topInfluencer: 'None',
    grassrootsPercentage: 0,
  })),
}));

import { fecApiService } from '@/lib/fec/fec-api-service';
import { govCache } from '@/services/cache';

const mockFecApiService = fecApiService as jest.Mocked<typeof fecApiService>;
const mockGovCache = govCache as jest.Mocked<typeof govCache>;

// Mock financial summary
const mockFinancialSummary = {
  candidate_id: 'S6MN00267',
  cycle: 2024,
  receipts: 5000000,
  disbursements: 4500000,
  last_cash_on_hand_end_period: 500000,
  individual_contributions: 3500000,
  other_political_committee_contributions: 1000000,
  political_party_committee_contributions: 300000,
  candidate_contribution: 200000,
  coverage_start_date: '2023-01-01',
  coverage_end_date: '2024-06-30',
};

// Mock contributions
const mockContributions = [
  {
    contributor_name: 'SMITH, JOHN',
    contributor_city: 'MINNEAPOLIS',
    contributor_state: 'MN',
    contributor_zip: '55401',
    contributor_employer: 'TECH COMPANY',
    contributor_occupation: 'SOFTWARE ENGINEER',
    contribution_receipt_amount: 2800,
    contribution_receipt_date: '2024-06-15',
    committee_name: 'KLOBUCHAR FOR MINNESOTA',
    candidate_id: 'S6MN00267',
    file_number: 1234567,
    line_number: 'SA11AI',
  },
  {
    contributor_name: 'DOE, JANE',
    contributor_city: 'ST PAUL',
    contributor_state: 'MN',
    contributor_zip: '55102',
    contributor_employer: 'HOSPITAL INC',
    contributor_occupation: 'PHYSICIAN',
    contribution_receipt_amount: 1500,
    contribution_receipt_date: '2024-06-10',
    committee_name: 'KLOBUCHAR FOR MINNESOTA',
    candidate_id: 'S6MN00267',
    file_number: 1234568,
    line_number: 'SA11AI',
  },
];

describe('/api/representative/[bioguideId]/finance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGovCache.get.mockResolvedValue(null);
    mockFecApiService.getFinancialSummary.mockResolvedValue(mockFinancialSummary);
    mockFecApiService.getSampleContributions.mockResolvedValue(mockContributions);
    mockFecApiService.getIndependentExpenditures.mockResolvedValue([]);
    mockFecApiService.getPACContributions.mockResolvedValue([]);
    mockFecApiService.getCommitteeInfo.mockResolvedValue(null);
  });

  describe('Success Cases', () => {
    it('should return finance data for mapped bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('totalRaised');
      expect(data).toHaveProperty('totalSpent');
      expect(data).toHaveProperty('cashOnHand');
      expect(data).toHaveProperty('individualContributions');
      expect(data).toHaveProperty('pacContributions');
    });

    it('should return financial totals from FEC data', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.totalRaised).toBe(5000000);
      expect(data.totalSpent).toBe(4500000);
      expect(data.cashOnHand).toBe(500000);
    });

    it('should return cached data when available', async () => {
      const cachedData = {
        totalRaised: 1000000,
        metadata: { cacheHit: false },
      };
      mockGovCache.get.mockResolvedValue(cachedData);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.metadata.cacheHit).toBe(true);
      expect(mockFecApiService.getFinancialSummary).not.toHaveBeenCalled();
    });
  });

  describe('No FEC Mapping Cases', () => {
    it('should return empty data for unmapped bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/UNKNOWN/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'UNKNOWN' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalRaised).toBe(0);
      expect(data.metadata.hasFecMapping).toBe(false);
      expect(data.metadata.note).toContain('No FEC candidate ID mapping found');
    });
  });

  describe('No FEC Data Cases', () => {
    it('should handle no financial data in any cycle', async () => {
      mockFecApiService.getFinancialSummary.mockResolvedValue(null);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalRaised).toBe(0);
      expect(data.metadata.note).toContain('No FEC financial data available');
    });
  });

  describe('Error Handling', () => {
    it('should handle FEC API errors gracefully', async () => {
      mockFecApiService.getFinancialSummary.mockRejectedValue(new Error('FEC API error'));

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch campaign finance data');
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data).toHaveProperty('totalRaised');
      expect(data).toHaveProperty('totalSpent');
      expect(data).toHaveProperty('cashOnHand');
      expect(data).toHaveProperty('individualContributions');
      expect(data).toHaveProperty('pacContributions');
      expect(data).toHaveProperty('partyContributions');
      expect(data).toHaveProperty('candidateContributions');
      expect(data).toHaveProperty('industryBreakdown');
      expect(data).toHaveProperty('geographicBreakdown');
      expect(data).toHaveProperty('topContributors');
      expect(data).toHaveProperty('recentContributions');
    });

    it('should include data quality metrics', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.dataQuality).toHaveProperty('industry');
      expect(data.dataQuality).toHaveProperty('geography');
      expect(data.dataQuality).toHaveProperty('overallDataConfidence');
    });

    it('should include FEC transparency links', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.fecTransparencyLinks).toHaveProperty('candidatePage');
      expect(data.fecTransparencyLinks).toHaveProperty('contributions');
      expect(data.fecTransparencyLinks).toHaveProperty('disbursements');
      expect(data.fecTransparencyLinks).toHaveProperty('financialSummary');
    });

    it('should include metadata with cycle information', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.metadata).toHaveProperty('bioguideId');
      expect(data.metadata).toHaveProperty('hasFecMapping');
      expect(data.metadata).toHaveProperty('cacheHit');
    });

    it('should include PAC contribution breakdown', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.pacContributionsByType).toHaveProperty('superPac');
      expect(data.pacContributionsByType).toHaveProperty('traditional');
      expect(data.pacContributionsByType).toHaveProperty('leadership');
      expect(data.pacContributionsByType).toHaveProperty('hybrid');
    });

    it('should include legacy compatibility fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data).toHaveProperty('industry_breakdown');
      expect(data).toHaveProperty('top_contributors');
      expect(data).toHaveProperty('recent_contributions');
    });
  });

  describe('Multi-Cycle Fallback', () => {
    it('should try multiple cycles when recent data unavailable', async () => {
      // First call returns null, second returns data
      mockFecApiService.getFinancialSummary
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockFinancialSummary);

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/finance');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockFecApiService.getFinancialSummary).toHaveBeenCalledTimes(2);
      expect(data.metadata.isHistoricalData).toBe(true);
    });
  });
});

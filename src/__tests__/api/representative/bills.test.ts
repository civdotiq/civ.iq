/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/bills/route';
import { createMockRequest } from '../../utils/test-helpers';

// Mock the cache module
jest.mock('@/services/cache', () => ({
  cachedHeavyEndpoint: jest.fn((key, fetcher) => fetcher()),
}));

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

// Mock the congress service
jest.mock('@/services/congress/optimized-congress.service', () => ({
  getComprehensiveBillsByMember: jest.fn(),
  getBillsSummary: jest.fn(),
}));

import {
  getComprehensiveBillsByMember,
  getBillsSummary,
} from '@/services/congress/optimized-congress.service';

const mockGetComprehensiveBills = getComprehensiveBillsByMember as jest.Mock;
const mockGetBillsSummary = getBillsSummary as jest.Mock;

// Mock bills response
const mockBillsResponse = {
  bills: [
    {
      billId: 'hr-1234-119',
      title: 'Test Bill 1',
      number: 'H.R.1234',
      congress: 119,
      type: 'hr',
      introducedDate: '2025-01-15',
      latestAction: 'Referred to committee',
      relationship: 'sponsored',
    },
    {
      billId: 'hr-5678-119',
      title: 'Test Bill 2',
      number: 'H.R.5678',
      congress: 119,
      type: 'hr',
      introducedDate: '2025-01-10',
      latestAction: 'Passed House',
      relationship: 'cosponsored',
    },
  ],
  pagination: {
    total: 2,
    page: 1,
    limit: 25,
    hasMore: false,
  },
  metadata: {
    sponsoredCount: 1,
    cosponsoredCount: 1,
    executionTime: 150,
    cached: false,
  },
};

const mockSummaryResponse = {
  totalSponsored: 15,
  totalCosponsored: 45,
  billsByStatus: {
    introduced: 30,
    passed: 10,
    enacted: 5,
  },
};

describe('/api/representative/[bioguideId]/bills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetComprehensiveBills.mockResolvedValue(mockBillsResponse);
    mockGetBillsSummary.mockResolvedValue(mockSummaryResponse);
  });

  describe('Success Cases', () => {
    it('should return bills for valid bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('sponsoredLegislation');
      expect(data).toHaveProperty('sponsored');
      expect(data).toHaveProperty('cosponsored');
      expect(data).toHaveProperty('totalSponsored');
      expect(data).toHaveProperty('totalCosponsored');
      expect(data).toHaveProperty('metadata');
    });

    it('should support pagination parameters', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/bills?limit=10&page=2'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });

      expect(response.status).toBe(200);
      expect(mockGetComprehensiveBills).toHaveBeenCalledWith(
        expect.objectContaining({
          bioguideId: 'K000367',
          limit: 10,
          page: 2,
        })
      );
    });

    it('should filter by congress number', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/bills?congress=118'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });

      expect(response.status).toBe(200);
      expect(mockGetComprehensiveBills).toHaveBeenCalledWith(
        expect.objectContaining({
          congress: 118,
        })
      );
    });

    it('should return summary when summary=true', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/bills?summary=true'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockGetBillsSummary).toHaveBeenCalledWith('K000367');
      expect(data).toEqual(mockSummaryResponse);
    });

    it('should support progressive loading', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/bills?progressive=true'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata?.progressive).toBe(true);
    });

    it('should include amendments when requested', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/bills?includeAmendments=true'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });

      expect(response.status).toBe(200);
      expect(mockGetComprehensiveBills).toHaveBeenCalledWith(
        expect.objectContaining({
          includeAmendments: true,
        })
      );
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative//bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('BioguideId required');
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockGetComprehensiveBills.mockRejectedValue(new Error('Service unavailable'));

      const request = createMockRequest('http://localhost:3000/api/representative/K000367/bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Internal server error');
    });
  });

  describe('Response Structure', () => {
    it('should include legacy format for backward compatibility', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data).toHaveProperty('sponsoredLegislation');
      expect(Array.isArray(data.sponsoredLegislation)).toBe(true);
    });

    it('should include enhanced format with counts', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.sponsored).toHaveProperty('count');
      expect(data.sponsored).toHaveProperty('bills');
      expect(data.cosponsored).toHaveProperty('count');
      expect(data.cosponsored).toHaveProperty('bills');
    });

    it('should include pagination info', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data).toHaveProperty('pagination');
    });

    it('should include metadata with source info', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative/K000367/bills');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.metadata?.source).toContain('Congress.gov');
      expect(data.metadata?.congressLabel).toBe('119th Congress');
    });
  });
});

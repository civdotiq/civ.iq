/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/govinfo/hearings/route';
import { createMockRequest } from '../../utils/test-helpers';

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((key, fetcher) => fetcher()),
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

// Mock GovInfo API response
const mockGovInfoResponse = {
  count: 2,
  packages: [
    {
      packageId: 'CHRG-119shrg12345',
      title: 'Hearing on Climate Change Policy',
      congress: '119',
      docClass: 'SHRG',
      dateIssued: '2024-06-15',
      lastModified: '2024-06-15T10:00:00Z',
    },
    {
      packageId: 'CHRG-119hhrg67890',
      title: 'Hearing on Economic Recovery',
      congress: '119',
      docClass: 'HHRG',
      dateIssued: '2024-06-10',
      lastModified: '2024-06-10T09:30:00Z',
    },
  ],
  nextPage: 'https://api.govinfo.gov/collections/CHRG?offsetMark=AoIIP4AAB',
};

describe('/api/govinfo/hearings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockGovInfoResponse),
    });
  });

  describe('Success Cases', () => {
    it('should return hearings data', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.hearings).toHaveLength(2);
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('metadata');
    });

    it('should filter by congress', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings?congress=119');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.congress).toBe(119);
    });

    it('should filter by chamber (house)', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings?chamber=house');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.chamber).toBe('house');
    });

    it('should filter by chamber (senate)', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/govinfo/hearings?chamber=senate'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.chamber).toBe('senate');
    });

    it('should support page_size parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings?page_size=50');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.pageSize).toBe(50);
    });

    it('should cap page_size at 100', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings?page_size=200');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.pageSize).toBe(100);
    });

    it('should ensure minimum page_size of 1', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings?page_size=0');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.pageSize).toBe(1);
    });

    it('should support offset pagination', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings?offset=abc123');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('pagination.nextPage');
    });
  });

  describe('Error Handling', () => {
    it('should handle GovInfo API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(data.hearings).toEqual([]);
      expect(data.pagination?.count).toBe(0);
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(data.hearings).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('hearings');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('filters');
      expect(data).toHaveProperty('metadata');
    });

    it('should include pagination information', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toHaveProperty('count');
      expect(data.pagination).toHaveProperty('pageSize');
      expect(data.pagination).toHaveProperty('nextPage');
    });

    it('should include metadata with data source', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata?.dataSource).toBe('govinfo.gov');
      expect(data.metadata?.generatedAt).toBeDefined();
    });

    it('should transform hearings to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      if (data.hearings.length > 0) {
        const hearing = data.hearings[0];
        expect(hearing).toHaveProperty('id');
        expect(hearing).toHaveProperty('title');
        expect(hearing).toHaveProperty('type', 'hearing');
        expect(hearing).toHaveProperty('congress');
        expect(hearing).toHaveProperty('chamber');
        expect(hearing).toHaveProperty('dateIssued');
        expect(hearing).toHaveProperty('detailsUrl');
        expect(hearing).toHaveProperty('pdfUrl');
      }
    });
  });

  describe('Chamber Parsing', () => {
    it('should parse Senate hearings (SHRG prefix)', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      const senateHearing = data.hearings.find((h: { id: string }) => h.id === 'CHRG-119shrg12345');
      expect(senateHearing?.chamber).toBe('Senate');
    });

    it('should parse House hearings (HHRG prefix)', async () => {
      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      const houseHearing = data.hearings.find((h: { id: string }) => h.id === 'CHRG-119hhrg67890');
      expect(houseHearing?.chamber).toBe('House');
    });

    it('should default to Joint for unknown chamber codes', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            count: 1,
            packages: [
              {
                packageId: 'CHRG-119jhrg99999',
                title: 'Joint Committee Hearing',
                congress: '119',
                docClass: 'JHRG',
                dateIssued: '2024-06-01',
                lastModified: '2024-06-01T08:00:00Z',
              },
            ],
            nextPage: null,
          }),
      });

      const request = createMockRequest('http://localhost:3000/api/govinfo/hearings');
      const response = await GET(request);
      const data = await response.json();

      expect(data.hearings[0]?.chamber).toBe('Joint');
    });
  });
});

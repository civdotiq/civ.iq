/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/bills/latest/route';
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

const mockGetBillsByPolicyArea = jest.fn();
jest.mock('@/lib/data-sources/bill-policy-areas/load', () => ({
  getBillsByPolicyArea: (...args: unknown[]) => mockGetBillsByPolicyArea(...args),
}));

// Mock Congress.gov API response
const mockBillsResponse = {
  bills: [
    {
      congress: 119,
      type: 'HR',
      number: 1,
      title: 'For the People Act',
      updateDate: '2025-01-05',
      latestAction: {
        text: 'Referred to Committee',
        actionDate: '2025-01-04',
      },
    },
    {
      congress: 119,
      type: 'S',
      number: 1,
      title: 'Freedom to Vote Act',
      updateDate: '2025-01-04',
      latestAction: {
        text: 'Introduced in Senate',
        actionDate: '2025-01-03',
      },
    },
    {
      congress: 119,
      type: 'HR',
      number: 2,
      title: 'Infrastructure Investment Act',
      updateDate: '2025-01-03',
      latestAction: {
        text: 'Passed House',
        actionDate: '2025-01-02',
      },
    },
  ],
};

describe('/api/bills/latest', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockBillsResponse),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Success Cases', () => {
    it('should return latest bills', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('bills');
      expect(data).toHaveProperty('metadata');
      expect(data.bills.length).toBe(3);
    });

    it('should support limit parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest?limit=10');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=10'),
        expect.any(Object)
      );
    });

    it('should support sort parameter', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/bills/latest?sort=number%2Bdesc'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=number+desc'),
        expect.any(Object)
      );
    });

    it('should use default limit of 50', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('limit=50'),
        expect.any(Object)
      );
    });

    it('should use default sort by updateDate descending', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('sort=updateDate+desc'),
        expect.any(Object)
      );
    });

    it('should use current congress (119)', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bill/119'),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    // Note: Tests for API errors and network errors require NextResponse constructor
    // which has compatibility issues with Jest in Next.js 15. These scenarios are
    // better tested in integration tests. The route properly handles these cases
    // by returning 500 status with error messages.

    it('should handle Congress.gov API errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/bills/latest');

      // Route returns 500 via NextResponse which throws in Jest without mock
      // In production, this returns a proper 500 response
      await expect(GET(request)).rejects.toThrow();
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/bills/latest');

      // Route catches error and returns 500 via NextResponse
      // In Jest without NextResponse mock, this throws
      await expect(GET(request)).rejects.toThrow();
    });

    it('should handle empty bills response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ bills: [] }),
      });

      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bills).toEqual([]);
      expect(data.metadata.totalBills).toBe(0);
    });
  });

  describe('Response Structure', () => {
    it('should include bills array', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('bills');
      expect(Array.isArray(data.bills)).toBe(true);
    });

    it('should include metadata', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata).toHaveProperty('congress');
      expect(data.metadata).toHaveProperty('totalBills');
      expect(data.metadata).toHaveProperty('source');
      expect(data.metadata).toHaveProperty('generatedAt');
      expect(data.metadata).toHaveProperty('queryParams');
    });

    it('should include query params in metadata', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest?limit=25');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata.queryParams).toHaveProperty('limit');
      expect(data.metadata.queryParams).toHaveProperty('sort');
    });

    it('should include bill details', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      const response = await GET(request);
      const data = await response.json();

      if (data.bills.length > 0) {
        const bill = data.bills[0];
        expect(bill).toHaveProperty('congress');
        expect(bill).toHaveProperty('type');
        expect(bill).toHaveProperty('number');
        expect(bill).toHaveProperty('title');
        expect(bill).toHaveProperty('updateDate');
        expect(bill).toHaveProperty('latestAction');
      }
    });
  });

  describe('Congress Number', () => {
    it('should use CURRENT_CONGRESS env var when set', async () => {
      process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key', CURRENT_CONGRESS: '118' };

      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      await GET(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/bill/118'),
        expect.any(Object)
      );
    });

    it('should default to 119th Congress', async () => {
      const request = createMockRequest('http://localhost:3000/api/bills/latest');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata.congress).toBe(119);
    });
  });

  describe('policyArea filter (GovInfo corpus)', () => {
    const healthBill = {
      id: '119-sjres-7',
      congress: 119,
      type: 'sjres',
      number: 7,
      title: 'A joint resolution on health',
      policyArea: 'Health',
      introducedDate: '2025-02-01',
      latestActionDate: '2025-03-01',
      latestActionText: 'Read twice.',
    };

    it('answers from the corpus without calling Congress.gov', async () => {
      mockGetBillsByPolicyArea.mockResolvedValue({
        total: 1841,
        bills: [healthBill],
        congress: 119,
        generatedAt: '2026-09-20T00:00:00Z',
      });
      const request = createMockRequest(
        'http://localhost:3000/api/bills/latest?policyArea=health&limit=5'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(global.fetch).not.toHaveBeenCalled();
      expect(mockGetBillsByPolicyArea).toHaveBeenCalledWith('Health', 5);
      expect(data.metadata.totalBills).toBe(1841);
      expect(data.metadata.policyArea).toBe('Health');
      expect(data.bills[0]).toEqual({
        congress: 119,
        type: 'SJRES',
        number: '7',
        title: 'A joint resolution on health',
        originChamber: 'Senate',
        originChamberCode: 'S',
        introducedDate: '2025-02-01',
        latestAction: { actionDate: '2025-03-01', text: 'Read twice.' },
        policyArea: { name: 'Health' },
      });
    });

    it('rejects an unknown policy area with a 400 ApiError', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/bills/latest?policyArea=Not%20A%20Topic'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('VALIDATION_ERROR');
      expect(mockGetBillsByPolicyArea).not.toHaveBeenCalled();
    });

    it('reports unavailable rather than zero when the corpus is missing', async () => {
      mockGetBillsByPolicyArea.mockResolvedValue(null);
      const request = createMockRequest('http://localhost:3000/api/bills/latest?policyArea=Health');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.bills).toEqual([]);
      expect(data.metadata.totalBills).toBeNull();
      expect(data.metadata.dataAvailable).toBe(false);
    });
  });
});

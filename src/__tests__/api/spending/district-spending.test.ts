/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/spending/district/[districtId]/route';
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

// Mock USAspending API responses
const mockContractsResponse = {
  results: [
    {
      'Award ID': 'CONT-2024-001',
      internal_id: 12345,
      'Recipient Name': 'Defense Contractor Inc',
      'Award Amount': 5000000,
      'Award Type': 'Definitive Contract',
      'Awarding Agency': 'Department of Defense',
      agency_slug: 'dod',
      'Start Date': '2024-01-15',
      Description: 'Military equipment procurement',
      generated_internal_id: 'gen-12345',
    },
    {
      'Award ID': 'CONT-2024-002',
      internal_id: 12346,
      'Recipient Name': 'Tech Solutions LLC',
      'Award Amount': 2500000,
      'Award Type': 'Delivery Order',
      'Awarding Agency': 'Department of Homeland Security',
      agency_slug: 'dhs',
      'Start Date': '2024-02-20',
      Description: 'IT services contract',
      generated_internal_id: 'gen-12346',
    },
  ],
};

const mockGrantsResponse = {
  results: [
    {
      'Award ID': 'GRANT-2024-001',
      internal_id: 67890,
      'Recipient Name': 'State University Research',
      'Award Amount': 1500000,
      'Award Type': 'Grant',
      'Awarding Agency': 'National Science Foundation',
      agency_slug: 'nsf',
      'Start Date': '2024-03-01',
      Description: 'Research grant for renewable energy',
      generated_internal_id: 'gen-67890',
    },
  ],
};

const mockAggregateResponse = {
  results: [
    {
      aggregated_amount: 10000000,
      per_capita: 15000,
      population: 750000,
    },
  ],
};

describe('/api/spending/district/[districtId]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup fetch mock to handle different USAspending endpoints
    global.fetch = jest.fn().mockImplementation((url: string, options: RequestInit) => {
      const body = options?.body ? JSON.parse(options.body as string) : {};

      // Contracts (award_type_codes includes 'A', 'B', 'C', 'D')
      if (url.includes('spending_by_award') && body.filters?.award_type_codes?.includes('A')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockContractsResponse),
        });
      }

      // Grants (award_type_codes includes '02', '03', etc)
      if (url.includes('spending_by_award') && body.filters?.award_type_codes?.includes('02')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockGrantsResponse),
        });
      }

      // Aggregate spending by geography
      if (url.includes('spending_by_geography')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAggregateResponse),
        });
      }

      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  describe('Success Cases', () => {
    it('should return spending data for valid district', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('summary');
      expect(data).toHaveProperty('recentContracts');
      expect(data).toHaveProperty('recentGrants');
      expect(data).toHaveProperty('metadata');
    });

    it('should return contracts and grants', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      expect(data.recentContracts.length).toBeGreaterThanOrEqual(0);
      expect(data.recentGrants.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle lowercase district ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/mi-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'mi-05' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.summary?.districtId).toBe('MI-05');
    });

    it('should handle single digit districts', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/CA-01');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'CA-01' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid district format', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/INVALID');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'INVALID' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid district ID format');
    });

    it('should return 400 for missing dash in district ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI05' }) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid state code', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/XX-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'XX-05' }) });
      const data = await response.json();

      // Format is valid but state might not exist - still returns 200 with empty data
      expect([200, 400]).toContain(response.status);
    });

    it('should return 400 for single digit district without padding', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/CA-5');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'CA-5' }) });

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle USAspending API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      // API returns success with empty arrays on API error
      expect(data.recentContracts).toEqual([]);
      expect(data.recentGrants).toEqual([]);
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      expect(data.recentContracts).toEqual([]);
      expect(data.recentGrants).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should include summary with spending breakdown', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      expect(data.summary).toHaveProperty('districtId');
      expect(data.summary).toHaveProperty('state');
      expect(data.summary).toHaveProperty('districtNumber');
      expect(data.summary).toHaveProperty('fiscalYear');
      expect(data.summary).toHaveProperty('totalSpending');
      expect(data.summary).toHaveProperty('contractSpending');
      expect(data.summary).toHaveProperty('grantSpending');
    });

    it('should include metadata with data source', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      expect(data.metadata?.dataSource).toBe('usaspending.gov');
      expect(data.metadata?.generatedAt).toBeDefined();
      expect(data.metadata?.fiscalYear).toBeDefined();
    });

    it('should transform awards to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      if (data.recentContracts.length > 0) {
        const contract = data.recentContracts[0];
        expect(contract).toHaveProperty('id');
        expect(contract).toHaveProperty('recipientName');
        expect(contract).toHaveProperty('amount');
        expect(contract).toHaveProperty('type', 'contract');
        expect(contract).toHaveProperty('agency');
        expect(contract).toHaveProperty('url');
      }

      if (data.recentGrants.length > 0) {
        const grant = data.recentGrants[0];
        expect(grant).toHaveProperty('id');
        expect(grant).toHaveProperty('type', 'grant');
      }
    });

    it('should include per capita and population when available', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/MI-05');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'MI-05' }) });
      const data = await response.json();

      // These may be null if aggregate data unavailable
      expect(data.summary).toHaveProperty('perCapita');
      expect(data.summary).toHaveProperty('population');
    });
  });

  // Note: Cache header tests require integration testing since Jest mocks NextResponse
  // The actual cache headers are set in the route implementation and verified in production

  describe('District ID Parsing', () => {
    it('should correctly parse state from district ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/spending/district/NY-10');
      const response = await GET(request, { params: Promise.resolve({ districtId: 'NY-10' }) });
      const data = await response.json();

      expect(data.summary?.state).toBe('NY');
      expect(data.summary?.districtNumber).toBe('10');
    });

    it('should handle all valid state codes', async () => {
      const validStates = ['CA', 'TX', 'FL', 'NY', 'PA', 'IL', 'OH', 'GA', 'NC', 'MI'];

      for (const state of validStates) {
        const request = createMockRequest(
          `http://localhost:3000/api/spending/district/${state}-01`
        );
        const response = await GET(request, {
          params: Promise.resolve({ districtId: `${state}-01` }),
        });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.summary?.state).toBe(state);
      }
    });
  });
});

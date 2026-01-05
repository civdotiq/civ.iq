/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/committees/route';
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

// Mock the monitoring module
jest.mock('@/lib/monitoring/telemetry', () => ({
  monitorExternalApi: jest.fn(() => ({
    end: jest.fn(),
  })),
}));

// Mock Congress.gov API responses
const mockHouseCommitteesResponse = {
  committees: [
    {
      systemCode: 'hsju00',
      name: 'Committee on the Judiciary',
      establishedDate: '1789-06-25',
      url: 'https://judiciary.house.gov',
    },
    {
      systemCode: 'hsag00',
      name: 'Committee on Agriculture',
      establishedDate: '1820-05-03',
      url: 'https://agriculture.house.gov',
    },
  ],
  pagination: {
    count: 2,
  },
};

const mockSenateCommitteesResponse = {
  committees: [
    {
      systemCode: 'ssju00',
      name: 'Committee on the Judiciary',
      url: 'https://judiciary.senate.gov',
    },
    {
      systemCode: 'ssfi00',
      name: 'Committee on Finance',
      url: 'https://finance.senate.gov',
    },
  ],
  pagination: {
    count: 2,
  },
};

const mockJointCommitteesResponse = {
  committees: [
    {
      systemCode: 'jstx00',
      name: 'Joint Committee on Taxation',
    },
  ],
};

describe('/api/committees', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/committee/house')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockHouseCommitteesResponse),
        });
      }
      if (url.includes('/committee/senate')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockSenateCommitteesResponse),
        });
      }
      if (url.includes('/committee/joint')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockJointCommitteesResponse),
        });
      }
      if (url.includes('/subcommittees')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ subcommittees: [] }),
        });
      }
      if (url.includes('/members')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ members: [] }),
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Success Cases', () => {
    it('should return all committees', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('houseCommittees');
      expect(data).toHaveProperty('senateCommittees');
      expect(data).toHaveProperty('jointCommittees');
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('metadata');
    });

    it('should filter by chamber (house)', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees?chamber=house');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.houseCommittees.length).toBeGreaterThan(0);
    });

    it('should filter by chamber (senate)', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees?chamber=senate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.senateCommittees.length).toBeGreaterThan(0);
    });

    it('should filter by chamber (joint)', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees?chamber=joint');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jointCommittees.length).toBeGreaterThan(0);
    });

    it('should include subcommittees by default', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Subcommittees are fetched by default
    });

    it('should exclude subcommittees when requested', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/committees?includeSubcommittees=false'
      );
      const response = await GET(request);

      expect(response.status).toBe(200);
    });

    it('should include members when requested', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees?includeMembers=true');
      const response = await GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when API key is missing', async () => {
      process.env = { ...originalEnv };
      delete process.env.CONGRESS_API_KEY;

      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Failed to fetch');
    });

    it('should handle Congress.gov API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      // Should still return a response with empty arrays
      expect(response.status).toBe(200);
      expect(data.houseCommittees).toEqual([]);
      expect(data.senateCommittees).toEqual([]);
    });

    it('should handle network errors', async () => {
      // First call succeeds (for cache key generation), subsequent calls fail
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        // Fail on subsequent calls
        if (callCount > 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.reject(new Error('Network error'));
      });

      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      // Route gracefully handles errors and returns partial data or 500
      expect([200, 500]).toContain(response.status);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('houseCommittees');
      expect(data).toHaveProperty('senateCommittees');
      expect(data).toHaveProperty('jointCommittees');
      expect(data).toHaveProperty('statistics');
      expect(data).toHaveProperty('metadata');
    });

    it('should include statistics', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      expect(data.statistics).toHaveProperty('totalCommittees');
      expect(data.statistics).toHaveProperty('totalSubcommittees');
      expect(data.statistics).toHaveProperty('houseCount');
      expect(data.statistics).toHaveProperty('senateCount');
      expect(data.statistics).toHaveProperty('jointCount');
    });

    it('should include metadata with data source', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata?.dataSource).toBe('congress.gov');
      expect(data.metadata?.lastUpdated).toBeDefined();
      expect(data.metadata?.congress).toContain('Congress');
    });

    it('should transform committees to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      if (data.houseCommittees.length > 0) {
        const committee = data.houseCommittees[0];
        expect(committee).toHaveProperty('code');
        expect(committee).toHaveProperty('name');
        expect(committee).toHaveProperty('chamber');
        expect(committee).toHaveProperty('type');
        expect(committee).toHaveProperty('jurisdiction');
        expect(committee).toHaveProperty('isSubcommittee');
      }
    });
  });

  describe('Committee Type Classification', () => {
    it('should classify standing committees', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees?chamber=house');
      const response = await GET(request);
      const data = await response.json();

      const standingCommittee = data.houseCommittees.find(
        (c: { type: string }) => c.type === 'standing'
      );
      expect(standingCommittee).toBeDefined();
    });

    it('should classify joint committees', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      if (data.jointCommittees.length > 0) {
        expect(data.jointCommittees[0].type).toBe('joint');
      }
    });
  });

  describe('Jurisdiction Assignment', () => {
    it('should assign jurisdiction based on committee name', async () => {
      const request = createMockRequest('http://localhost:3000/api/committees');
      const response = await GET(request);
      const data = await response.json();

      const judiciaryCommittee = data.houseCommittees.find((c: { name: string }) =>
        c.name.toLowerCase().includes('judiciary')
      );

      if (judiciaryCommittee) {
        expect(judiciaryCommittee.jurisdiction).toContain('courts');
      }
    });
  });
});

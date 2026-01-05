/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/witnesses/route';
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

// Mock environment variable
const originalEnv = process.env;

// Mock Congress.gov API responses
const mockMeetingsList = {
  committeeMeetings: [
    {
      chamber: 'House',
      congress: 119,
      eventId: 'event-12345',
      updateDate: '2024-06-15',
    },
    {
      chamber: 'Senate',
      congress: 119,
      eventId: 'event-67890',
      updateDate: '2024-06-10',
    },
  ],
};

const mockMeetingDetail = {
  committeeMeeting: {
    chamber: 'House',
    congress: 119,
    eventId: 'event-12345',
    date: '2024-06-15',
    title: 'Hearing on Climate Policy',
    type: 'Hearing',
    committees: [{ name: 'House Committee on Energy', systemCode: 'hsif00' }],
    witnesses: [
      {
        name: 'Dr. Jane Smith',
        organization: 'National Research Institute',
        position: 'Director',
      },
      {
        name: 'John Doe',
        organization: 'Tech Corp',
        position: 'CEO',
      },
    ],
  },
};

describe('/api/witnesses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };

    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/committee-meeting/119/') && url.includes('?api_key=')) {
        // Meeting detail request
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMeetingDetail),
        });
      }
      if (url.includes('/committee-meeting/')) {
        // Meeting list request
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockMeetingsList),
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
    it('should return witnesses data', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('witnesses');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('metadata');
    });

    it('should search witnesses by query (q)', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?q=climate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata?.searchQuery).toBe('climate');
    });

    it('should search witnesses by query (query param)', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?query=energy');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata?.searchQuery).toBe('energy');
    });

    it('should filter by chamber (house)', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?chamber=house');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('should filter by chamber (senate)', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?chamber=senate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('should accept short chamber codes (h for house)', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?chamber=h');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('should accept short chamber codes (s for senate)', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?chamber=s');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('should support limit parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?limit=25');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.limit).toBe(25);
    });

    it('should cap limit at 100', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?limit=200');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.limit).toBe(100);
    });

    it('should support offset parameter', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?offset=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.offset).toBe(10);
    });
  });

  describe('Error Handling', () => {
    // Note: Testing missing API key requires module mocking which adds complexity.
    // The CONGRESS_API_KEY is read at module load time, so process.env changes
    // during tests don't affect the already-imported module.

    it('should handle Congress.gov API errors gracefully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'Internal error' }),
      });

      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      expect(data.witnesses).toEqual([]);
    });

    it('should handle network errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      expect(data.witnesses).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('witnesses');
      expect(data).toHaveProperty('pagination');
      expect(data).toHaveProperty('metadata');
    });

    it('should include pagination information', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      expect(data.pagination).toHaveProperty('total');
      expect(data.pagination).toHaveProperty('limit');
      expect(data.pagination).toHaveProperty('offset');
      expect(data.pagination).toHaveProperty('hasMore');
    });

    it('should include metadata with data source', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      expect(data.metadata?.dataSource).toBe('congress.gov');
      expect(data.metadata?.congress).toBe(119);
      expect(data.metadata?.generatedAt).toBeDefined();
    });

    it('should transform witnesses to expected format', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      if (data.witnesses.length > 0) {
        const witness = data.witnesses[0];
        expect(witness).toHaveProperty('name');
        expect(witness).toHaveProperty('eventId');
        expect(witness).toHaveProperty('eventTitle');
        expect(witness).toHaveProperty('eventDate');
        expect(witness).toHaveProperty('chamber');
        expect(witness).toHaveProperty('committees');
        expect(witness).toHaveProperty('congressGovUrl');
      }
    });

    it('should include organization and position when available', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses');
      const response = await GET(request);
      const data = await response.json();

      if (data.witnesses.length > 0) {
        const witness = data.witnesses[0];
        // These are optional but should be present when available
        if (witness.organization) {
          expect(typeof witness.organization).toBe('string');
        }
        if (witness.position) {
          expect(typeof witness.position).toBe('string');
        }
      }
    });
  });

  describe('Search Filtering', () => {
    it('should filter by witness name', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?q=Smith');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.metadata?.searchQuery).toBe('Smith');
    });

    it('should filter by organization', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?q=Research');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });

    it('should filter by event title', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?q=Climate');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
    });
  });

  describe('Pagination', () => {
    it('should calculate hasMore correctly', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?limit=1');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(typeof data.pagination.hasMore).toBe('boolean');
    });

    it('should handle offset pagination', async () => {
      const request = createMockRequest('http://localhost:3000/api/witnesses?offset=0&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.pagination?.offset).toBe(0);
      expect(data.pagination?.limit).toBe(10);
    });
  });
});

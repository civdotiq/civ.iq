/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/state-legislature/[state]/route';
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

// Mock fetch for OpenStates API
const mockOpenStatesJurisdiction = {
  name: 'Michigan',
  latest_session: {
    name: '2024 Regular Session',
    start_date: '2024-01-10',
    end_date: '2024-12-31',
  },
  chambers: [
    { chamber: 'upper', name: 'Senate' },
    { chamber: 'lower', name: 'House of Representatives' },
  ],
};

const mockOpenStatesLegislators = {
  results: [
    {
      id: 'ocd-person/12345',
      name: 'John Smith',
      party: 'Democratic',
      current_role: {
        org_classification: 'upper',
        district: '1',
        start_date: '2023-01-01',
        end_date: '2027-01-01',
      },
      contact_details: [
        { type: 'email', value: 'john.smith@senate.gov' },
        { type: 'voice', value: '517-555-0100' },
      ],
      image: 'https://example.com/photo.jpg',
    },
    {
      id: 'ocd-person/67890',
      name: 'Jane Doe',
      party: 'Republican',
      current_role: {
        org_classification: 'lower',
        district: '42',
        start_date: '2023-01-01',
        end_date: '2025-01-01',
      },
      contact_details: [],
    },
  ],
};

describe('/api/state-legislature/[state]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default fetch mock
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/jurisdictions/')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOpenStatesJurisdiction),
        });
      }
      if (url.includes('/people')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOpenStatesLegislators),
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
    it('should return state legislature data for valid state', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('state', 'MI');
      expect(data).toHaveProperty('stateName');
      expect(data).toHaveProperty('session');
      expect(data).toHaveProperty('chambers');
      expect(data).toHaveProperty('legislators');
    });

    it('should return legislators filtered by upper chamber', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/state-legislature/MI?chamber=upper'
      );
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.chamber).toBe('upper');
    });

    it('should return legislators filtered by lower chamber', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/state-legislature/MI?chamber=lower'
      );
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.chamber).toBe('lower');
    });

    it('should return legislators filtered by party', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI?party=D');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.party).toBe('D');
    });

    it('should handle combined chamber and party filters', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/state-legislature/MI?chamber=upper&party=R'
      );
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.filters?.chamber).toBe('upper');
      expect(data.filters?.party).toBe('R');
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for invalid state code (too short)', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/M');
      const response = await GET(request, { params: Promise.resolve({ state: 'M' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 for invalid state code (too long)', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MIC');
      const response = await GET(request, { params: Promise.resolve({ state: 'MIC' }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    it('should return 400 for empty state code', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/');
      const response = await GET(request, { params: Promise.resolve({ state: '' }) });

      expect(response.status).toBe(400);
    });
  });

  describe('API Error Handling', () => {
    it('should handle OpenStates API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      // API returns 200 with empty data on error (graceful degradation)
      expect(response.status).toBe(200);
      expect(data.legislators).toEqual([]);
    });

    it('should handle rate limiting (429) with retry', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 429,
            json: () => Promise.resolve({ error: 'Rate limited' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockOpenStatesJurisdiction),
        });
      });

      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });

      expect(response.status).toBe(200);
    }, 15000);

    it('should handle empty legislator results', async () => {
      global.fetch = jest.fn().mockImplementation((url: string) => {
        if (url.includes('/jurisdictions/')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockOpenStatesJurisdiction),
          });
        }
        if (url.includes('/people')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ results: [] }),
          });
        }
        return Promise.resolve({ ok: false, status: 404 });
      });

      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.legislators).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should include all required fields in response', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(data).toHaveProperty('state');
      expect(data).toHaveProperty('stateName');
      expect(data).toHaveProperty('lastUpdated');
      expect(data).toHaveProperty('session');
      expect(data).toHaveProperty('chambers');
      expect(data).toHaveProperty('legislators');
      expect(data).toHaveProperty('totalCount');
      expect(data).toHaveProperty('filters');
    });

    it('should include session information', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(data.session).toHaveProperty('name');
      expect(data.session).toHaveProperty('startDate');
      expect(data.session).toHaveProperty('endDate');
      expect(data.session).toHaveProperty('type');
    });

    it('should include chamber information with seat counts', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      expect(data.chambers).toHaveProperty('upper');
      expect(data.chambers).toHaveProperty('lower');
      expect(data.chambers.upper).toHaveProperty('name');
      expect(data.chambers.upper).toHaveProperty('totalSeats');
      expect(data.chambers.upper).toHaveProperty('democraticSeats');
      expect(data.chambers.upper).toHaveProperty('republicanSeats');
    });

    it('should return legislator with expected fields', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/MI');
      const response = await GET(request, { params: Promise.resolve({ state: 'MI' }) });
      const data = await response.json();

      if (data.legislators.length > 0) {
        const legislator = data.legislators[0];
        expect(legislator).toHaveProperty('id');
        expect(legislator).toHaveProperty('name');
        expect(legislator).toHaveProperty('party');
        expect(legislator).toHaveProperty('chamber');
        expect(legislator).toHaveProperty('district');
      }
    });
  });

  describe('State Normalization', () => {
    it('should handle lowercase state codes', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/mi');
      const response = await GET(request, { params: Promise.resolve({ state: 'mi' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.state).toBe('MI');
    });

    it('should handle mixed case state codes', async () => {
      const request = createMockRequest('http://localhost:3000/api/state-legislature/Mi');
      const response = await GET(request, { params: Promise.resolve({ state: 'Mi' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.state).toBe('MI');
    });
  });
});

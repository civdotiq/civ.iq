/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/leadership/route';
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

// Mock Congress.gov API response
const mockMembersResponse = {
  members: [
    {
      bioguideId: 'P000197',
      name: 'Nancy Pelosi',
      leadership: [
        {
          type: 'Speaker of the House',
          congress: 117,
        },
        {
          type: 'House Democratic Leader',
          congress: 119,
        },
      ],
    },
    {
      bioguideId: 'K000367',
      name: 'Amy Klobuchar',
      leadership: [],
    },
    {
      bioguideId: 'S000148',
      name: 'Chuck Schumer',
      leadership: [
        {
          type: 'Senate Majority Leader',
          congress: 119,
        },
      ],
    },
  ],
};

describe('/api/representative/[bioguideId]/leadership', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockMembersResponse),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Success Cases', () => {
    it('should return leadership positions for member with positions', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('leadership');
      expect(data.leadership.length).toBe(2);
    });

    it('should return empty leadership for member without positions', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leadership).toEqual([]);
    });

    it('should return Senate leadership for Senate leader', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/S000148/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'S000148' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leadership.length).toBe(1);
      expect(data.leadership[0].type).toBe('Senate Majority Leader');
    });

    it('should handle member not in response', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/NOTFOUND/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'NOTFOUND' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leadership).toEqual([]);
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative//leadership');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('BioguideId required');
    });
  });

  describe('Error Handling', () => {
    // Note: Tests for API key missing require mocking NextResponse constructor
    // which has compatibility issues with Jest. See integration tests.

    it('should handle empty members response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ members: [] }),
      });

      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.leadership).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should return leadership array', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      expect(data).toHaveProperty('leadership');
      expect(Array.isArray(data.leadership)).toBe(true);
    });

    it('should include leadership position details', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/P000197/leadership'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'P000197' }) });
      const data = await response.json();

      if (data.leadership.length > 0) {
        expect(data.leadership[0]).toHaveProperty('type');
        expect(data.leadership[0]).toHaveProperty('congress');
      }
    });
  });
});

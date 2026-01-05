/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { GET } from '@/app/api/representative/[bioguideId]/committees/route';
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
const mockCommitteesResponse = {
  member: {
    committees: [
      {
        name: 'Committee on the Judiciary',
        code: 'HSJU',
        chamber: 'House',
      },
      {
        name: 'Committee on Oversight and Reform',
        code: 'HSGO',
        chamber: 'House',
      },
    ],
  },
};

describe('/api/representative/[bioguideId]/committees', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, CONGRESS_API_KEY: 'test-api-key' };

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockCommitteesResponse),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Success Cases', () => {
    it('should return committees for valid bioguide ID', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/committees'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('committees');
      expect(Array.isArray(data.committees)).toBe(true);
    });

    it('should return committee details', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/committees'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data.committees.length).toBe(2);
      expect(data.committees[0]).toHaveProperty('name');
    });

    it('should handle various bioguide ID formats', async () => {
      const bioguideIds = ['K000367', 'P000197', 'S000148'];

      for (const bioguideId of bioguideIds) {
        const request = createMockRequest(
          `http://localhost:3000/api/representative/${bioguideId}/committees`
        );
        const response = await GET(request, { params: Promise.resolve({ bioguideId }) });

        expect(response.status).toBe(200);
      }
    });
  });

  describe('Validation Errors', () => {
    it('should return 400 for missing bioguide ID', async () => {
      const request = createMockRequest('http://localhost:3000/api/representative//committees');
      const response = await GET(request, { params: Promise.resolve({ bioguideId: '' }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('BioguideId required');
    });
  });

  describe('Error Handling', () => {
    // Note: Tests for API key missing and error handling require mocking NextResponse constructor
    // which has compatibility issues with Jest. These scenarios are tested in integration tests.
    // The route properly handles these cases by returning 500 status with error messages.

    it('should handle empty committees response', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ member: { committees: [] } }),
      });

      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/committees'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.committees).toEqual([]);
    });

    it('should handle missing committees field', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ member: {} }),
      });

      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/committees'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.committees).toEqual([]);
    });
  });

  describe('Response Structure', () => {
    it('should return committees array', async () => {
      const request = createMockRequest(
        'http://localhost:3000/api/representative/K000367/committees'
      );
      const response = await GET(request, { params: Promise.resolve({ bioguideId: 'K000367' }) });
      const data = await response.json();

      expect(data).toHaveProperty('committees');
      expect(Array.isArray(data.committees)).toBe(true);
    });
  });
});

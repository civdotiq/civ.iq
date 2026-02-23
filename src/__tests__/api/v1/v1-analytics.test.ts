/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * V1 Analytics Route Tests
 */

// Mock next/server — define classes inside factory (jest.mock is hoisted)
jest.mock('next/server', () => {
  class _NextResponse {
    status: number;
    headers: Headers;
    private body: unknown;

    constructor(body?: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
    }

    async json() {
      return this.body;
    }
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new _NextResponse(data, init);
    }
  }

  class _NextRequest {
    url: string;
    method: string;
    headers: Headers;
    nextUrl: URL;

    constructor(
      urlInput: string | URL,
      init?: { method?: string; headers?: Record<string, string> }
    ) {
      this.url = typeof urlInput === 'string' ? urlInput : urlInput.toString();
      this.method = init?.method ?? 'GET';
      this.headers = new Headers(init?.headers);
      this.nextUrl = new URL(this.url);
    }
  }

  return { NextResponse: _NextResponse, NextRequest: _NextRequest };
});

import type { NextRequest } from 'next/server';

// Mock request-counter
jest.mock('@/lib/analytics/request-counter', () => ({
  getRequestCounts: jest.fn().mockResolvedValue({
    '/api/v1/representatives': 100,
    '/api/v1/bills': 50,
  }),
}));

jest.mock('@/lib/api/v1-versioning', () => ({
  addVersionHeaders: jest.fn(),
}));

import { GET } from '@/app/api/v1/analytics/route';

function makeRequest(url: string, headers: Record<string, string> = {}): NextRequest {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest: NR } = require('next/server');
  return new NR(new URL(url, 'http://localhost:3000').toString(), { headers }) as NextRequest;
}

describe('GET /api/v1/analytics', () => {
  const originalEnv = process.env.CACHE_WARM_SECRET;

  afterEach(() => {
    process.env.CACHE_WARM_SECRET = originalEnv;
  });

  describe('authentication', () => {
    it('should return 503 when CACHE_WARM_SECRET is not set', async () => {
      delete process.env.CACHE_WARM_SECRET;
      const response = await GET(makeRequest('https://civ.iq/api/v1/analytics'));
      expect(response.status).toBe(503);
    });

    it('should return 401 when Authorization header is missing', async () => {
      process.env.CACHE_WARM_SECRET = 'test-secret';
      const response = await GET(makeRequest('https://civ.iq/api/v1/analytics'));
      expect(response.status).toBe(401);
    });

    it('should return 401 when Authorization header is wrong', async () => {
      process.env.CACHE_WARM_SECRET = 'test-secret';
      const response = await GET(
        makeRequest('https://civ.iq/api/v1/analytics', {
          authorization: 'Bearer wrong-secret',
        })
      );
      expect(response.status).toBe(401);
    });

    it('should return 200 with correct Authorization header', async () => {
      process.env.CACHE_WARM_SECRET = 'test-secret';
      const response = await GET(
        makeRequest('https://civ.iq/api/v1/analytics', {
          authorization: 'Bearer test-secret',
        })
      );
      expect(response.status).toBe(200);
    });
  });

  describe('response shape', () => {
    beforeEach(() => {
      process.env.CACHE_WARM_SECRET = 'test-secret';
    });

    function authRequest(url: string): NextRequest {
      return makeRequest(url, { authorization: 'Bearer test-secret' });
    }

    it('should return data with dateRange, totalRequests, endpointCount, endpoints', async () => {
      const response = await GET(authRequest('https://civ.iq/api/v1/analytics'));
      const body = await response.json();
      expect(body.data).toHaveProperty('dateRange');
      expect(body.data).toHaveProperty('totalRequests');
      expect(body.data).toHaveProperty('endpointCount');
      expect(body.data).toHaveProperty('endpoints');
    });

    it('should return correct totals from mocked data', async () => {
      const response = await GET(authRequest('https://civ.iq/api/v1/analytics'));
      const body = await response.json();
      expect(body.data.totalRequests).toBe(150);
      expect(body.data.endpointCount).toBe(2);
    });

    it('should include meta with apiVersion', async () => {
      const response = await GET(authRequest('https://civ.iq/api/v1/analytics'));
      const body = await response.json();
      expect(body.meta.apiVersion).toBe('1.0.0');
    });

    it('should set Cache-Control to no-store', async () => {
      const response = await GET(authRequest('https://civ.iq/api/v1/analytics'));
      expect(response.headers.get('Cache-Control')).toBe('no-store');
    });
  });

  describe('date validation', () => {
    beforeEach(() => {
      process.env.CACHE_WARM_SECRET = 'test-secret';
    });

    it('should accept valid date params', async () => {
      const response = await GET(
        makeRequest('https://civ.iq/api/v1/analytics?start=2025-01-01&end=2025-01-07', {
          authorization: 'Bearer test-secret',
        })
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.data.dateRange.start).toBe('2025-01-01');
      expect(body.data.dateRange.end).toBe('2025-01-07');
    });

    it('should reject invalid date format', async () => {
      const response = await GET(
        makeRequest('https://civ.iq/api/v1/analytics?start=Jan-01-2025', {
          authorization: 'Bearer test-secret',
        })
      );
      expect(response.status).toBe(400);
    });
  });
});

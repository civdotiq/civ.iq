/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Cache infrastructure route auth tests
 *
 * The mutating cache endpoints (invalidate, refresh, status POST) must
 * reject unauthenticated requests: an open invalidate endpoint lets anyone
 * purge Redis and stampede upstream government APIs.
 */

import { NextRequest } from 'next/server';
import { verifyAdminAccess } from '@/lib/security/admin-auth';

jest.mock('@/services/cache', () => ({
  unifiedCache: { invalidatePattern: jest.fn().mockResolvedValue({ redis: 0, fallback: 0 }) },
  govCache: { getStats: jest.fn(), clear: jest.fn(), cleanup: jest.fn() },
}));

const ADMIN_KEY = 'test-admin-key-12345';

// jsdom's NextRequest polyfill has non-functional Headers, so the routes get
// a minimal stub carrying exactly what they read: url, headers, json body.
function makeRequest(url: string, token?: string): NextRequest {
  return {
    url,
    nextUrl: new URL(url),
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'authorization' && token ? `Bearer ${token}` : null,
    },
    json: async () => ({ pattern: 'insight:', action: 'cleanup' }),
  } as unknown as NextRequest;
}

describe('verifyAdminAccess', () => {
  const originalKey = process.env.ADMIN_API_KEY;

  afterEach(() => {
    process.env.ADMIN_API_KEY = originalKey;
  });

  it('rejects when ADMIN_API_KEY is not configured (fail closed)', () => {
    delete process.env.ADMIN_API_KEY;
    const req = makeRequest('http://localhost:3000/api/cache/invalidate', 'anything');
    expect(verifyAdminAccess(req)).toBe(false);
  });

  it('rejects a missing Authorization header', () => {
    process.env.ADMIN_API_KEY = ADMIN_KEY;
    const req = makeRequest('http://localhost:3000/api/cache/invalidate');
    expect(verifyAdminAccess(req)).toBe(false);
  });

  it('rejects a wrong token', () => {
    process.env.ADMIN_API_KEY = ADMIN_KEY;
    const req = makeRequest('http://localhost:3000/api/cache/invalidate', 'wrong-token');
    expect(verifyAdminAccess(req)).toBe(false);
  });

  it('accepts the correct token', () => {
    process.env.ADMIN_API_KEY = ADMIN_KEY;
    const req = makeRequest('http://localhost:3000/api/cache/invalidate', ADMIN_KEY);
    expect(verifyAdminAccess(req)).toBe(true);
  });
});

describe('cache route POST handlers require admin auth', () => {
  beforeEach(() => {
    process.env.ADMIN_API_KEY = ADMIN_KEY;
  });

  it('POST /api/cache/invalidate returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/cache/invalidate/route');
    const res = await POST(makeRequest('http://localhost:3000/api/cache/invalidate'));
    expect(res.status).toBe(401);
  });

  it('POST /api/cache/invalidate proceeds with valid auth', async () => {
    const { POST } = await import('@/app/api/cache/invalidate/route');
    const res = await POST(makeRequest('http://localhost:3000/api/cache/invalidate', ADMIN_KEY));
    expect(res.status).toBe(200);
  });

  it('POST /api/cache/refresh returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/cache/refresh/route');
    const res = await POST(makeRequest('http://localhost:3000/api/cache/refresh?type=quick'));
    expect(res.status).toBe(401);
  });

  it('POST /api/cache/status returns 401 without auth', async () => {
    const { POST } = await import('@/app/api/cache/status/route');
    const res = await POST(makeRequest('http://localhost:3000/api/cache/status'));
    expect(res.status).toBe(401);
  });

  it('POST /api/cache/status proceeds with valid auth', async () => {
    const { POST } = await import('@/app/api/cache/status/route');
    const res = await POST(makeRequest('http://localhost:3000/api/cache/status', ADMIN_KEY));
    expect(res.status).toBe(200);
  });
});

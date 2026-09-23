/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the warm-member-bills cron route: auth, cursor advance and wrap,
 * and stopping the slice at the first upstream failure so live traffic keeps
 * the Congress.gov budget.
 */

// Override the global next/server mock — we need a real Headers object so the
// route's `request.headers.get('authorization')` works correctly.
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

const mockGetAllReps = jest.fn();
const mockWarm = jest.fn();

const cursorStore: { value: number | string | null } = { value: null };
const mockRedisGet = jest.fn(async () => cursorStore.value);
const mockRedisSet = jest.fn(async (_key: string, value: number) => {
  cursorStore.value = value;
  return true;
});

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({ get: mockRedisGet, set: mockRedisSet }),
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: () => mockGetAllReps(),
}));

jest.mock('@/services/congress/optimized-congress.service', () => ({
  warmComprehensiveBillsByMember: (id: string) => mockWarm(id),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/warm-member-bills/route';

const TEST_SECRET = 'test-cron-secret';
const ORIGINAL_SECRET = process.env.CRON_SECRET;
const ORIGINAL_SLICE = process.env.WARM_MEMBER_BILLS_SLICE_SIZE;

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest: NR } = require('next/server');
  return new NR('http://localhost:3000/api/cron/warm-member-bills', { headers }) as NextRequest;
}

function fakeReps(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    bioguideId: `B${String(i).padStart(3, '0')}`,
    name: `Rep ${i}`,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  cursorStore.value = null;
  process.env.CRON_SECRET = TEST_SECRET;
  process.env.WARM_MEMBER_BILLS_SLICE_SIZE = '10';
  mockWarm.mockResolvedValue('refreshed');
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_SLICE === undefined) delete process.env.WARM_MEMBER_BILLS_SLICE_SIZE;
  else process.env.WARM_MEMBER_BILLS_SLICE_SIZE = ORIGINAL_SLICE;
});

describe('GET /api/cron/warm-member-bills', () => {
  it('returns 401 without the cron secret', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(5));
    const res = await GET(makeRequest('Bearer not-the-secret'));
    expect(res.status).toBe(401);
    expect(mockWarm).not.toHaveBeenCalled();
  });

  it('warms one slice per call and wraps the cursor', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(15));

    const body1 = await (await GET(makeRequest(`Bearer ${TEST_SECRET}`))).json();
    expect(body1.attempted).toBe(10);
    expect(body1.nextCursor).toBe(10);

    mockWarm.mockClear();
    const body2 = await (await GET(makeRequest(`Bearer ${TEST_SECRET}`))).json();
    expect(body2.slice).toEqual([10, 5]);
    expect(mockWarm.mock.calls.map(c => c[0])).toEqual([
      'B010',
      'B011',
      'B012',
      'B013',
      'B014',
      'B000',
      'B001',
      'B002',
      'B003',
      'B004',
    ]);
  });

  it('stops at the first upstream failure and resumes from the failed member', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(15));
    mockWarm
      .mockResolvedValueOnce('fresh')
      .mockResolvedValueOnce('refreshed')
      .mockRejectedValueOnce(new Error('sponsoredLegislation API error: 429'));

    const res = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockWarm).toHaveBeenCalledTimes(3);
    expect(body).toMatchObject({ attempted: 3, fresh: 1, refreshed: 1, errors: 1 });
    // The failed member was attempted; the next run starts after it.
    expect(body.nextCursor).toBe(3);
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the warm-intelligence cron route.
 *
 * Covers:
 *   - 401 on missing/wrong Authorization header
 *   - Cursor advance + wrap-around across consecutive invocations
 *   - Error isolation (one analyzer throwing does not block the other three)
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
const mockAnalyzeFinanceJurisdiction = jest.fn();
const mockAnalyzeVoteFinance = jest.fn();
const mockAnalyzeVotePrediction = jest.fn();
const mockAnalyzeInfluenceChains = jest.fn();

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

jest.mock('@/lib/intelligence/analyzers/finance-jurisdiction-analyzer', () => ({
  analyzeFinanceJurisdiction: (id: string) => mockAnalyzeFinanceJurisdiction(id),
}));

jest.mock('@/lib/intelligence/analyzers/vote-finance-analyzer', () => ({
  analyzeVoteFinance: (id: string) => mockAnalyzeVoteFinance(id),
}));

jest.mock('@/lib/intelligence/analyzers/vote-prediction-analyzer', () => ({
  analyzeVotePrediction: (id: string) => mockAnalyzeVotePrediction(id),
}));

jest.mock('@/lib/intelligence/analyzers/influence-chain-analyzer', () => ({
  analyzeInfluenceChains: (id: string) => mockAnalyzeInfluenceChains(id),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/cron/warm-intelligence/route';

const TEST_SECRET = 'test-cron-secret';
const ORIGINAL_SECRET = process.env.CRON_SECRET;
const ORIGINAL_SLICE = process.env.WARM_INTEL_SLICE_SIZE;

function makeRequest(authHeader?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (authHeader !== undefined) headers.authorization = authHeader;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { NextRequest: NR } = require('next/server');
  return new NR('http://localhost:3000/api/cron/warm-intelligence', { headers }) as NextRequest;
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
  process.env.WARM_INTEL_SLICE_SIZE = '10';
  mockAnalyzeFinanceJurisdiction.mockResolvedValue(null);
  mockAnalyzeVoteFinance.mockResolvedValue(null);
  mockAnalyzeVotePrediction.mockResolvedValue(null);
  mockAnalyzeInfluenceChains.mockResolvedValue(null);
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_SLICE === undefined) delete process.env.WARM_INTEL_SLICE_SIZE;
  else process.env.WARM_INTEL_SLICE_SIZE = ORIGINAL_SLICE;
});

describe('GET /api/cron/warm-intelligence — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(5));
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockGetAllReps).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header is wrong', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(5));
    const res = await GET(makeRequest('Bearer not-the-secret'));
    expect(res.status).toBe(401);
    expect(mockGetAllReps).not.toHaveBeenCalled();
  });

  it('returns 401 when CRON_SECRET is unset on the server', async () => {
    delete process.env.CRON_SECRET;
    mockGetAllReps.mockResolvedValue(fakeReps(5));
    const res = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    expect(res.status).toBe(401);
  });
});

describe('GET /api/cron/warm-intelligence — slicing & cursor', () => {
  it('advances the cursor and wraps across three consecutive invocations', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(25));

    const callsPerInvocation: string[][] = [];
    const collect = () => {
      const ids = mockAnalyzeFinanceJurisdiction.mock.calls.map(c => c[0] as string);
      mockAnalyzeFinanceJurisdiction.mockClear();
      mockAnalyzeVoteFinance.mockClear();
      mockAnalyzeVotePrediction.mockClear();
      mockAnalyzeInfluenceChains.mockClear();
      callsPerInvocation.push(ids);
    };

    const res1 = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body1 = await res1.json();
    collect();
    expect(res1.status).toBe(200);
    expect(body1.slice).toEqual([0, 10]);
    expect(body1.nextCursor).toBe(10);

    const res2 = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body2 = await res2.json();
    collect();
    expect(res2.status).toBe(200);
    expect(body2.slice).toEqual([10, 20]);
    expect(body2.nextCursor).toBe(20);

    const res3 = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body3 = await res3.json();
    collect();
    expect(res3.status).toBe(200);
    // Slice spans 20–24 then wraps to 0–4. Wraparound nextCursor = 5.
    expect(body3.slice).toEqual([20, 5]);
    expect(body3.nextCursor).toBe(5);

    expect(callsPerInvocation[0]).toEqual(fakeReps(10).map(r => r.bioguideId));
    expect(callsPerInvocation[1]).toEqual(
      fakeReps(25)
        .slice(10, 20)
        .map(r => r.bioguideId)
    );
    expect(callsPerInvocation[2]).toEqual([
      ...fakeReps(25)
        .slice(20, 25)
        .map(r => r.bioguideId),
      ...fakeReps(5).map(r => r.bioguideId),
    ]);
  });
});

describe('GET /api/cron/warm-intelligence — error isolation', () => {
  it('one analyzer throwing does not stop the other three for the same rep', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(1));
    mockAnalyzeVoteFinance.mockRejectedValue(new Error('boom'));

    const res = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockAnalyzeFinanceJurisdiction).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeVoteFinance).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeVotePrediction).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeInfluenceChains).toHaveBeenCalledTimes(1);

    expect(body.ok).toBe(3);
    expect(body.errors).toBe(1);
    expect(body.perAnalyzer.vote_finance.error).toBe(1);
    expect(body.perAnalyzer.finance_jurisdiction.ok).toBe(1);
    expect(body.perAnalyzer.vote_prediction.ok).toBe(1);
    expect(body.perAnalyzer.influence_chain.ok).toBe(1);
  });
});

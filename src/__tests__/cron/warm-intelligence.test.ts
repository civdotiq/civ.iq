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

const mockGetAllReps = jest.fn();
const mockAnalyzeFinanceJurisdiction = jest.fn();
const mockAnalyzeVoteFinance = jest.fn();
const mockAnalyzeInfluenceChains = jest.fn();
const mockAssembleCivicBrief = jest.fn();

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

jest.mock('@/lib/intelligence/analyzers/influence-chain-analyzer', () => ({
  analyzeInfluenceChains: (id: string) => mockAnalyzeInfluenceChains(id),
}));

jest.mock('@/lib/intelligence/analyzers/civic-brief-assembler', () => ({
  assembleCivicBrief: (id: string, opts: unknown) => mockAssembleCivicBrief(id, opts),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { fakeReps, makeCronRequest } from './cron-test-helpers';
import { GET } from '@/app/api/cron/warm-intelligence/route';

const TEST_SECRET = 'test-cron-secret';
const ORIGINAL_SECRET = process.env.CRON_SECRET;
const ORIGINAL_SLICE = process.env.WARM_INTEL_SLICE_SIZE;

const makeRequest = (authHeader?: string) =>
  makeCronRequest('/api/cron/warm-intelligence', authHeader);

beforeEach(() => {
  jest.clearAllMocks();
  cursorStore.value = null;
  process.env.CRON_SECRET = TEST_SECRET;
  process.env.WARM_INTEL_SLICE_SIZE = '10';
  mockAnalyzeFinanceJurisdiction.mockResolvedValue(null);
  mockAnalyzeVoteFinance.mockResolvedValue(null);
  mockAnalyzeInfluenceChains.mockResolvedValue(null);
  mockAssembleCivicBrief.mockResolvedValue(null);
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
  it('one analyzer throwing does not stop the other two for the same rep', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(1));
    mockAnalyzeVoteFinance.mockRejectedValue(new Error('boom'));

    const res = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockAnalyzeFinanceJurisdiction).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeVoteFinance).toHaveBeenCalledTimes(1);
    expect(mockAnalyzeInfluenceChains).toHaveBeenCalledTimes(1);

    expect(body.ok).toBe(3);
    expect(body.errors).toBe(1);
    expect(body.perAnalyzer.vote_finance.error).toBe(1);
    expect(body.perAnalyzer.finance_jurisdiction.ok).toBe(1);
    expect(body.perAnalyzer.influence_chain.ok).toBe(1);
  });
});

describe('GET /api/cron/warm-intelligence — civic brief', () => {
  it('refreshes the brief after the three analyzers finish', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(1));
    const order: string[] = [];
    mockAnalyzeFinanceJurisdiction.mockImplementation(async () => {
      order.push('finance_jurisdiction');
      return null;
    });
    mockAnalyzeInfluenceChains.mockImplementation(async () => {
      order.push('influence_chain');
      return null;
    });
    mockAssembleCivicBrief.mockImplementation(async () => {
      order.push('civic_brief');
      return null;
    });

    const res = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
    const body = await res.json();

    expect(mockAssembleCivicBrief).toHaveBeenCalledWith(expect.any(String), { refresh: true });
    // The brief reads these two analyzers' caches, so it must run last.
    expect(order[order.length - 1]).toBe('civic_brief');
    expect(body.perAnalyzer.civic_brief.ok).toBe(1);
  });

  it('skips the brief once the invocation passes its deadline', async () => {
    mockGetAllReps.mockResolvedValue(fakeReps(1));
    const realNow = Date.now;
    const t0 = realNow();
    let calls = 0;
    // First read is the invocation start; every later read is 4 minutes on.
    jest.spyOn(Date, 'now').mockImplementation(() => (calls++ === 0 ? t0 : t0 + 240_000));
    try {
      const res = await GET(makeRequest(`Bearer ${TEST_SECRET}`));
      const body = await res.json();
      expect(mockAssembleCivicBrief).not.toHaveBeenCalled();
      expect(body.perAnalyzer.civic_brief.skipped).toBe(1);
      expect(body.errors).toBe(0);
    } finally {
      jest.restoreAllMocks();
    }
  });
});

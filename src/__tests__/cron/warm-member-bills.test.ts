/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the warm-member-bills cron route: auth, cursor advance and wrap,
 * and stopping the slice at the first upstream failure so live traffic keeps
 * the Congress.gov budget.
 */

// The global next/server mock lacks real Headers; use the cron test classes.
jest.mock('next/server', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('./cron-test-helpers').nextServerMock()
);

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

import { fakeReps, makeCronRequest } from './cron-test-helpers';
import { GET } from '@/app/api/cron/warm-member-bills/route';

const TEST_SECRET = 'test-cron-secret';
const ORIGINAL_SECRET = process.env.CRON_SECRET;
const ORIGINAL_SLICE = process.env.WARM_MEMBER_BILLS_SLICE_SIZE;

const makeRequest = (authHeader?: string) =>
  makeCronRequest('/api/cron/warm-member-bills', authHeader);

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

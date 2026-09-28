/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the warm-record-money cron route: every FEC call runs at cron
 * priority, incomplete results don't stop the slice, and the first FEC
 * failure does.
 */

const mockGetAllReps = jest.fn();
const mockWarm = jest.fn();

let storedCursor = 0;
jest.mock('@/lib/cron/cursor', () => ({
  readCronCursor: async (_key: string, length: number) => storedCursor % length,
  writeCronCursor: async (_key: string, cursor: number) => {
    storedCursor = cursor;
  },
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getAllEnhancedRepresentatives: () => mockGetAllReps(),
}));

jest.mock('@/features/record-card/record-card-data', () => ({
  warmRecordCardMoney: (id: string, state: string) => mockWarm(id, state),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { fakeReps, makeCronRequest } from './cron-test-helpers';
import { GET } from '@/app/api/cron/warm-record-money/route';
import { getFecPriority } from '@/lib/fec/fec-rate-limiter';

const TEST_SECRET = 'test-cron-secret';
const ORIGINAL_SECRET = process.env.CRON_SECRET;

const makeRequest = (authHeader?: string) =>
  makeCronRequest('/api/cron/warm-record-money', authHeader);

beforeEach(() => {
  jest.clearAllMocks();
  storedCursor = 0;
  process.env.CRON_SECRET = TEST_SECRET;
  mockGetAllReps.mockResolvedValue(fakeReps(30));
  mockWarm.mockResolvedValue('refreshed');
});

afterAll(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe('GET /api/cron/warm-record-money', () => {
  it('returns 401 without the cron secret', async () => {
    const res = await GET(makeRequest('Bearer nope'));
    expect(res.status).toBe(401);
    expect(mockWarm).not.toHaveBeenCalled();
  });

  it('warms at cron FEC priority, 20 members per slice', async () => {
    const priorities: string[] = [];
    mockWarm.mockImplementation(async () => {
      priorities.push(getFecPriority());
      return 'refreshed';
    });

    const body = await (await GET(makeRequest(`Bearer ${TEST_SECRET}`))).json();
    expect(body).toMatchObject({ attempted: 20, refreshed: 20, nextCursor: 20 });
    expect(new Set(priorities)).toEqual(new Set(['cron']));
  });

  it('continues past incomplete results and stops at the first FEC failure', async () => {
    mockWarm
      .mockResolvedValueOnce('incomplete')
      .mockResolvedValueOnce('none')
      .mockRejectedValueOnce(new Error('FEC API error: 429'));

    const body = await (await GET(makeRequest(`Bearer ${TEST_SECRET}`))).json();
    expect(mockWarm).toHaveBeenCalledTimes(3);
    expect(body).toMatchObject({ attempted: 3, incomplete: 1, none: 1, errors: 1, nextCursor: 3 });
  });
});

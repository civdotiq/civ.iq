/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Record Card money section: a failed FEC call must read as "unavailable",
 * never as "no filings"; only answered results are cached; a cached copy
 * spares the FEC entirely.
 */

const cacheStore = new Map<string, unknown>();
const mockAggregate = jest.fn();
const mockBySize = jest.fn();

jest.mock('@/services/cache/unified-cache.service', () => ({
  cachedStaleWhileRevalidate: async (key: string, fetcher: () => Promise<unknown>) => {
    if (cacheStore.has(key)) return { data: cacheStore.get(key), state: 'fresh', fetchedAt: 0 };
    const data = await fetcher();
    cacheStore.set(key, data);
    return { data, state: 'miss', fetchedAt: 0 };
  },
  refreshStaleWhileRevalidate: async (key: string, fetcher: () => Promise<unknown>) => {
    if (cacheStore.has(key)) return 'fresh';
    cacheStore.set(key, await fetcher());
    return 'refreshed';
  },
}));

jest.mock('@/lib/fec/finance-aggregator', () => ({
  aggregateFinanceDataFromAggregates: (...args: unknown[]) => mockAggregate(...args),
}));

jest.mock('@/lib/fec/fec-api-service', () => ({
  fecApiService: {
    getContributionsBySize: (...args: unknown[]) => mockBySize(...args),
    getCandidateInfo: jest.fn(),
  },
}));

jest.mock('@/lib/api/finance-helpers', () => ({
  validateFECMapping: (id: string) =>
    id === 'NOFEC1'
      ? { success: false }
      : { success: true, mapping: { fecId: 'S8WA00194', bioguideId: id } },
}));

jest.mock('@/features/representatives/services/congress.service', () => ({
  getEnhancedRepresentative: async (id: string) => ({
    bioguideId: id,
    name: 'Test Senator',
    party: 'Democratic',
    state: 'WA',
    chamber: 'Senate',
    terms: [],
    committees: [],
  }),
}));

jest.mock('@/features/representatives/services/batch-voting-service', () => ({
  batchVotingService: {
    getHouseMemberVotes: async () => [],
    getSenateMemberVotes: async () => [],
  },
}));

jest.mock('@/lib/intelligence/analyzers/chamber-baselines', () => ({
  getChamberBaselines: async () => null,
}));

jest.mock('@/features/record-card/legislation-rollup', () => ({
  getLegislationRollup: async () => null,
}));

jest.mock('@/lib/services/spending.service', () => ({
  getDistrictSpending: jest.fn(),
  getStateSpendingTotal: async () => null,
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import { getRecordCardData, warmRecordCardMoney } from '@/features/record-card/record-card-data';

function finance(overrides: Record<string, unknown> = {}) {
  return {
    totalRaised: 1_000_000,
    individualContributions: 800_000,
    pacContributions: 150_000,
    geographicBreakdown: [{ state: 'WA', percentage: 60, isHomeState: true }],
    industryBreakdown: [{ industry: 'Technology', amount: 90_000 }],
    lastUpdated: '2026-09-23T00:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  cacheStore.clear();
  mockAggregate.mockReset().mockResolvedValue(finance());
  mockBySize.mockReset().mockResolvedValue([{ size: 0, total: 200_000, count: 5000 }]);
});

describe('Record Card money section', () => {
  test('FEC answers with receipts → ok, with shares of the total', async () => {
    const data = await getRecordCardData('C000127');
    expect(data?.moneyStatus).toBe('ok');
    expect(data?.money).toMatchObject({
      totalRaised: 1_000_000,
      smallDonorPct: 20,
      pacPct: 15,
      inStatePct: 60,
      fecCandidateId: 'S8WA00194',
    });
  });

  test('FEC reports no receipts → none', async () => {
    mockAggregate.mockResolvedValue(null);
    const data = await getRecordCardData('C000127');
    expect(data?.moneyStatus).toBe('none');
    expect(data?.money).toBeNull();
  });

  test('no FEC mapping → none, without calling the FEC', async () => {
    const data = await getRecordCardData('NOFEC1');
    expect(data?.moneyStatus).toBe('none');
    expect(mockAggregate).not.toHaveBeenCalled();
  });

  test('FEC 429 → unavailable, and nothing is cached', async () => {
    mockAggregate.mockRejectedValue(new Error('FEC API error: 429 Too Many Requests'));
    const data = await getRecordCardData('C000127');
    expect(data?.moneyStatus).toBe('unavailable');
    expect(data?.money).toBeNull();
    expect(cacheStore.size).toBe(0);
  });

  test('a cached copy is served without FEC calls', async () => {
    await getRecordCardData('C000127');
    mockAggregate.mockClear();
    mockBySize.mockClear();

    const data = await getRecordCardData('C000127');
    expect(data?.moneyStatus).toBe('ok');
    expect(mockAggregate).not.toHaveBeenCalled();
    expect(mockBySize).not.toHaveBeenCalled();
  });

  test('empty breakdowns (throttled) → rendered but not cached', async () => {
    mockBySize.mockResolvedValue([]);
    const data = await getRecordCardData('C000127');
    expect(data?.moneyStatus).toBe('ok');
    expect(data?.money?.totalRaised).toBe(1_000_000);
    expect(data?.money?.smallDonorPct).toBeNull();
    expect(cacheStore.size).toBe(0);
  });
});

describe('warmRecordCardMoney', () => {
  test('refreshes, then reports fresh', async () => {
    await expect(warmRecordCardMoney('C000127', 'WA')).resolves.toBe('refreshed');
    await expect(warmRecordCardMoney('C000127', 'WA')).resolves.toBe('fresh');
  });

  test('throws on FEC errors so the cron stops its slice', async () => {
    mockAggregate.mockRejectedValue(new Error('429'));
    await expect(warmRecordCardMoney('C000127', 'WA')).rejects.toThrow('429');
  });

  test('reports incomplete results without caching them', async () => {
    mockBySize.mockResolvedValue([]);
    await expect(warmRecordCardMoney('C000127', 'WA')).resolves.toBe('incomplete');
    expect(cacheStore.size).toBe(0);
  });
});

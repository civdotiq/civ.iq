/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The daily-quota flag used to live only in the state-legislature route, so
 * the shared client (state committee pages) kept retrying a 1000/day 429 three
 * times per call — each retry another rejected request that still counts.
 * These tests pin the shared behaviour: one call, flag until 00:00 UTC, no
 * further calls, and committee pages answer "unavailable" rather than 404.
 */

import { OpenStatesAPI, OpenStatesQuotaExhaustedError, openStatesAPI } from '@/lib/openstates-api';
import { lookupStateCommittee } from '@/lib/state-committee-lookup';
import { OPENSTATES_QUOTA_FLAG, secondsUntilUtcMidnight } from '@/lib/openstates-quota';

const store = new Map<string, unknown>();
const setSpy = jest.fn();

jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn(async (key: string) => store.get(key) ?? null),
    set: jest.fn(async (key: string, value: unknown, ttl: number) => {
      setSpy(key, value, ttl);
      store.set(key, value);
      return true;
    }),
  },
}));

// These tests pin the live-API fallback; the committed committee corpus
// would otherwise answer first.
jest.mock('@/lib/data-sources/openstates-people/load-committees', () => ({
  getJurisdictionCommittees: jest.fn(async () => null),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const DAILY_429 = {
  ok: false,
  status: 429,
  statusText: 'Too Many Requests',
  text: async () => '{"detail":"exceeded limit of 1000/day: 5264"}',
};
const MINUTE_429 = {
  ok: false,
  status: 429,
  statusText: 'Too Many Requests',
  text: async () => '{"detail":"exceeded limit of 40/minute"}',
};
const EMPTY_PAGE = {
  ok: true,
  status: 200,
  json: async () => ({
    results: [],
    pagination: { per_page: 20, page: 1, max_page: 1, total_items: 0 },
  }),
};

const ORG_ID = 'ocd-organization/7120f672-fb5b-44ad-86a1-6d94e52b8d17';
const ENCODED_ID = Buffer.from(ORG_ID).toString('base64url');

describe('OpenStates daily-quota flag in the shared client', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    store.clear();
    setSpy.mockClear();
    openStatesAPI.clearCache();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
  });

  it('does not retry a daily-quota 429 and sets the flag until 00:00 UTC', async () => {
    const fetchMock = jest.fn().mockResolvedValue(DAILY_429);
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(openStatesAPI.getCommittees('mi')).rejects.toBeInstanceOf(
      OpenStatesQuotaExhaustedError
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setSpy).toHaveBeenCalledWith(OPENSTATES_QUOTA_FLAG, true, expect.any(Number));
    const ttl = setSpy.mock.calls[0]?.[2] as number;
    expect(ttl).toBeGreaterThanOrEqual(60);
    expect(ttl).toBeLessThanOrEqual(86400);
  });

  it('makes no OpenStates call while the flag is set', async () => {
    store.set(OPENSTATES_QUOTA_FLAG, true);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(openStatesAPI.getCommittees('mi')).rejects.toBeInstanceOf(
      OpenStatesQuotaExhaustedError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('still retries a per-minute 429 and does not set the flag', async () => {
    jest.useFakeTimers();
    const client = new OpenStatesAPI({ retryAttempts: 2 });
    const fetchMock = jest.fn().mockResolvedValueOnce(MINUTE_429).mockResolvedValue(EMPTY_PAGE);
    global.fetch = fetchMock as unknown as typeof fetch;

    const pending = client.getCommittees('mi');
    await jest.advanceTimersByTimeAsync(5000);

    await expect(pending).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('committee detail answers "unavailable", not "not_found", on a daily-quota 429', async () => {
    global.fetch = jest.fn().mockResolvedValue(DAILY_429) as unknown as typeof fetch;

    await expect(lookupStateCommittee('mi', ENCODED_ID)).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('committee detail answers "unavailable" while the flag is set', async () => {
    store.set(OPENSTATES_QUOTA_FLAG, true);
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await expect(lookupStateCommittee('mi', ENCODED_ID)).resolves.toEqual({
      status: 'unavailable',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('secondsUntilUtcMidnight', () => {
  it('counts down to the next 00:00 UTC', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-09-23T23:00:00Z'))).toBe(3600);
  });

  it('never returns less than a minute', () => {
    expect(secondsUntilUtcMidnight(new Date('2026-09-23T23:59:59Z'))).toBe(60);
  });
});

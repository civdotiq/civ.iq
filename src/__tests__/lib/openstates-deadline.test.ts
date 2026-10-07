/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Paged OpenStates reads serve /api routes capped at 20s. They used to allow
 * 30s per attempt and three attempts per page, so a stalled OpenStates hung
 * the calendar and legislator-bills routes into 504s (2026-10-06/07: MN, WI,
 * CA). These tests pin the shared budget: a stall throws OpenStatesTimeoutError
 * inside it, without retrying, and routes map that to a 503 nothing caches.
 */

import {
  OPENSTATES_ROUTE_BUDGET_MS,
  OpenStatesAPI,
  OpenStatesQuotaExhaustedError,
  OpenStatesTimeoutError,
  openStatesUnavailableInit,
} from '@/lib/openstates-api';

jest.mock('@/lib/cache', () => ({
  cache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

/** A fetch that never answers; it only rejects when its signal aborts. */
function stalledResponse(_url: string, init?: RequestInit): Promise<never> {
  return new Promise((_, reject) => {
    init?.signal?.addEventListener('abort', () =>
      reject(new DOMException('The operation was aborted.', 'AbortError'))
    );
  });
}

function pageOf(page: number, maxPage: number) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: [{ id: `ocd-event/${page}`, name: `Event ${page}` }],
      pagination: { per_page: 20, page, max_page: maxPage, total_items: maxPage * 20 },
    }),
  };
}

describe('paged OpenStates reads share one route budget', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('throws OpenStatesTimeoutError inside the budget instead of retrying a stall', async () => {
    const fetchMock = jest.fn(stalledResponse);
    global.fetch = fetchMock as unknown as typeof fetch;
    const api = new OpenStatesAPI({ apiKey: 'test' });

    const result = api.getEvents('ca', undefined, undefined, 5);
    const settled = expect(result).rejects.toBeInstanceOf(OpenStatesTimeoutError);
    await jest.advanceTimersByTimeAsync(OPENSTATES_ROUTE_BUDGET_MS);
    await settled;

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('fails the whole read when a later page stalls, never returning a partial list', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(pageOf(1, 3))
      .mockImplementation(stalledResponse);
    global.fetch = fetchMock as unknown as typeof fetch;
    const api = new OpenStatesAPI({ apiKey: 'test' });

    const result = api.getBillsBySponsor('ocd-person/deadline-test', 'ca', undefined, 50);
    const settled = expect(result).rejects.toBeInstanceOf(OpenStatesTimeoutError);
    await jest.advanceTimersByTimeAsync(OPENSTATES_ROUTE_BUDGET_MS);
    await settled;

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('honours a caller budget longer than the default', async () => {
    const fetchMock = jest.fn(stalledResponse);
    global.fetch = fetchMock as unknown as typeof fetch;
    const api = new OpenStatesAPI({ apiKey: 'test' });

    let rejected = false;
    const result = api
      .getBillsBySponsor('ocd-person/deadline-test', 'ca', undefined, 50, 25_000)
      .catch(error => {
        rejected = true;
        return error;
      });
    await jest.advanceTimersByTimeAsync(OPENSTATES_ROUTE_BUDGET_MS);
    expect(rejected).toBe(false);
    await jest.advanceTimersByTimeAsync(25_000 - OPENSTATES_ROUTE_BUDGET_MS);
    expect(await result).toBeInstanceOf(OpenStatesTimeoutError);
  });
});

describe('sponsor bill paging', () => {
  afterEach(() => jest.restoreAllMocks());

  it('keeps per_page fixed and fetches the remaining pages in parallel', async () => {
    const pending: Array<() => void> = [];
    const fetchMock = jest.fn((url: string) => {
      const page = Number(new URL(url).searchParams.get('page'));
      if (page === 1) return Promise.resolve(pageOf(1, 5));
      // Pages 2+ answer only once released, so both must be in flight together.
      return new Promise(resolve => pending.push(() => resolve(pageOf(page, 5))));
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    const api = new OpenStatesAPI({ apiKey: 'test' });

    const result = api.getBillsBySponsor('ocd-person/paging-test', 'ca', undefined, 50);
    for (let tick = 0; tick < 20 && pending.length < 2; tick++) {
      await new Promise(resolve => setImmediate(resolve));
    }
    expect(pending).toHaveLength(2);
    pending.forEach(release => release());
    const bills = await result;

    const urls = fetchMock.mock.calls.map(([url]) => new URL(url));
    // limit 50 needs pages 1-3 of 20, not all 5 that exist.
    expect(urls.map(u => u.searchParams.get('page'))).toEqual(['1', '2', '3']);
    // A last page at per_page 10 would re-read bills 21-30 (offset = (page-1) * per_page).
    expect(urls.map(u => u.searchParams.get('per_page'))).toEqual(['20', '20', '20']);
    expect(new Set(bills.map(b => b.id)).size).toBe(bills.length);
  });
});

describe('openStatesUnavailableInit', () => {
  it('maps a timeout to an uncached 503', () => {
    const init = openStatesUnavailableInit(new OpenStatesTimeoutError('/events'));
    expect(init?.status).toBe(503);
    expect(init?.headers).toMatchObject({ 'Cache-Control': 'no-store', 'Retry-After': '120' });
  });

  it('maps an exhausted daily quota to an uncached 503', () => {
    const init = openStatesUnavailableInit(new OpenStatesQuotaExhaustedError());
    expect(init?.status).toBe(503);
    expect(init?.headers).toMatchObject({ 'Cache-Control': 'no-store' });
  });

  it('leaves any other error to the route', () => {
    expect(openStatesUnavailableInit(new Error('HTTP 500'))).toBeNull();
  });
});

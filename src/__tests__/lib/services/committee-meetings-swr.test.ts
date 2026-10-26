/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Committee hearing lists are served stale-while-revalidate: a saved list is
 * returned with its own read time (for "As of" dates), and a throttled
 * Congress.gov run is never saved over it.
 */

const swr = jest.fn();
jest.mock('@/services/cache/unified-cache.service', () => ({
  cachedStaleWhileRevalidate: (...args: unknown[]) => swr(...args),
}));
jest.mock('@/lib/cache', () => ({
  cachedFetch: (_key: string, fn: () => Promise<unknown>) => fn(),
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// The service reads the API key when it loads, so import it after setting one.
let service: typeof import('@/lib/services/committee-activity.service');
beforeAll(async () => {
  process.env.CONGRESS_API_KEY = 'test-key';
  service = await import('@/lib/services/committee-activity.service');
});

const SAVED_AT = Date.parse('2026-10-20T08:00:00Z');
const savedMeeting = {
  eventId: '118500',
  date: '2026-09-16T14:00:00Z',
  title: 'Increasing Demand and Opportunities for Homegrown Products',
  type: 'Hearing',
  status: 'Completed',
  chamber: 'House',
  committees: [],
  videos: [],
  witnesses: [],
  documents: [],
  hasTranscript: false,
  congressGovUrl: 'https://www.congress.gov/event/119th-Congress/house-event/118500',
};

const originalFetch = global.fetch;
afterEach(() => {
  global.fetch = originalFetch;
  swr.mockReset();
});

describe('fetchCommitteeMeetings', () => {
  it('serves a saved list with the time it was read, without fetching', async () => {
    swr.mockResolvedValue({
      data: { meetings: [savedMeeting], total: 1613 },
      state: 'stale',
      fetchedAt: SAVED_AT,
    });
    global.fetch = jest.fn() as unknown as typeof fetch;

    const result = await service.fetchCommitteeMeetings('HSAG', 'House', 5);
    expect(result).toEqual({ meetings: [savedMeeting], total: 1613, fetchedAt: SAVED_AT });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('dates the hearing pod by the saved list, not by now', async () => {
    swr.mockResolvedValue({
      data: { meetings: [savedMeeting], total: 1613 },
      state: 'stale',
      fetchedAt: SAVED_AT,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ bills: [] }),
    }) as unknown as typeof fetch;

    const activity = await service.fetchCommitteeActivity('HSAG', 'House');
    expect(activity.fetchedAt).toBe('2026-10-20T08:00:00.000Z');
    expect(activity.meetings.map(m => m.eventId)).toEqual(['118500']);
  });

  it('refuses to save a throttled refresh, so the previous list stays', async () => {
    // Run the loader the cache helper would run on a refresh.
    let loaderError: Error | null = null;
    swr.mockImplementation(async (_key: string, loader: () => Promise<unknown>) => {
      try {
        return { data: await loader(), state: 'miss', fetchedAt: Date.now() };
      } catch (error) {
        loaderError = error as Error;
        throw error;
      }
    });
    const list = Array.from({ length: 20 }, (_, i) => ({ eventId: String(i) }));
    global.fetch = jest.fn(async (url: string) =>
      url.includes('limit=')
        ? { ok: true, json: async () => ({ committeeMeetings: list, pagination: { count: 20 } }) }
        : { ok: false, status: 429, json: async () => ({}) }
    ) as unknown as typeof fetch;

    const result = await service.fetchCommitteeMeetings('HSAG', 'House', 5);
    expect(loaderError).not.toBeNull();
    expect(String(loaderError)).toMatch(/20 of 20 meeting details failed/);
    expect(result).toEqual({ meetings: [], total: 0, fetchedAt: null });
  });
});

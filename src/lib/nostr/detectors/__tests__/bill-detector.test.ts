/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

const mockGet = jest.fn();
const mockMget = jest.fn();
const mockSet = jest.fn();
jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    exists: jest.fn().mockResolvedValue(false),
    set: mockSet,
    get: mockGet,
    mget: mockMget,
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  billWindowStart,
  toCongressDateTime,
  fetchRecentBills,
  detectBillEventsWithWindow,
  advanceBillWatermark,
  BILL_WATERMARK_KEY,
  parseBillNumber,
  resolveBillNumber,
  formatBillNumber,
  isRecentAction,
  buildBillActionEvent,
  buildBillIntroducedEvent,
} from '../bill-detector';
import type { CongressBill } from '../types';

describe('parseBillNumber', () => {
  test('parses H.R. bills', () => {
    expect(parseBillNumber('H.R. 1234')).toEqual({ billType: 'hr', billNum: '1234' });
  });

  test('parses Senate bills', () => {
    expect(parseBillNumber('S. 567')).toEqual({ billType: 's', billNum: '567' });
  });

  test('parses joint resolutions', () => {
    expect(parseBillNumber('H.J.Res. 89')).toEqual({ billType: 'hjres', billNum: '89' });
  });

  test('returns null for invalid format', () => {
    expect(parseBillNumber('INVALID')).toBeNull();
    expect(parseBillNumber('')).toBeNull();
  });
});

describe('resolveBillNumber', () => {
  const base = { title: 'T', originChamber: 'House', congress: 119, url: '' };

  test('uses type field for bare-digit numbers (Congress.gov list shape)', () => {
    const bill: CongressBill = { ...base, number: '877', type: 'HR' };
    expect(resolveBillNumber(bill)).toEqual({ billType: 'hr', billNum: '877' });
  });

  test('falls back to parsing combined strings', () => {
    const bill: CongressBill = { ...base, number: 'S.J.Res. 12', type: '' };
    expect(resolveBillNumber(bill)).toEqual({ billType: 'sjres', billNum: '12' });
  });

  test('returns null when neither form is usable', () => {
    const bill: CongressBill = { ...base, number: 'AMDT 5', type: '' };
    expect(resolveBillNumber(bill)).toBeNull();
  });
});

describe('formatBillNumber', () => {
  test('formats known types', () => {
    expect(formatBillNumber('hr', '877')).toBe('H.R. 877');
    expect(formatBillNumber('sconres', '3')).toBe('S.Con.Res. 3');
  });

  test('upper-cases unknown types instead of dropping them', () => {
    expect(formatBillNumber('xyz', '1')).toBe('XYZ 1');
  });
});

describe('isRecentAction', () => {
  test('accepts actions within the window', () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(isRecentAction(yesterday)).toBe(true);
  });

  test('rejects stale actions resurfaced by metadata updates', () => {
    expect(isRecentAction('2025-04-08')).toBe(false);
  });
});

describe('buildBillActionEvent', () => {
  const bill: CongressBill = {
    number: 'H.R. 1234',
    title: 'Test Bill',
    type: 'HR',
    originChamber: 'House',
    congress: 119,
    url: 'https://www.congress.gov/bill/119th-congress/house-bill/1234',
    latestAction: { actionDate: '2025-03-15', text: 'Passed House' },
  };

  test('builds correct event structure', () => {
    const event = buildBillActionEvent(bill, 'hr', '1234');
    expect(event.type).toBe('bill-action');
    expect(event.id).toBe('hr1234-119-action-2025-03-15');
    expect(event.title).toBe('H.R. 1234: Passed House');
    expect(event.tags).toContain('legislation');
    expect(event.source.api).toBe('congress.gov');
  });
});

describe('buildBillIntroducedEvent', () => {
  const bill: CongressBill = {
    number: 'S. 100',
    title: 'Senate Test Bill',
    type: 'S',
    originChamber: 'Senate',
    congress: 119,
    url: 'https://www.congress.gov/bill/119th-congress/senate-bill/100',
    latestAction: { actionDate: '2025-01-10', text: 'Introduced' },
  };

  test('builds correct event structure', () => {
    const event = buildBillIntroducedEvent(bill, 's', '100');
    expect(event.type).toBe('bill-introduced');
    expect(event.id).toBe('s100-119-introduced');
    expect(event.title).toContain('New Bill');
    expect(event.tags).toContain('new-bill');
  });
});

describe('detectBillEvents', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.CONGRESS_API_KEY = 'test-key';
    process.env.CURRENT_CONGRESS = '119';
  });

  test('returns empty array when API key missing', async () => {
    delete process.env.CONGRESS_API_KEY;
    const { detectBillEvents } = await import('../bill-detector');
    const events = await detectBillEvents();
    expect(events).toEqual([]);
  });
});

const HOUR = 60 * 60 * 1000;
const today = () => new Date().toISOString().split('T')[0]!;

function billFixture(type: string, number: string, actionText: string, actionDate = today()) {
  return {
    title: `Bill ${number}`,
    number,
    type,
    originChamber: 'House',
    congress: 119,
    url: '',
    latestAction: { actionDate, text: actionText },
  };
}

function jsonResponse(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as unknown as Response;
}

describe('bill fetch window', () => {
  const now = Date.parse('2026-10-07T10:00:00Z');

  test('formats Congress.gov dateTimes without milliseconds', () => {
    expect(toCongressDateTime(new Date('2026-10-06T08:00:00.123Z'))).toBe('2026-10-06T08:00:00Z');
  });

  test('defaults to the last 26 hours', () => {
    expect(billWindowStart(now, null).getTime()).toBe(now - 26 * HOUR);
    expect(billWindowStart(now, 'garbage').getTime()).toBe(now - 26 * HOUR);
  });

  test('reaches back to an older watermark so deferred events are re-detected', () => {
    const mark = new Date(now - 72 * HOUR).toISOString();
    expect(billWindowStart(now, mark).toISOString()).toBe(mark);
  });

  test('never reaches past the 7-day action gate, nor later than 26 hours', () => {
    expect(billWindowStart(now, '2026-01-01T00:00:00Z').getTime()).toBe(now - 7 * 24 * HOUR);
    expect(billWindowStart(now, new Date(now).toISOString()).getTime()).toBe(now - 26 * HOUR);
  });
});

describe('fetchRecentBills', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    process.env.CONGRESS_API_KEY = 'test-key';
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('follows pagination.next with the window and page size', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          bills: [billFixture('HR', '1', 'x')],
          pagination: { count: 2, next: 'https://api.congress.gov/v3/bill/119?offset=250' },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({ bills: [billFixture('HRES', '1552', 'y')], pagination: { count: 2 } })
      );

    const result = await fetchRecentBills('119', new Date('2026-10-06T08:00:00Z'));

    expect(result.complete).toBe(true);
    expect(result.bills.map(b => b.number)).toEqual(['1', '1552']);
    const firstUrl = String(fetchMock.mock.calls[0]![0]);
    expect(firstUrl).toContain('limit=250');
    expect(firstUrl).toContain('fromDateTime=2026-10-06T08:00:00Z');
    expect(String(fetchMock.mock.calls[1]![0])).toContain('offset=250');
  });

  test('keeps earlier pages and reports incomplete when a later page fails', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ bills: [billFixture('HR', '1', 'x')], pagination: { count: 2, next: 'n' } })
      )
      .mockRejectedValueOnce(new Error('timeout'));

    const result = await fetchRecentBills('119', new Date());
    expect(result).toEqual({ bills: [expect.objectContaining({ number: '1' })], complete: false });
  });

  test('throws when the first page fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({}, false, 503));
    await expect(fetchRecentBills('119', new Date())).rejects.toThrow('503');
  });
});

describe('detectBillEventsWithWindow', () => {
  const originalFetch = global.fetch;
  const fetchMock = jest.fn<typeof fetch>();

  beforeEach(() => {
    process.env.CONGRESS_API_KEY = 'test-key';
    process.env.CURRENT_CONGRESS = '119';
    fetchMock.mockReset();
    mockGet.mockReset().mockResolvedValue(null);
    mockMget.mockReset();
    mockSet.mockReset();
    global.fetch = fetchMock;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  test('checks dedup keys in one MGET and skips already-published bills', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        bills: [
          billFixture('HRES', '1552', 'Referred to the Committee on Rules.'),
          billFixture('HR', '2', 'Passed House'),
          billFixture('HR', '3', 'Old action', '2025-01-01'),
        ],
        pagination: { count: 3 },
      })
    );
    const d = today();
    mockMget.mockImplementation(async (...args: unknown[]) =>
      (args[0] as string[]).map(k => (k === `nostr:published:hr2-119-action-${d}` ? {} : null))
    );

    const { events, fetchedThrough } = await detectBillEventsWithWindow();

    expect(mockMget).toHaveBeenCalledTimes(1);
    expect(mockMget.mock.calls[0]![0]).toEqual([
      `nostr:published:hres1552-119-action-${d}`,
      'nostr:published:hres1552-119-introduced',
      `nostr:published:hr2-119-action-${d}`,
    ]);
    expect(events.map(e => e.id)).toEqual(['hres1552-119-introduced', `hres1552-119-action-${d}`]);
    expect(fetchedThrough).not.toBeNull();
  });

  test('chunks MGET at 50 keys', async () => {
    const bills = Array.from({ length: 120 }, (_, i) => billFixture('HR', String(i + 1), 'Passed'));
    fetchMock.mockResolvedValueOnce(jsonResponse({ bills, pagination: { count: 120 } }));
    mockMget.mockImplementation(async (...args: unknown[]) =>
      (args[0] as string[]).map(() => null)
    );

    const { events } = await detectBillEventsWithWindow();
    expect(mockMget).toHaveBeenCalledTimes(3);
    expect(events).toHaveLength(120);
  });

  test('returns no window end when a page failed, so the watermark stays put', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          bills: [billFixture('HR', '2', 'Passed')],
          pagination: { count: 2, next: 'n' },
        })
      )
      .mockRejectedValueOnce(new Error('timeout'));
    mockMget.mockResolvedValue([null]);

    const { events, fetchedThrough } = await detectBillEventsWithWindow();
    expect(events).toHaveLength(1);
    expect(fetchedThrough).toBeNull();
  });

  test('starts the window at the stored watermark', async () => {
    const mark = new Date(Date.now() - 48 * HOUR).toISOString();
    mockGet.mockResolvedValue(mark);
    fetchMock.mockResolvedValueOnce(jsonResponse({ bills: [], pagination: { count: 0 } }));

    await detectBillEventsWithWindow();
    expect(mockGet).toHaveBeenCalledWith(BILL_WATERMARK_KEY);
    expect(String(fetchMock.mock.calls[0]![0])).toContain(
      `fromDateTime=${toCongressDateTime(new Date(mark))}`
    );
  });

  test('advanceBillWatermark stores the window end for 8 days', async () => {
    await advanceBillWatermark('2026-10-07T10:00:00.000Z');
    expect(mockSet).toHaveBeenCalledWith(
      BILL_WATERMARK_KEY,
      '2026-10-07T10:00:00.000Z',
      8 * 24 * 60 * 60
    );
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/cache/redis-client', () => ({
  getRedisCache: () => ({
    exists: jest.fn().mockResolvedValue(false),
    set: jest.fn().mockResolvedValue(undefined),
    get: jest.fn().mockResolvedValue(null),
  }),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
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

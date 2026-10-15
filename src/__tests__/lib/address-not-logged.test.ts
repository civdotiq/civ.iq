/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * PRIVACY.md and /privacy promise that a looked-up address is never logged.
 * Before 2026-10-15 both Census geocoders logged the full address on every
 * lookup. These tests fail if any logger call carries the street again.
 */

import lansing from '../services/fixtures/census-lansing-ACS2025_Current.json';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), http: jest.fn() },
}));

import logger from '@/lib/logging/simple-logger';
import { geocodeAddress } from '@/lib/census-geocoder';
import { getCongressionalDistrictFromAddress } from '@/lib/census-api';

const mockLogger = logger as unknown as Record<string, jest.Mock>;

const ADDRESS = '100 N Capitol Ave, Lansing, MI 48933';
const STREET = 'Capitol';

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function loggedText(): string {
  return JSON.stringify(
    Object.values(mockLogger).flatMap(fn =>
      fn.mock.calls.map(args =>
        args.map(arg => (arg instanceof Error ? `${arg.message} ${arg.stack}` : arg))
      )
    )
  );
}

beforeEach(() => {
  mockFetch.mockReset();
  Object.values(mockLogger).forEach(fn => fn.mockClear());
});

describe('address lookups never log the address', () => {
  it('lib/census-geocoder: success path', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => lansing });
    const result = await geocodeAddress(ADDRESS);
    expect(Array.isArray(result)).toBe(true);
    expect(mockLogger.info).toHaveBeenCalled();
    expect(loggedText()).not.toContain(STREET);
  });

  it('lib/census-geocoder: upstream failure path', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    await geocodeAddress('200 Other Street, Lansing, MI 48933');
    expect(loggedText()).not.toContain('Other Street');
  });

  it('lib/census-api: success and failure paths', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => lansing });
    await getCongressionalDistrictFromAddress(ADDRESS);
    mockFetch.mockRejectedValueOnce(new Error('network down'));
    await getCongressionalDistrictFromAddress(ADDRESS);
    expect(mockLogger.info).toHaveBeenCalled();
    expect(loggedText()).not.toContain(STREET);
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

jest.mock('@/lib/logging/logger-client', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.mock('@/lib/cache', () => ({
  cachedFetch: <T>(_key: string, fn: () => Promise<T>) => fn(),
}));

import { NextRequest } from 'next/server';
import { GET } from '../route';
import {
  ACS_DISTRICT_VARIABLES,
  censusDistrictFor,
  parseAcsDistrictRow,
} from '@/lib/services/rep-district-demographics';

const FABRICATED_POPULATION = 760000;

function acsTable(overrides: Record<string, string> = {}): string[][] {
  const headers = [...ACS_DISTRICT_VARIABLES, 'state', 'congressional district'];
  const row = headers.map(h => overrides[h] ?? '100');
  return [headers, row];
}

function mockFetch(rep: object, census: unknown, censusOk = true) {
  const calls: string[] = [];
  global.fetch = jest.fn(async (url: string | URL) => {
    const u = String(url);
    calls.push(u);
    if (u.includes('api.census.gov')) {
      return { ok: censusOk, status: censusOk ? 200 : 503, json: async () => census };
    }
    return { ok: true, status: 200, json: async () => ({ representative: rep }) };
  }) as unknown as typeof fetch;
  return calls;
}

async function call(id: string) {
  const res = await GET(new NextRequest(`https://civdotiq.org/api/representative/${id}/district`), {
    params: Promise.resolve({ bioguideId: id }),
  });
  return { status: res.status, body: await res.json() };
}

describe('GET /api/representative/[id]/district', () => {
  it('reads state/district from the wrapped representative response', async () => {
    const calls = mockFetch(
      { name: 'Nancy Pelosi', party: 'Democrat', state: 'CA', district: '11', terms: [] },
      acsTable({ B01003_001E: '719712' })
    );
    const { status, body } = await call('P000197');
    expect(status).toBe(200);
    expect(calls.some(u => u.includes('congressional%20district:11&in=state:06'))).toBe(true);
    expect(body.district_number).toBe('11');
    expect(body.state).toBe('CA');
    expect(body.demographics.population.total).toBe(719712);
  });

  it('returns null demographics, never fabricated numbers, when Census fails', async () => {
    mockFetch({ state: 'CA', district: '11' }, { error: 'down' }, false);
    const { status, body } = await call('P000197');
    expect(status).toBe(200);
    expect(body.demographics).toBeNull();
    expect(body.elections).toBeNull();
    expect(JSON.stringify(body)).not.toContain(String(FABRICATED_POPULATION));
  });

  it('returns null demographics for senators without calling Census', async () => {
    const calls = mockFetch({ state: 'NY', district: null }, acsTable());
    const { body } = await call('S000148');
    expect(body.demographics).toBeNull();
    expect(calls.some(u => u.includes('api.census.gov'))).toBe(false);
  });
});

describe('censusDistrictFor', () => {
  it('maps at-large "0" to 00 and DC to delegate district 98', () => {
    expect(censusDistrictFor('WY', '0')).toEqual({ stateFips: '56', districtCode: '00' });
    expect(censusDistrictFor('DC', '0')).toEqual({ stateFips: '11', districtCode: '98' });
    expect(censusDistrictFor('CA', '7')).toEqual({ stateFips: '06', districtCode: '07' });
    expect(censusDistrictFor('NY', null)).toBeNull();
  });
});

describe('parseAcsDistrictRow', () => {
  it('turns ACS suppression sentinels into null instead of numbers', () => {
    const d = parseAcsDistrictRow(acsTable({ B19013_001E: '-666666666', B25003_001E: '0' }));
    expect(d?.economics.median_household_income).toBeNull();
    expect(d?.housing.homeownership_rate).toBeNull();
  });

  it('computes rates from the right universes', () => {
    const d = parseAcsDistrictRow(
      acsTable({ B17001_001E: '1000', B17001_002E: '125', B23025_003E: '400', B23025_005E: '20' })
    );
    expect(d?.economics.poverty_rate).toBe(12.5);
    expect(d?.economics.unemployment_rate).toBe(5);
  });
});

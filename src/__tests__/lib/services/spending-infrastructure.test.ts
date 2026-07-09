/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Pass-through cache so we exercise the real fetch logic.
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('@/lib/helpers/federal-fiscal-year', () => ({
  currentFederalFiscalYearWindow: () => ({ startDate: '2025-10-01', endDate: '2026-09-30' }),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  getDistrictInfrastructureSpending,
  INFRASTRUCTURE_CODE_SET,
} from '@/lib/services/spending.service';

function awardPage(amounts: number[], hasNext = false) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      results: amounts.map(a => ({ 'Award ID': 'X', 'Award Amount': a })),
      page_metadata: { hasNext },
    }),
  };
}
const pageFail = { ok: false, status: 500, json: async () => ({}) };

/**
 * Both dimensions page spending_by_award; the contract query carries psc_codes,
 * the grant query carries program_numbers. Route by body so the two concurrent
 * Promise.all branches consume their own queued pages.
 */
function route(contract: unknown[], grant: unknown[]) {
  const cQ = [...contract];
  const gQ = [...grant];
  mockFetch.mockImplementation((_url: string, init?: { body?: string }) => {
    const body = String(init?.body ?? '');
    if (body.includes('psc_codes')) return Promise.resolve(cQ.shift());
    if (body.includes('program_numbers')) return Promise.resolve(gQ.shift());
    throw new Error(`unexpected request body: ${body}`);
  });
}

describe('getDistrictInfrastructureSpending', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sums PSC contract obligations and CFDA grant obligations', async () => {
    route([awardPage([700_000, 300_000], false)], [awardPage([600_000, 400_000], false)]);

    const result = await getDistrictInfrastructureSpending('TX', '10');
    expect(result?.contractObligations).toBe(1_000_000);
    expect(result?.grantObligations).toBe(1_000_000);
    expect(result?.total).toBe(2_000_000);
    expect(result?.codeSetLabel).toBe(INFRASTRUCTURE_CODE_SET.label);
    expect(result?.reason).toBeUndefined();
  });

  it('sends the PSC Y+Z tiered filter and CFDA program_numbers with correct award types', async () => {
    route([awardPage([5], false)], [awardPage([5], false)]);
    await getDistrictInfrastructureSpending('TX', '10');

    const bodies = (mockFetch.mock.calls as Array<[string, { body: string }]>).map(c =>
      JSON.parse(c[1].body)
    );
    const contract = bodies.find(b => b.filters.psc_codes)!;
    const grant = bodies.find(b => b.filters.program_numbers)!;
    expect(contract.filters.psc_codes).toEqual({
      require: [
        ['Service', 'Y'],
        ['Service', 'Z'],
      ],
    });
    expect(contract.filters.award_type_codes).toEqual(['A', 'B', 'C', 'D']);
    expect(grant.filters.program_numbers).toEqual([...INFRASTRUCTURE_CODE_SET.grantCfda]);
    expect(grant.filters.award_type_codes).toEqual(['02', '03', '04', '05']);
  });

  it('pages each dimension until hasNext is false, summing every page', async () => {
    route(
      [awardPage([100], true), awardPage([200], false)],
      [awardPage([10], true), awardPage([20], true), awardPage([30], false)]
    );

    const result = await getDistrictInfrastructureSpending('TX', '10');
    expect(result?.contractObligations).toBe(300);
    expect(result?.grantObligations).toBe(60);
    expect(result?.total).toBe(360);
  });

  it('returns null (not 0) when the contract query fails on a page', async () => {
    route([pageFail], [awardPage([500], false)]);
    const result = await getDistrictInfrastructureSpending('TX', '10');
    expect(result).toBeNull();
  });

  it('returns null when a grant award page fails (incomplete sum)', async () => {
    route([awardPage([100], false)], [pageFail]);
    const result = await getDistrictInfrastructureSpending('TX', '10');
    expect(result).toBeNull();
  });

  it('returns total null + reason when queried but nothing matches', async () => {
    route([awardPage([], false)], [awardPage([], false)]);
    const result = await getDistrictInfrastructureSpending('TX', '10');
    expect(result).not.toBeNull();
    expect(result?.total).toBeNull();
    expect(result?.reason).toMatch(/no matching/i);
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for GovInfo full-text bill search: package-id parsing, dedup across
 * text versions, type filtering, and graceful failure.
 */

jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import { searchBillsByKeyword } from '@/lib/services/bill-search.service';

function mockGovInfo(results: Array<{ packageId: string; title: string; dateIssued?: string }>) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ results, count: results.length }),
  }) as unknown as typeof fetch;
}

describe('searchBillsByKeyword', () => {
  afterEach(() => jest.clearAllMocks());

  it('dedupes text versions of the same bill to one congress-type-number id', async () => {
    mockGovInfo([
      { packageId: 'BILLS-119s2585es', title: 'MAP for Broadband Funding Act' },
      { packageId: 'BILLS-119s2585is', title: 'MAP for Broadband Funding Act' },
      { packageId: 'BILLS-119s2585rs', title: 'MAP for Broadband Funding Act' },
      { packageId: 'BILLS-119hr1873ih', title: 'Broadband Grant Tax Treatment Act' },
    ]);

    const results = await searchBillsByKeyword('broadband');

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ id: '119-s-2585', type: 'S', number: '2585' });
    expect(results[1]).toMatchObject({ id: '119-hr-1873', type: 'HR', number: '1873' });
    expect(results[0]?.source).toBe('govinfo-fulltext');
  });

  it('parses multi-letter bill types without mis-splitting (hconres, hres)', async () => {
    mockGovInfo([
      { packageId: 'BILLS-119hconres10ih', title: 'A concurrent resolution' },
      { packageId: 'BILLS-119hres55eh', title: 'A House resolution' },
    ]);

    const results = await searchBillsByKeyword('budget');

    expect(results.map(r => r.id)).toEqual(['119-hconres-10', '119-hres-55']);
  });

  it('honors the type filter and ignores non-BILLS packages', async () => {
    mockGovInfo([
      { packageId: 'BILLS-119hr100ih', title: 'A House bill' },
      { packageId: 'BILLS-119s200is', title: 'A Senate bill' },
      { packageId: 'CHRG-119hhrg123', title: 'A hearing, not a bill' },
    ]);

    const results = await searchBillsByKeyword('energy', { type: 'hr' });

    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('119-hr-100');
  });

  it('returns [] for a blank query without calling GovInfo', async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;
    const results = await searchBillsByKeyword('   ');
    expect(results).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('returns [] (never throws) when GovInfo errors', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;
    const results = await searchBillsByKeyword('broadband');
    expect(results).toEqual([]);
  });
});

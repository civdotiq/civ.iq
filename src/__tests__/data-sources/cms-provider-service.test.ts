/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Pass-through so every call exercises the real fetch + parse path.
jest.mock('@/lib/cache', () => ({
  cachedFetch: jest.fn((_key: string, fn: () => unknown) => fn()),
}));

import { CmsProviderService } from '@/lib/data-sources/cms-provider-service';

describe('CmsProviderService', () => {
  const service = new CmsProviderService();

  it('queries the stable dataset-id path, not a rotating distribution UUID', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: '149', results: [] }),
    });

    const result = await service.searchHospitalsWithTotal('mi');

    const url = String((global.fetch as jest.Mock).mock.calls[0][0]);
    expect(url).toContain('/datastore/query/xubh-q36u/0?');
    expect(result.totalAvailable).toBe(149);
  });

  it('reports a 404 as unavailable (null), never as zero facilities', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 404 });

    const hospitals = await service.searchHospitalsWithTotal('MI');
    const nursingHomes = await service.searchNursingHomesWithTotal('MI');

    expect(hospitals.totalAvailable).toBeNull();
    expect(nursingHomes.totalAvailable).toBeNull();
  });
});

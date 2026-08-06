/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { lookupDetroitCouncilDistrict } from '@/lib/local-government/detroit-district-lookup';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('@/lib/monitoring/telemetry', () => ({
  monitorExternalApi: jest.fn(() => ({ end: jest.fn() })),
}));

function mockFetchJson(body: unknown, ok = true, status = 200) {
  global.fetch = jest.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
}

describe('lookupDetroitCouncilDistrict', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns the district number for a point inside a district', async () => {
    mockFetchJson({ features: [{ attributes: { district_number: 6 } }] });
    await expect(lookupDetroitCouncilDistrict(-83.0445, 42.3289)).resolves.toEqual({
      ok: true,
      district: 6,
    });
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('city_council_districts_2026');
    expect(url).toContain('esriGeometryPoint');
  });

  it('returns district null for a point in no district polygon', async () => {
    mockFetchJson({ features: [] });
    await expect(lookupDetroitCouncilDistrict(-83.7, 42.28)).resolves.toEqual({
      ok: true,
      district: null,
    });
  });

  it('treats an ArcGIS in-body error as a failure, not an empty result', async () => {
    mockFetchJson({ error: { code: 400, message: 'Invalid query parameters' } });
    const result = await lookupDetroitCouncilDistrict(-83.0445, 42.3289);
    expect(result).toEqual({ ok: false, error: 'Invalid query parameters' });
  });

  it('treats HTTP failure as a failure', async () => {
    mockFetchJson({}, false, 503);
    const result = await lookupDetroitCouncilDistrict(-83.0445, 42.3289);
    expect(result.ok).toBe(false);
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * services-health used api.ed.gov, which no longer resolves, so the education
 * section could never return data. Its replacement sums CCD schools located
 * in the congressional district. These tests pin the request shape and that
 * missing or partial data is reported as null, never as a guessed number.
 */

import { CCD_YEAR, fetchDistrictStaffing } from '@/lib/data-sources/nces-ccd-service';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

function page(
  results: Array<{ enrollment: number | null; teachers_fte: number | null }>,
  count = results.length,
  next: string | null = null
) {
  return { ok: true, status: 200, json: async () => ({ count, next, results }) };
}

describe('fetchDistrictStaffing', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('queries the CCD directory by state FIPS and congressional district', async () => {
    const fetchMock = jest.fn().mockResolvedValue(page([{ enrollment: 400, teachers_fte: 20 }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchDistrictStaffing('MI-11', '26');

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `https://educationdata.urban.org/api/v1/schools/ccd/directory/${CCD_YEAR}/?fips=26&congress_district_id=2611`
    );
    // Node's default "node" User-Agent is rejected with 403.
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect((init.headers as Record<string, string>)['User-Agent']).toMatch(/^CivIQ-Hub/);
  });

  it('encodes at-large districts as 00 and drops the FIPS leading zero', async () => {
    const fetchMock = jest.fn().mockResolvedValue(page([{ enrollment: 100, teachers_fte: 10 }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchDistrictStaffing('WY-AL', '56');
    await fetchDistrictStaffing('AL-7', '01');

    expect(fetchMock.mock.calls[0]?.[0]).toContain('fips=56&congress_district_id=5600');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('fips=1&congress_district_id=107');
  });

  it('encodes DC and territory delegate seats as 98, not 00', async () => {
    const fetchMock = jest.fn().mockResolvedValue(page([{ enrollment: 100, teachers_fte: 10 }]));
    global.fetch = fetchMock as unknown as typeof fetch;

    await fetchDistrictStaffing('DC-00', '11');
    await fetchDistrictStaffing('DC-AL', '11');
    await fetchDistrictStaffing('PR-AL', '72');

    expect(fetchMock.mock.calls[0]?.[0]).toContain('fips=11&congress_district_id=1198');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('fips=11&congress_district_id=1198');
    expect(fetchMock.mock.calls[2]?.[0]).toContain('fips=72&congress_district_id=7298');
  });

  it('sums schools reporting both enrollment and teachers; skips missing and CCD negative codes', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      page([
        { enrollment: 400, teachers_fte: 20 },
        { enrollment: 300, teachers_fte: 25 },
        { enrollment: 250, teachers_fte: null },
        { enrollment: -1, teachers_fte: 12 },
      ])
    ) as unknown as typeof fetch;

    const result = await fetchDistrictStaffing('MI-11', '26');

    expect(result).toEqual({
      studentsPerTeacher: 700 / 45,
      schoolsReporting: 2,
      schoolsTotal: 4,
      year: CCD_YEAR,
    });
  });

  it('follows pagination', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(page([{ enrollment: 100, teachers_fte: 10 }], 2, 'https://next'))
      .mockResolvedValueOnce(page([{ enrollment: 300, teachers_fte: 10 }], 2));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await fetchDistrictStaffing('MI-11', '26');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]?.[0]).toBe('https://next');
    expect(result?.studentsPerTeacher).toBe(20);
  });

  it('returns null when the school list is truncated', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(
        page([{ enrollment: 100, teachers_fte: 10 }], 5000)
      ) as unknown as typeof fetch;

    await expect(fetchDistrictStaffing('MI-11', '26')).resolves.toBeNull();
  });

  it('returns null when no school reports teachers', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValue(page([{ enrollment: 100, teachers_fte: 0 }])) as unknown as typeof fetch;

    await expect(fetchDistrictStaffing('MI-11', '26')).resolves.toBeNull();
  });

  it('returns null on upstream failure or a malformed district id', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('down')) as unknown as typeof fetch;
    await expect(fetchDistrictStaffing('MI-11', '26')).resolves.toBeNull();
    await expect(fetchDistrictStaffing('not-a-district', '26')).resolves.toBeNull();
  });
});

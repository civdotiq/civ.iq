/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Integration tests against the committed corpus (data/cd120-districts.json.br).
 *
 * Ground truth: Census internal points (INTPTLAT/INTPTLON) from the
 * full-resolution TIGER 2026 geodatabase — points the Census itself guarantees
 * to be inside each district. The Shreveport case is the Phase 0 motivating
 * bug: the live Census Geocoder still says LA-06 (119th Congress); the real
 * 2026-ballot district is LA-04.
 */

import {
  lookupDistrict120,
  getCd120CorpusStatus,
  __resetCd120Cache,
} from '@/lib/data-sources/cd120-districts/load-districts';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    metric: jest.fn(),
  },
}));

afterAll(() => {
  __resetCd120Cache();
});

/** [lon, lat, state, district] — Census internal points, full-res gdb, 2026-08-07. */
const INTERNAL_POINTS: Array<[number, number, string, string]> = [
  [-87.8709147, 30.4903481, 'AL', '1'],
  [-152.8385657, 63.3469818, 'AK', 'AL'],
  [-122.2408008, 37.7801271, 'CA', '12'],
  [-77.0165243, 38.9042429, 'DC', 'AL'],
  [-93.2149443, 31.7422149, 'LA', '4'],
  [-83.1145731, 42.324202, 'MI', '13'],
  [-84.1187776, 39.3608366, 'OH', '1'],
  [-87.6780952, 36.2574236, 'TN', '5'],
  [-95.3131239, 30.1230928, 'TX', '2'],
];

describe('lookupDistrict120 against the committed corpus', () => {
  it.each(INTERNAL_POINTS)('resolves (%f, %f) to %s-%s', async (lon, lat, state, district) => {
    const hit = await lookupDistrict120(lon, lat);
    expect(hit).not.toBeNull();
    expect(hit?.state).toBe(state);
    expect(hit?.district).toBe(district);
  });

  it('resolves Shreveport to LA-4, where the live geocoder still says LA-06', async () => {
    const hit = await lookupDistrict120(-93.77, 32.49);
    expect(hit).toMatchObject({ state: 'LA', district: '4', geoid: '2204' });
  });

  it('returns null for a point in the open ocean', async () => {
    expect(await lookupDistrict120(-140, 30)).toBeNull();
  });

  it('returns null rather than a guess for a foreign coordinate', async () => {
    // Paris, France
    expect(await lookupDistrict120(2.35, 48.85)).toBeNull();
  });

  it('reports corpus provenance', async () => {
    const status = await getCd120CorpusStatus();
    expect(status).not.toBeNull();
    expect(status?.cdSession).toBe('120');
    expect(status?.districts).toBe(441);
    expect(status?.source).toContain('census.gov');
  });
});

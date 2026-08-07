/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  resolveBallotDistrict2026,
  toDistrictId,
} from '@/lib/data-sources/cd120-districts/ballot-district';
import { __resetCd120Cache } from '@/lib/data-sources/cd120-districts/load-districts';

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

describe('toDistrictId', () => {
  it('zero-pads numbered districts and passes AL through', () => {
    expect(toDistrictId('LA', '4')).toBe('LA-04');
    expect(toDistrictId('MI', '13')).toBe('MI-13');
    expect(toDistrictId('AK', 'AL')).toBe('AK-AL');
  });
});

describe('resolveBallotDistrict2026', () => {
  // Shreveport: the Phase 0 motivating case. The live geocoder still returns
  // LA-06 (119th Congress); the 2026-ballot district is LA-04.
  const SHREVEPORT = { lon: -93.77, lat: 32.49 };

  it('flags a redistricted address and explains both districts', async () => {
    const result = await resolveBallotDistrict2026(SHREVEPORT.lon, SHREVEPORT.lat, {
      state: 'LA',
      district: '06',
    });
    expect(result).toMatchObject({
      cdSession: '120',
      state: 'LA',
      district: '4',
      districtId: 'LA-04',
      differsFromCurrent: true,
    });
    expect(result?.note).toContain('LA-06');
    expect(result?.note).toContain('LA-04');
    expect(result?.note).toContain('November 3, 2026');
  });

  it('stays quiet when the district did not change', async () => {
    // Census internal point for MI-13; Michigan did not redraw for 2026.
    const result = await resolveBallotDistrict2026(-83.1145731, 42.324202, {
      state: 'MI',
      district: '13',
    });
    expect(result).toMatchObject({ districtId: 'MI-13', differsFromCurrent: false });
    expect(result?.note).toBeUndefined();
  });

  it('accepts padded, unpadded and at-large forms of the current district', async () => {
    const padded = await resolveBallotDistrict2026(SHREVEPORT.lon, SHREVEPORT.lat, {
      state: 'LA',
      district: '04',
    });
    expect(padded?.differsFromCurrent).toBe(false);

    // Alaska at-large: geocoder reports "00", corpus says AL — same seat.
    const atLarge = await resolveBallotDistrict2026(-152.8385657, 63.3469818, {
      state: 'AK',
      district: '00',
    });
    expect(atLarge?.differsFromCurrent).toBe(false);
  });

  it('reports without comparison when no current district is supplied', async () => {
    const result = await resolveBallotDistrict2026(SHREVEPORT.lon, SHREVEPORT.lat);
    expect(result?.differsFromCurrent).toBe(false);
    expect(result?.note).toBeUndefined();
  });

  it('returns null offshore instead of guessing', async () => {
    expect(await resolveBallotDistrict2026(-140, 30, { state: 'CA', district: '12' })).toBeNull();
  });
});

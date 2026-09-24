/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * CensusGeocoderService against real (trimmed) Census Geocoder responses.
 *
 * Census renames its layers every vintage ("2024 State Legislative Districts",
 * "2026 ...", "119th"/"120th Congressional Districts"). An exact-name parser
 * silently returned no state districts once Current_Current moved to 2026, and
 * taking the newest Congress named the 2026-ballot district as the sitting one.
 */

import { CensusGeocoderService } from '@/services/geocoding/census-geocoder.service';
import {
  currentOfficeholderVintage,
  CONGRESS_120_CONVENES_MS,
  SITTING_119TH_VINTAGE,
  LATEST_VINTAGE,
} from '@/lib/census-vintage';
import lansingSitting from './fixtures/census-lansing-ACS2025_Current.json';
import lansingLatest from './fixtures/census-lansing-Current_Current.json';
import shreveportSitting from './fixtures/census-shreveport-ACS2025_Current.json';
import shreveportLatest from './fixtures/census-shreveport-Current_Current.json';

jest.mock('@/services/cache', () => ({
  govCache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(true),
  },
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

function respondWith(fixture: unknown): void {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => fixture });
}

function requestedVintage(): string | null {
  const url = new URL(String(mockFetch.mock.calls.at(-1)?.[0]));
  return url.searchParams.get('vintage');
}

describe('currentOfficeholderVintage', () => {
  it('pins the sitting 119th-Congress vintage until the 120th convenes', () => {
    expect(currentOfficeholderVintage(new Date('2026-09-24T12:00:00Z'))).toBe(
      SITTING_119TH_VINTAGE
    );
    expect(currentOfficeholderVintage(new Date(CONGRESS_120_CONVENES_MS - 1))).toBe(
      SITTING_119TH_VINTAGE
    );
  });

  it('switches to the latest vintage once the 120th Congress convenes', () => {
    expect(currentOfficeholderVintage(new Date(CONGRESS_120_CONVENES_MS))).toBe(LATEST_VINTAGE);
  });
});

describe('CensusGeocoderService.geocodeAddress', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('requests the sitting-officeholder vintage by default', async () => {
    respondWith(lansingSitting);
    await CensusGeocoderService.geocodeAddress({
      street: '100 N Capitol Ave',
      city: 'Lansing',
      state: 'MI',
      zip: '48933',
    });
    expect(requestedVintage()).toBe(currentOfficeholderVintage());
  });

  it('parses 2024 state legislative and 119th congressional layers', async () => {
    respondWith(lansingSitting);
    const info = await CensusGeocoderService.geocodeAddress({
      street: '100 N Capitol Ave',
      city: 'Lansing',
      state: 'MI',
      zip: '48933',
      vintage: 'ACS2025_Current',
    });
    expect(info.upperDistrict?.number).toBe('21');
    expect(info.lowerDistrict?.number).toBe('77');
    expect(info.congressionalDistrict?.number).toBe('7');
  });

  it('parses renamed 2026 / 120th layers too', async () => {
    respondWith(lansingLatest);
    const info = await CensusGeocoderService.geocodeAddress({
      street: '100 N Capitol Ave',
      city: 'Lansing',
      state: 'MI',
      zip: '48934',
      vintage: 'Current_Current',
    });
    expect(info.upperDistrict?.number).toBe('21');
    expect(info.lowerDistrict?.number).toBe('77');
    expect(info.congressionalDistrict?.number).toBe('7');
  });

  it('keeps the sitting and ballot districts apart in a redistricted state', async () => {
    respondWith(shreveportSitting);
    const sitting = await CensusGeocoderService.geocodeAddress({
      street: '505 Travis St',
      city: 'Shreveport',
      state: 'LA',
      zip: '71101',
      vintage: 'ACS2025_Current',
    });
    respondWith(shreveportLatest);
    const ballot = await CensusGeocoderService.geocodeAddress({
      street: '505 Travis St',
      city: 'Shreveport',
      state: 'LA',
      zip: '71101',
      vintage: 'Current_Current',
    });
    // 119th map (sitting member): LA-06. 120th map (Nov 2026 ballot): LA-04.
    expect(sitting.congressionalDistrict?.number).toBe('6');
    expect(ballot.congressionalDistrict?.number).toBe('4');
  });
});

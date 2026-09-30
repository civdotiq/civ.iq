/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Address → representatives resolver (PLAN-search-growth Phase 4a).
 *
 * The geocoder is mocked (its districts are the input); the roster corpus is
 * the real committed one, so these cases fail if a corpus sync or a key rebuild
 * stops placing a hard-state address. Every case also asserts that nothing
 * called openstates.org: address lookups must never spend the daily quota.
 */

import {
  resolveByAddress,
  stateMembersByBucket,
} from '@/services/lookup/resolve-representatives.service';
import { districtLookup } from '@/services/state-legislators/district-lookup.service';
import { censusGeocoder } from '@/services/geocoding/census-geocoder.service';
import { RepresentativesCoreService } from '@/services/core/representatives-core.service';
import type { ParsedDistrictInfo } from '@/services/geocoding/census-geocoder.types';

jest.mock('@/services/geocoding/census-geocoder.service', () => ({
  censusGeocoder: { geocodeAddress: jest.fn() },
}));
jest.mock('@/services/core/representatives-core.service', () => ({
  RepresentativesCoreService: { getAllRepresentatives: jest.fn() },
}));
jest.mock('@/lib/data-sources/cd120-districts', () => ({
  resolveBallotDistrict2026: jest.fn(async () => null),
}));
jest.mock('@/services/cache', () => ({
  govCache: { get: jest.fn(async () => null), set: jest.fn(async () => true) },
}));
jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const geocode = censusGeocoder.geocodeAddress as jest.Mock;
const allReps = RepresentativesCoreService.getAllRepresentatives as jest.Mock;

let fetchMock: jest.Mock;
beforeEach(() => {
  fetchMock = jest.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
  global.fetch = fetchMock as unknown as typeof fetch;
  allReps.mockResolvedValue([
    rep('MI0', 'MI', 'Senate'),
    rep('MI1', 'MI', 'Senate'),
    rep('MI13', 'MI', 'House', '13'),
    rep('MI12', 'MI', 'House', '12'),
    rep('DC0', 'DC', 'House', '0'),
    rep('AK0', 'AK', 'House', '0'),
    rep('AKS', 'AK', 'Senate'),
  ]);
});
afterEach(() => {
  const openStatesCalls = fetchMock.mock.calls.filter(c => String(c[0]).includes('openstates'));
  expect(openStatesCalls).toEqual([]);
});

function rep(bioguideId: string, state: string, chamber: 'House' | 'Senate', district?: string) {
  return { bioguideId, name: bioguideId, party: 'X', state, chamber, district, title: '' };
}

function sld(geoid: string, name = 'District') {
  return { geoid, number: geoid.slice(2).replace(/^0+/, ''), name };
}

function geocoded(parts: Partial<ParsedDistrictInfo>): ParsedDistrictInfo {
  return {
    matchedAddress: '1 MAIN ST',
    coordinates: { lat: 0, lon: 0 },
    upperDistrict: null,
    lowerDistrict: null,
    sldVintage: '2024',
    ...parts,
  };
}

const address = { street: '1 Main St', city: 'Anytown', state: 'MI' };

describe('resolveByAddress', () => {
  it("names Michigan's senators, House member and both state legislators", async () => {
    geocode.mockResolvedValue(
      geocoded({
        congressionalDistrict: sld('2613'),
        upperDistrict: sld('26001'),
        lowerDistrict: sld('26001'),
      })
    );
    const r = await resolveByAddress(address);

    expect(r.state).toBe('MI');
    expect(r.federal?.map(m => m.bioguideId).sort()).toEqual(['MI0', 'MI1', 'MI13']);
    expect(r.stateSeats.map(s => [s.censusChamber, s.districts, s.status])).toEqual([
      ['upper', ['1'], 'found'],
      ['lower', ['1'], 'found'],
    ]);
    for (const seat of r.stateSeats) {
      expect(seat.members.every(m => m.district === '1' && !m.atLarge)).toBe(true);
    }
  });

  it('keeps Minnesota House 62A apart from 62B', async () => {
    geocode.mockResolvedValue(geocoded({ lowerDistrict: sld('2762A') }));
    const r = await resolveByAddress({ ...address, state: 'MN' });

    const [seat] = r.stateSeats;
    expect(seat?.districts).toEqual(['62A']);
    expect(seat?.members.length).toBe(1);
    expect(seat?.members[0]?.district).toBe('62A');
  });

  it("lists both of an Idaho district's House members", async () => {
    geocode.mockResolvedValue(geocoded({ lowerDistrict: sld('16016') }));
    const r = await resolveByAddress({ ...address, state: 'ID' });

    expect(r.stateSeats[0]?.members.map(m => m.district).sort()).toEqual(['16A', '16B']);
  });

  it("finds DC's delegate, ward member and at-large council", async () => {
    geocode.mockResolvedValue(
      geocoded({ congressionalDistrict: sld('1198'), upperDistrict: sld('11001') })
    );
    const r = await resolveByAddress({ ...address, state: 'DC' });

    // Census codes the delegate seat 98; the roster stores it as 0.
    expect(r.federal?.map(m => m.bioguideId)).toEqual(['DC0']);

    const members = r.stateSeats[0]?.members ?? [];
    expect(members[0]).toMatchObject({ district: 'Ward 1', atLarge: false });
    expect(members.filter(m => m.atLarge).length).toBeGreaterThanOrEqual(4);
    // DC's council sorts as the lower bucket, matching the hub roster.
    const buckets = stateMembersByBucket(r.stateSeats);
    expect(buckets.upper).toEqual([]);
    expect(buckets.lower.length).toBe(members.length);
  });

  it("finds an at-large state's single House member", async () => {
    geocode.mockResolvedValue(geocoded({ congressionalDistrict: sld('0200') }));
    const r = await resolveByAddress({ ...address, state: 'AK' });

    expect(r.federal?.map(m => m.bioguideId).sort()).toEqual(['AK0', 'AKS']);
  });

  it('trusts the geocoded state over the one typed in', async () => {
    geocode.mockResolvedValue(geocoded({ congressionalDistrict: sld('2612') }));
    const r = await resolveByAddress({ ...address, state: 'OH' });

    expect(r.state).toBe('MI');
    expect(r.federal?.map(m => m.bioguideId)).toContain('MI12');
  });

  it('notes the New Hampshire floterial gap', async () => {
    geocode.mockResolvedValue(geocoded({ lowerDistrict: sld('33001') }));
    const r = await resolveByAddress({ ...address, state: 'NH' });

    expect(r.stateSeats[0]?.status).toBe('found');
    expect(r.stateSeats[0]?.note).toMatch(/floterial/);
  });

  it('refuses to read GEOIDs from another Census vintage against the keys', async () => {
    geocode.mockResolvedValue(
      geocoded({ upperDistrict: sld('26001'), lowerDistrict: sld('26001'), sldVintage: '2026' })
    );
    const r = await resolveByAddress(address);

    expect(r.stateSeats.map(s => [s.status, s.members.length])).toEqual([
      ['unmapped', 0],
      ['unmapped', 0],
    ]);
  });

  it('reports the federal roster as unavailable rather than empty', async () => {
    allReps.mockRejectedValueOnce(new Error('down'));
    geocode.mockResolvedValue(geocoded({ congressionalDistrict: sld('2613') }));
    const r = await resolveByAddress(address);

    expect(r.federal).toBeNull();
  });
});

describe('districtLookup (state-legislators-by-address)', () => {
  it('returns the 62A member, not whichever 62 came first', async () => {
    const result = await districtLookup.findLegislatorsByDistrict({
      state: 'MN',
      districts: { upperDistrict: null, lowerDistrict: sld('2762B'), sldVintage: '2024' },
    });

    expect(result.representative?.district).toBe('62B');
    expect(result.senator).toBeNull();
  });
});

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Census SLD GEOID → OpenStates district keys (PLAN-search-growth Phase 4a).
 *
 * The builder cases pin the naming rules for the states whose districts aren't
 * plain numbers. The committed-file cases fail when a corpus sync renames a
 * district the keys still point at — re-run scripts/sync-sld-district-keys.ts.
 */

import {
  buildSldDistrictKeys,
  censusLabel,
  isNonGeographicDistrict,
  type CensusSld,
  type CorpusSeat,
} from '@/lib/data-sources/sld-district-keys/build-keys';
import { corpusDistrictsForGeoid, SLD_KEYS_VINTAGE } from '@/lib/data-sources/sld-district-keys';
import { getAllPeople } from '@/lib/data-sources/openstates-people/load-people';
import keysFile from '@/data/sld-district-keys.json';
import { STATE_FIPS_TO_CODE } from '@/lib/data/us-states';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

describe('censusLabel', () => {
  it.each([
    ['State Senate District 12', '12'],
    ['State House District 62A', '62A'],
    ['Assembly District 01', '1'],
    ['State Senate District A', 'A'],
    ['Legislative (House) District 1', '1'],
    ['Delegate District 3', '3'],
    ['1st Barnstable District', '1st Barnstable'],
    ['Berkshire-Hampden-Franklin-Hampshire District', 'Berkshire-Hampden-Franklin-Hampshire'],
    ['Addison-1 State House District', 'Addison-1'],
    ['Addison Senatorial District', 'Addison'],
    ['State House District Belknap 01', 'Belknap 1'],
    ['Ward 1', 'Ward 1'],
  ])('%s → %s', (name, label) => {
    expect(censusLabel(name)).toBe(label);
  });
});

describe('buildSldDistrictKeys', () => {
  const fips = {
    '02': 'AK',
    '11': 'DC',
    '16': 'ID',
    '25': 'MA',
    '27': 'MN',
    '33': 'NH',
    '50': 'VT',
  };
  const census = (geoid: string, name: string, chamber: 'upper' | 'lower'): CensusSld => ({
    geoid,
    name,
    chamber,
  });
  const seat = (state: string, chamber: CorpusSeat['chamber'], district: string): CorpusSeat => ({
    state,
    chamber,
    district,
  });

  const corpus: CorpusSeat[] = [
    seat('MN', 'lower', '62A'),
    seat('MN', 'lower', '62B'),
    seat('ID', 'lower', '16A'),
    seat('ID', 'lower', '16B'),
    seat('AK', 'upper', 'K'),
    seat('MA', 'lower', '7th Hampden'),
    seat('MA', 'lower', '7th Suffolk'),
    seat('MA', 'upper', 'Berkshire, Hampden, Franklin and Hampshire'),
    seat('VT', 'upper', 'Chittenden Southeast'),
    seat('DC', 'legislature', 'Ward 1'),
    seat('DC', 'legislature', 'At-Large'),
    seat('NH', 'lower', 'Belknap 1'),
    seat('NH', 'lower', 'Belknap 8'),
  ];

  const built = buildSldDistrictKeys(
    [
      census('2762A', 'State House District 62A', 'lower'),
      census('2762B', 'State House District 62B', 'lower'),
      census('16016', 'State Legislative District 16', 'lower'),
      census('0200K', 'State Senate District K', 'upper'),
      census('25H07', '7th Hampden District', 'lower'),
      census('25H99', '16th Middlesex District', 'lower'),
      census('25D01', 'Berkshire-Hampden-Franklin-Hampshire District', 'upper'),
      census('50CSE', 'Chittenden South East Senatorial District', 'upper'),
      census('11001', 'Ward 1', 'upper'),
      census('33B01', 'State House District Belknap 01', 'lower'),
      census('33Q01', 'Somewhere Else District', 'lower'),
    ],
    corpus,
    fips
  );

  it('keeps Minnesota A and B seats apart', () => {
    expect(built.lower['2762A']).toBe('62A');
    expect(built.lower['2762B']).toBe('62B');
  });

  it('maps one Idaho district to both of its lettered seats', () => {
    expect(built.lower['16016']).toEqual(['16A', '16B']);
  });

  it('maps Alaska Senate letters', () => {
    expect(built.upper['0200K']).toBe('K');
  });

  it('matches Massachusetts names exactly, not by their first number', () => {
    expect(built.lower['25H07']).toBe('7th Hampden');
  });

  it('matches names that differ only in punctuation and "and"', () => {
    expect(built.upper['25D01']).toBe('Berkshire, Hampden, Franklin and Hampshire');
  });

  it('applies the Vermont alias', () => {
    expect(built.upper['50CSE']).toBe('Chittenden Southeast');
  });

  it('places DC wards from the Census upper layer onto the unicameral council', () => {
    expect(built.upper['11001']).toBe('Ward 1');
  });

  it('keys a self-naming district with no sitting member as a vacancy', () => {
    expect(built.lower['25H99']).toBe('16th Middlesex');
    expect(built.report.noSittingMember['MA-lower']).toEqual(['16th Middlesex']);
  });

  it('reports a label it cannot place instead of guessing', () => {
    expect(built.lower['33Q01']).toBeUndefined();
    expect(built.report.unmapped['NH-lower']).toEqual(['Somewhere Else District']);
  });

  it('reports corpus districts no GEOID reaches, ignoring at-large seats', () => {
    expect(built.report.unreached['NH-lower']).toEqual(['Belknap 8']);
    expect(built.report.unreached['DC-upper']).toBeUndefined();
  });

  it('rejects an alias that names no corpus district', () => {
    expect(() => buildSldDistrictKeys([], corpus, fips, { 'VT-upper': { X: 'Nowhere' } })).toThrow(
      /not a corpus district/
    );
  });

  it('treats at-large seats and tribal representatives as non-geographic', () => {
    expect(isNonGeographicDistrict('At-Large')).toBe(true);
    expect(isNonGeographicDistrict('Chairman')).toBe(true);
    expect(isNonGeographicDistrict('Passamaquoddy Tribe')).toBe(true);
    expect(isNonGeographicDistrict('62A')).toBe(false);
  });
});

describe('committed src/data/sld-district-keys.json', () => {
  it('is built from the vintage the geocoder serves for sitting officeholders', () => {
    // census-vintage.ts pins ACS2025_Current (2024 SLDs) until 2027-01-03.
    expect(SLD_KEYS_VINTAGE).toBe('2024');
  });

  it('covers every state legislative district in the country', () => {
    expect(Object.keys(keysFile.upper).length).toBeGreaterThan(1900);
    expect(Object.keys(keysFile.lower).length).toBeGreaterThan(4800);
  });

  it('reaches every geographic corpus district except New Hampshire floterials', async () => {
    const all = await getAllPeople();
    if (!all) throw new Error('corpus unavailable');

    const reached = new Set<string>();
    for (const chamber of ['upper', 'lower'] as const) {
      for (const [geoid, key] of Object.entries(
        keysFile[chamber] as Record<string, string | string[]>
      )) {
        const state = STATE_FIPS_TO_CODE[geoid.slice(0, 2)];
        for (const d of Array.isArray(key) ? key : [key]) reached.add(`${state}|${d}`);
      }
    }

    const unreached = all.people
      .filter(p => !isNonGeographicDistrict(p.district))
      .filter(p => !(p.jurisdiction === 'NH' && p.chamber === 'lower'))
      .filter(p => !reached.has(`${p.jurisdiction}|${p.district}`))
      .map(p => `${p.jurisdiction} ${p.chamber} ${p.district}`);
    expect([...new Set(unreached)]).toEqual([]);
  });

  it('resolves GEOIDs through the runtime reader', () => {
    expect(corpusDistrictsForGeoid('lower', '2762A')).toEqual(['62A']);
    expect(corpusDistrictsForGeoid('upper', '11001')).toEqual(['Ward 1']);
    expect(corpusDistrictsForGeoid('lower', '16016')).toEqual(['16A', '16B']);
    expect(corpusDistrictsForGeoid('lower', '99999')).toBeNull();
  });
});

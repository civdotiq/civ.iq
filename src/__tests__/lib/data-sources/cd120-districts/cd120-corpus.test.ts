/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  buildCd120Corpus,
  normalizeDistrictCode,
} from '@/lib/data-sources/cd120-districts/cd120-corpus';
import type { OgrFeatureCollection } from '@/lib/data-sources/cd120-districts/cd120-corpus';

const FIPS = { '22': 'LA', '02': 'AK', '11': 'DC' };

function feature(
  props: Partial<OgrFeatureCollection['features'][number]['properties']>,
  coordinates: number[][][] = [
    [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 0],
    ],
  ]
): OgrFeatureCollection['features'][number] {
  return {
    properties: {
      STATEFP: '22',
      CD120FP: '04',
      GEOID: '2204',
      NAMELSAD: 'Congressional District 4',
      CDSESSN: '120',
      ...props,
    },
    geometry: { type: 'Polygon', coordinates },
  };
}

function build(features: OgrFeatureCollection['features']) {
  return buildCd120Corpus({
    collection: { type: 'FeatureCollection', features },
    fipsToState: FIPS,
    generatedAt: '2026-08-07T00:00:00.000Z',
    source: 'https://example.test/gdb.zip',
    toleranceDegrees: 0.0002,
  });
}

describe('normalizeDistrictCode', () => {
  it('strips leading zeros from numbered districts', () => {
    expect(normalizeDistrictCode('04')).toBe('4');
    expect(normalizeDistrictCode('13')).toBe('13');
  });

  it('maps at-large and delegate codes to AL, matching the geocoder parser', () => {
    expect(normalizeDistrictCode('00')).toBe('AL');
    expect(normalizeDistrictCode('98')).toBe('AL');
  });
});

describe('buildCd120Corpus', () => {
  it('normalizes rows, wraps Polygon as MultiPolygon and computes bboxes', () => {
    const corpus = build([feature({})]);
    expect(corpus.districts).toHaveLength(1);
    const row = corpus.districts[0];
    expect(row).toMatchObject({
      state: 'LA',
      stateFips: '22',
      code: '04',
      district: '4',
      geoid: '2204',
    });
    expect(row?.geometry).toHaveLength(1);
    expect(row?.bbox).toEqual([0, 0, 1, 1]);
  });

  it('drops the ZZ undefined-district water areas', () => {
    const corpus = build([
      feature({}),
      feature({ CD120FP: 'ZZ', GEOID: '22ZZ', NAMELSAD: 'Congressional Districts not defined' }),
    ]);
    expect(corpus.districts).toHaveLength(1);
  });

  it('refuses a feature from the wrong session', () => {
    expect(() => build([feature({ CDSESSN: '119' })])).toThrow(/CDSESSN=120/);
  });

  it('refuses an unknown state FIPS rather than guessing', () => {
    expect(() => build([feature({ STATEFP: '99', GEOID: '9904' })])).toThrow(/Unknown state FIPS/);
  });

  it('refuses an empty extraction', () => {
    expect(() => build([])).toThrow(/No districts/);
  });

  it('sorts by GEOID so the committed artifact diffs cleanly', () => {
    const corpus = build([
      feature({ STATEFP: '11', CD120FP: '98', GEOID: '1198' }),
      feature({ STATEFP: '02', CD120FP: '00', GEOID: '0200' }),
    ]);
    expect(corpus.districts.map(d => d.geoid)).toEqual(['0200', '1198']);
    expect(corpus.districts.map(d => d.district)).toEqual(['AL', 'AL']);
  });
});

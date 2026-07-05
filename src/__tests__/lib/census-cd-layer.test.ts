/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The Census geocoder names its congressional-district layer by Congress
 * ("119th Congressional Districts" today, "120th ..." after Jan 2027).
 * findCongressionalDistrictLayer must keep working across that rename
 * without code changes (2026-07 audit item 3 — replaces a hardcoded key).
 */

import { findCongressionalDistrictLayer } from '@/lib/census-geocoder';

const entry = (name: string) => [{ GEOID: '4810', NAME: name, STATE: '48', BASENAME: '10' }];

describe('findCongressionalDistrictLayer', () => {
  it('finds the 119th layer (current Census naming)', () => {
    const result = findCongressionalDistrictLayer({
      '119th Congressional Districts': entry('cd-119'),
      Counties: entry('county'),
    });
    expect(result?.[0]?.NAME).toBe('cd-119');
  });

  it('finds a future 120th layer without code changes', () => {
    const result = findCongressionalDistrictLayer({
      '120th Congressional Districts': entry('cd-120'),
    });
    expect(result?.[0]?.NAME).toBe('cd-120');
  });

  it('prefers the newest Congress layer when several are present', () => {
    const result = findCongressionalDistrictLayer({
      '119th Congressional Districts': entry('cd-119'),
      '120th Congressional Districts': entry('cd-120'),
    });
    expect(result?.[0]?.NAME).toBe('cd-120');
  });

  it('handles ordinal suffixes beyond -th (121st Congressional Districts)', () => {
    const result = findCongressionalDistrictLayer({
      '121st Congressional Districts': entry('cd-121'),
    });
    expect(result?.[0]?.NAME).toBe('cd-121');
  });

  it('falls back to the legacy congressionalDistricts field', () => {
    const result = findCongressionalDistrictLayer({
      congressionalDistricts: entry('legacy'),
    });
    expect(result?.[0]?.NAME).toBe('legacy');
  });

  it('falls back to the legacy "Congressional Districts" field', () => {
    const result = findCongressionalDistrictLayer({
      'Congressional Districts': entry('legacy-spaced'),
    });
    expect(result?.[0]?.NAME).toBe('legacy-spaced');
  });

  it('ignores empty layers and unrelated geographies', () => {
    const result = findCongressionalDistrictLayer({
      '119th Congressional Districts': [],
      'ZIP Code Tabulation Areas': entry('zcta'),
    });
    expect(result).toBeUndefined();
  });

  it('returns undefined for undefined geographies', () => {
    expect(findCongressionalDistrictLayer(undefined)).toBeUndefined();
  });
});

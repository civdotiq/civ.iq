/**
 * ZIP → Congressional District mapping invariants.
 *
 * ZIP-to-district boundaries are structurally static between redistricting
 * cycles. Until the next cycle (post-2031), the shape of this file should
 * not drift. These tests pin the row counts so that an accidental mutation
 * or an unexpected upstream regeneration surfaces loudly instead of silently
 * degrading downstream geolocation.
 */

import {
  ZIP_TO_DISTRICT_MAP_119TH,
  ZIP_MAPPING_STATS,
} from '@/lib/data/zip-district-mapping-119th';

describe('ZIP → Congressional District mapping (119th Congress)', () => {
  const entries = Object.entries(ZIP_TO_DISTRICT_MAP_119TH);
  const multiDistrict = entries.filter(([, value]) => Array.isArray(value));
  const singleDistrict = entries.filter(([, value]) => !Array.isArray(value));

  it('preserves the total ZIP entry count', () => {
    expect(entries.length).toBe(ZIP_MAPPING_STATS.totalZips);
  });

  it('preserves the multi-district ZIP count', () => {
    expect(multiDistrict.length).toBe(ZIP_MAPPING_STATS.multiDistrictZips);
  });

  it('preserves the single-district ZIP count', () => {
    expect(singleDistrict.length).toBe(ZIP_MAPPING_STATS.singleDistrictZips);
  });

  it('documents the expected refresh trigger', () => {
    expect(ZIP_MAPPING_STATS.nextExpectedRefresh).toMatch(/2031/);
  });
});

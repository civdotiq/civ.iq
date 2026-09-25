/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * @jest-environment node
 */

import { censusCongressionalDistrictCode } from '@/lib/data/us-states';
import { parseDistrictId } from '@/lib/services/spending.service';

describe('censusCongressionalDistrictCode', () => {
  it('codes DC and territory delegate seats as 98, whatever the page ID says', () => {
    for (const [state, district] of [
      ['DC', 'AL'],
      ['DC', '00'],
      ['DC', '0'],
      ['PR', 'AL'],
      ['gu', '00'],
    ] as const) {
      expect(censusCongressionalDistrictCode(state, district)).toBe('98');
    }
  });

  it('codes at-large states as 00 and pads numbered districts', () => {
    expect(censusCongressionalDistrictCode('WY', 'AL')).toBe('00');
    expect(censusCongressionalDistrictCode('WY', '0')).toBe('00');
    expect(censusCongressionalDistrictCode('MI', '5')).toBe('05');
    expect(censusCongressionalDistrictCode('CA', '12')).toBe('12');
  });
});

describe('parseDistrictId (USASpending district_current)', () => {
  it('sends 98 for DC so awards are found (00 returned zero awards)', () => {
    expect(parseDistrictId('DC-AL')).toEqual({ state: 'DC', district: '98' });
    expect(parseDistrictId('DC-00')).toEqual({ state: 'DC', district: '98' });
    expect(parseDistrictId('WY-AL')).toEqual({ state: 'WY', district: '00' });
    expect(parseDistrictId('MI-5')).toEqual({ state: 'MI', district: '05' });
  });
});

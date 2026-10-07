/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  HOUSE_SEATS_PER_STATE,
  checkDistrictId,
  houseDistrictIds,
} from '@/lib/districts/known-districts';

const DELEGATE_SEATS = ['DC', 'PR', 'VI', 'GU', 'AS', 'MP'];

describe('known congressional districts', () => {
  it('has 435 voting seats plus 6 delegate seats', () => {
    const voting = Object.entries(HOUSE_SEATS_PER_STATE)
      .filter(([state]) => !DELEGATE_SEATS.includes(state))
      .reduce((sum, [, seats]) => sum + seats, 0);
    expect(voting).toBe(435);
    expect(houseDistrictIds()).toHaveLength(441);
  });

  it('names single-seat states and delegate seats at-large', () => {
    const ids = houseDistrictIds();
    expect(ids).toEqual(expect.arrayContaining(['AK-AL', 'WY-AL', 'DC-AL', 'PR-AL']));
    expect(ids).not.toContain('AK-01');
    expect(ids).toEqual(expect.arrayContaining(['MI-01', 'MI-13', 'CA-52']));
  });

  it.each([
    ['MI', '12'],
    ['MI', '01'],
    ['CA', '52'],
    ['AK', 'AL'],
    ['DC', 'AL'],
    ['MI', 'STATE'],
  ])('%s-%s is a known page', (state, district) => {
    expect(checkDistrictId(state, district)).toEqual({ kind: 'known' });
  });

  it.each([
    ['MI', '99'],
    ['MI', '14'],
    ['MI', '00'],
    ['MI', 'AL'],
    ['CA', '53'],
    ['XX', '01'],
    ['DC', 'STATE'],
    ['PR', 'STATE'],
    ['MI', 'SENATE'],
  ])('%s-%s is not a page', (state, district) => {
    expect(checkDistrictId(state, district)).toEqual({ kind: 'unknown' });
  });

  it('sends a numbered single seat to its at-large page', () => {
    expect(checkDistrictId('AK', '01')).toEqual({ kind: 'at-large', canonical: 'AK-AL' });
    expect(checkDistrictId('DC', '01')).toEqual({ kind: 'at-large', canonical: 'DC-AL' });
    expect(checkDistrictId('AK', '02')).toEqual({ kind: 'unknown' });
  });
});

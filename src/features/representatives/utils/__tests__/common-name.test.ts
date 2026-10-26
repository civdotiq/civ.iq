/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import {
  commonName,
  goesByName,
  officialNameIfDifferent,
  type LegislatorNameParts,
} from '../common-name';

describe('commonName', () => {
  it('uses the nickname with the last name', () => {
    expect(
      commonName({
        name: 'Bernard Sanders',
        fullName: { last: 'Sanders', nickname: 'Bernie' },
      })
    ).toBe('Bernie Sanders');
  });

  it('keeps the listed name when there is no nickname', () => {
    expect(commonName({ name: 'Nancy Pelosi', fullName: { last: 'Pelosi' } })).toBe('Nancy Pelosi');
    expect(commonName({ name: 'Nancy Pelosi' })).toBe('Nancy Pelosi');
  });

  it('ignores a blank nickname', () => {
    expect(commonName({ name: 'Josh Riley', fullName: { last: 'Riley', nickname: '  ' } })).toBe(
      'Josh Riley'
    );
  });
});

describe('goesByName', () => {
  it.each<[string, LegislatorNameParts, string]>([
    [
      'nickname',
      { first: 'Bernard', last: 'Sanders', nickname: 'Bernie', official_full: 'Bernard Sanders' },
      'Bernie Sanders',
    ],
    [
      'nickname over a middle name',
      {
        first: 'Margaret',
        middle: 'Wood',
        last: 'Hassan',
        nickname: 'Maggie',
        official_full: 'Margaret Wood Hassan',
      },
      'Maggie Hassan',
    ],
    [
      'official name with a used middle name',
      {
        first: 'Eleanor',
        middle: 'Holmes',
        last: 'Norton',
        official_full: 'Eleanor Holmes Norton',
      },
      'Eleanor Holmes Norton',
    ],
    [
      'official name without a middle initial',
      { first: 'Richard', middle: 'J.', last: 'Durbin', official_full: 'Richard J. Durbin' },
      'Richard Durbin',
    ],
    [
      'official name without a leading initial',
      { first: 'H.', middle: 'Morgan', last: 'Griffith', official_full: 'H. Morgan Griffith' },
      'Morgan Griffith',
    ],
    [
      'official name without a generational suffix',
      {
        first: 'Gilbert',
        middle: 'Ray',
        last: 'Cisneros',
        suffix: 'Jr.',
        official_full: 'Gilbert Ray Cisneros, Jr.',
      },
      'Gilbert Ray Cisneros',
    ],
    [
      'nickname without a suffix',
      {
        first: 'Henry',
        last: 'Johnson',
        suffix: 'Jr.',
        nickname: 'Hank',
        official_full: 'Henry C. "Hank" Johnson, Jr.',
      },
      'Hank Johnson',
    ],
    [
      'roman numeral suffix',
      { first: 'William', last: 'Timmons', suffix: 'IV', official_full: 'William R. Timmons IV' },
      'William Timmons',
    ],
    ['first and last without an official name', { first: 'Ed', last: 'Case' }, 'Ed Case'],
  ])('%s', (_, parts, expected) => {
    expect(goesByName(parts)).toBe(expected);
  });
});

describe('officialNameIfDifferent', () => {
  it('gives the official name when the page uses another', () => {
    expect(
      officialNameIfDifferent({
        name: 'Bernie Sanders',
        fullName: {
          first: 'Bernard',
          last: 'Sanders',
          nickname: 'Bernie',
          official: 'Bernard Sanders',
        },
      })
    ).toBe('Bernard Sanders');
  });

  it('is undefined when the names match', () => {
    expect(
      officialNameIfDifferent({
        name: 'Eleanor Holmes Norton',
        fullName: { first: 'Eleanor', last: 'Norton', official: 'Eleanor Holmes Norton' },
      })
    ).toBeUndefined();
  });
});

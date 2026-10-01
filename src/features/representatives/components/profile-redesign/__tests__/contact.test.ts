/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { dcOfficeLines, safeHttpUrl, telHref } from '../contact';

describe('safeHttpUrl', () => {
  it('keeps http(s) URLs', () => {
    expect(safeHttpUrl('https://patronis.house.gov/contact/email-me')).toBe(
      'https://patronis.house.gov/contact/email-me'
    );
  });

  it('rejects the malformed roster value and other schemes', () => {
    expect(safeHttpUrl('hhttps://fine.house.gov/address_authentication')).toBeUndefined();
    expect(safeHttpUrl('javascript:alert(1)')).toBeUndefined();
    expect(safeHttpUrl('not a url')).toBeUndefined();
    expect(safeHttpUrl(undefined)).toBeUndefined();
  });
});

describe('telHref', () => {
  it('builds an E.164 tel: link', () => {
    expect(telHref('202-225-5126')).toBe('tel:+12022255126');
    expect(telHref('(202) 224-3441')).toBe('tel:+12022243441');
    expect(telHref('1-202-224-3441')).toBe('tel:+12022243441');
  });

  it('returns undefined for missing or partial numbers', () => {
    expect(telHref(undefined)).toBeUndefined();
    expect(telHref('224-3441')).toBeUndefined();
  });
});

describe('dcOfficeLines', () => {
  it('splits the roster address into street and city lines', () => {
    expect(dcOfficeLines('2438 Rayburn House Office Building Washington DC 20515-2212')).toEqual([
      '2438 Rayburn House Office Building',
      'Washington, DC 20515-2212',
    ]);
    expect(dcOfficeLines('511 Hart Senate Office Building Washington DC 20510')).toEqual([
      '511 Hart Senate Office Building',
      'Washington, DC 20510',
    ]);
  });

  it('keeps an unrecognised address whole and drops empty ones', () => {
    expect(dcOfficeLines('Room 100, Somewhere')).toEqual(['Room 100, Somewhere']);
    expect(dcOfficeLines('  ')).toEqual([]);
    expect(dcOfficeLines(undefined)).toEqual([]);
  });
});

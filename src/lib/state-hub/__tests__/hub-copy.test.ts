/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { compareDistricts, getHubCopy, isAtLargeDistrict, rosterPartyLabel } from '../hub-copy';

const base = { legislatureName: 'X Legislature', memberCount: 100 };

describe('getHubCopy', () => {
  it('asks the searched question and names both offices', () => {
    const copy = getHubCopy({
      stateCode: 'MI',
      stateName: 'Michigan',
      legislatureName: 'Michigan Legislature',
      memberCount: 148,
    });
    expect(copy.title).toBe('Who Is My Michigan State Representative?');
    expect(copy.h1).toBe('Who is my state representative in Michigan?');
    expect(copy.lede).toContain('your State Senator and your State Representative,');
    expect(copy.description).toContain('all 148 members of the Michigan Legislature');
  });

  it('uses the real lower-house title where it differs', () => {
    expect(getHubCopy({ ...base, stateCode: 'CA', stateName: 'California' }).lede).toContain(
      'State Senator and your Assemblymember'
    );
    expect(getHubCopy({ ...base, stateCode: 'MD', stateName: 'Maryland' }).lede).toContain(
      'your Delegate'
    );
  });

  it('pluralizes chambers with multi-member districts', () => {
    const copy = getHubCopy({
      ...base,
      stateCode: 'AZ',
      stateName: 'Arizona',
      multiMember: { upper: false, lower: true },
    });
    expect(copy.lede).toContain('your State Senator and your State Representatives');
  });

  it('has its own wording for Nebraska, DC and Puerto Rico', () => {
    const ne = getHubCopy({ ...base, stateCode: 'NE', stateName: 'Nebraska' });
    expect(ne.h1).toBe('Who is my state senator in Nebraska?');
    expect(ne.lede).toContain('nonpartisan');

    const dc = getHubCopy({ ...base, stateCode: 'DC', stateName: 'District of Columbia' });
    expect(dc.title).toBe('Who Is My DC Councilmember?');
    expect(dc.lede).toContain('at-large');

    const pr = getHubCopy({ ...base, stateCode: 'PR', stateName: 'Puerto Rico' });
    expect(pr.h1).toBe('Who is my legislator in Puerto Rico?');
  });
});

describe('roster helpers', () => {
  it('reads fusion tickets as the major party', () => {
    expect(rosterPartyLabel('Democratic-Farmer-Labor')).toBe('Democratic');
    expect(rosterPartyLabel('Republican/Conservative')).toBe('Republican');
    expect(rosterPartyLabel('Nonpartisan')).toBe('Nonpartisan');
    expect(rosterPartyLabel('')).toBe('Unknown');
  });

  it('sorts districts naturally', () => {
    expect(['10', '2', '62B', '62A', '1'].sort(compareDistricts)).toEqual([
      '1',
      '2',
      '10',
      '62A',
      '62B',
    ]);
  });

  it('recognizes at-large seats', () => {
    expect(isAtLargeDistrict('At-Large')).toBe(true);
    expect(isAtLargeDistrict('Chairman')).toBe(true);
    expect(isAtLargeDistrict('Ward 1')).toBe(false);
  });
});

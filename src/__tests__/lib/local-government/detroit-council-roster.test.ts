/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  DETROIT_COUNCIL_SEATS,
  getDetroitCouncilMembers,
  getDetroitMembersForDistrict,
} from '@/lib/local-government/detroit-council-roster';

describe('Detroit council roster corpus', () => {
  it('has nine seats: seven districts and two at-large', () => {
    expect(DETROIT_COUNCIL_SEATS).toHaveLength(9);
    const districts = DETROIT_COUNCIL_SEATS.filter(s => s.district !== null).map(s => s.district);
    expect([...districts].sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(DETROIT_COUNCIL_SEATS.filter(s => s.district === null)).toHaveLength(2);
  });

  it('has exactly one Council President and one Pro Tem', () => {
    const titles = DETROIT_COUNCIL_SEATS.map(s => s.title).filter(Boolean);
    expect(titles).toHaveLength(2);
    expect(titles).toContain('City Council President');
    expect(titles).toContain('City Council President Pro Tem');
  });

  it('maps a district to its member plus both at-large members', () => {
    const district6 = getDetroitMembersForDistrict(6);
    expect(district6).toHaveLength(3);
    expect(district6[0]?.district).toBe(6);
    expect(district6.slice(1).every(s => s.district === null)).toBe(true);
  });

  it('returns [] for a district Detroit does not have', () => {
    expect(getDetroitMembersForDistrict(8)).toEqual([]);
    expect(getDetroitMembersForDistrict(0)).toEqual([]);
  });

  it('serves route-shaped members with real websites and no fabricated contact data', () => {
    const members = getDetroitCouncilMembers();
    expect(members).toHaveLength(9);
    for (const member of members) {
      expect(member.website).toMatch(/^https:\/\/detroitmi\.gov\//);
      expect(member.active).toBe(true);
      // Fields we have not verified stay null rather than guessed
      expect(member.email).toBeNull();
      expect(member.phone).toBeNull();
      expect(member.startDate).toBeNull();
    }
  });
});

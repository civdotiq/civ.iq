/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { membersForSeat, type LookupLegislator } from '../lookup-match';
import type { HubMember } from '../types';

function member(
  id: string,
  district: string,
  chamber: 'upper' | 'lower' = 'lower',
  atLarge = false
): HubMember {
  return { id, name: id, district, party: 'Democratic', chamber, url: `/p/${id}`, atLarge };
}

function api(id: string, district: string): LookupLegislator {
  return { id, name: `API ${id}`, party: 'Republican', district };
}

const url = (l: LookupLegislator) => `/api-profile/${l.id}`;

describe('membersForSeat', () => {
  it('returns the one member of a single-member district', () => {
    const roster = [member('a', '1'), member('b', '2'), member('s', '1', 'upper')];
    const seat = membersForSeat(roster, 'lower', api('b', '2'), undefined, url);
    expect(seat.district).toBe('2');
    expect(seat.members.map(m => m.id)).toEqual(['b']);
  });

  it('lists every member of a multi-member district, not just the one the API named', () => {
    // Arizona / New Jersey: two House members per district.
    const roster = [member('a1', '7'), member('a2', '7'), member('b1', '8'), member('b2', '8')];
    const seat = membersForSeat(roster, 'lower', api('a2', '7'), undefined, url);
    expect(seat.members.map(m => m.id).sort()).toEqual(['a1', 'a2']);
  });

  it('adds at-large members to every address', () => {
    // DC: ward member plus the at-large members and Chairman.
    const roster = [
      member('w1', 'Ward 1'),
      member('w2', 'Ward 2'),
      member('al1', 'At-Large', 'lower', true),
      member('chair', 'Chairman', 'lower', true),
    ];
    const seat = membersForSeat(roster, 'lower', api('w2', 'Ward 2'), undefined, url);
    expect(seat.district).toBe('Ward 2');
    expect(seat.members.map(m => m.id)).toEqual(['w2', 'al1', 'chair']);
  });

  it('does not guess a ward when the API only named an at-large member', () => {
    const roster = [member('w1', 'Ward 1'), member('al1', 'At-Large', 'lower', true)];
    const seat = membersForSeat(roster, 'lower', api('al1', 'At-Large'), undefined, url);
    expect(seat.district).toBeNull();
    expect(seat.members.map(m => m.id)).toEqual(['al1']);
  });

  it('falls back to the Census district number only when the API returned nobody', () => {
    const roster = [member('a', '81'), member('b', '9')];
    const seat = membersForSeat(roster, 'lower', undefined, '081', url);
    expect(seat.members.map(m => m.id)).toEqual(['a']);
  });

  it('never matches a named district by number', () => {
    const roster = [member('a', 'Rockingham 30'), member('b', '62A')];
    const seat = membersForSeat(roster, 'lower', undefined, '030', url);
    expect(seat).toEqual({ district: null, members: [] });
  });

  it('keeps an API legislator the roster does not hold', () => {
    const seat = membersForSeat([], 'upper', api('new', '12'), undefined, url);
    expect(seat.district).toBe('12');
    expect(seat.members).toHaveLength(1);
    expect(seat.members[0]).toMatchObject({ id: 'new', url: '/api-profile/new', chamber: 'upper' });
  });

  it('only matches within the requested chamber', () => {
    const roster = [member('rep', '5', 'lower'), member('sen', '5', 'upper')];
    const seat = membersForSeat(roster, 'upper', api('sen', '5'), undefined, url);
    expect(seat.members.map(m => m.id)).toEqual(['sen']);
  });
});

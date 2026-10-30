/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Each member's roster facts are dated by the upstream commit that last
 * changed them; ID-only and key-order changes don't count.
 */

import {
  applyRosterVersion,
  easternDay,
  rosterFingerprint,
  type RosterEntry,
} from '@/lib/data/member-roster-history';

const graham = (phone: string, extra: Record<string, unknown> = {}): RosterEntry => ({
  id: { bioguide: 'G000608', ...extra },
  name: { first: 'Darline', last: 'Graham Nordone', official_full: 'Darline Graham' },
  bio: { birthday: '1970-01-01' },
  terms: [{ type: 'sen', start: '2026-07-14', end: '2027-01-03', state: 'SC', phone }],
});

describe('applyRosterVersion', () => {
  it('dates a new member, keeps an unchanged one, and re-dates a change', () => {
    let members = applyRosterVersion({}, [graham('')], '2026-07-15T18:00:00Z');
    expect(members.G000608?.changedOn).toBe('2026-07-15');
    members = applyRosterVersion(members, [graham('')], '2026-08-01T12:00:00Z');
    expect(members.G000608?.changedOn).toBe('2026-07-15');
    members = applyRosterVersion(members, [graham('202-224-6121')], '2026-09-02T22:36:13Z');
    expect(members.G000608?.changedOn).toBe('2026-09-02');
  });

  it('drops members no longer listed', () => {
    const members = applyRosterVersion(
      { G000359: { fingerprint: 'x', changedOn: '2025-01-03' } },
      [graham('')],
      '2026-07-15T18:00:00Z'
    );
    expect(Object.keys(members)).toEqual(['G000608']);
  });
});

describe('rosterFingerprint', () => {
  it('ignores IDs and key order, sees a changed fact', () => {
    const a = graham('202-224-6121');
    const b = graham('202-224-6121', { fec: ['S6SC00000'] });
    const reordered: RosterEntry = {
      ...a,
      name: { official_full: 'Darline Graham', last: 'Graham Nordone', first: 'Darline' },
    };
    expect(rosterFingerprint(b)).toBe(rosterFingerprint(a));
    expect(rosterFingerprint(reordered)).toBe(rosterFingerprint(a));
    expect(rosterFingerprint(graham('202-224-0000'))).not.toBe(rosterFingerprint(a));
  });
});

describe('easternDay', () => {
  it('dates a late-evening commit by the day in Washington', () => {
    expect(easternDay('2026-09-03T02:00:00Z')).toBe('2026-09-02');
  });
});

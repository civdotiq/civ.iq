/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import { formerMemberFacts, isFormerMember } from '../former-member';

const NOW = new Date('2026-10-27T12:00:00Z');

describe('isFormerMember', () => {
  it('treats sitting members, including a pending resignation, as current', () => {
    expect(isFormerMember(undefined)).toBe(false);
    expect(isFormerMember('active')).toBe(false);
    expect(isFormerMember('pending_resignation')).toBe(false);
  });

  it('treats members who left as former', () => {
    for (const status of ['resigned', 'expelled', 'deceased', 'retired'] as const) {
      expect(isFormerMember(status)).toBe(true);
    }
  });
});

describe('formerMemberFacts', () => {
  it('long-ago member (Lazarus Shoemaker): service years, no departure date', () => {
    const facts = formerMemberFacts(
      {
        chamber: 'House',
        terms: [
          { startYear: '1873', endYear: '1875', chamber: 'House' },
          { startYear: '1871', endYear: '1873', chamber: 'House' },
        ],
        currentTerm: { start: '1873-03-04', end: '1875-03-03' },
      },
      NOW
    );
    expect(facts.hasRecordOnSite).toBe(false);
    expect(facts.leftOffice).toBeNull();
    expect(facts.service).toEqual([{ chamber: 'House', start: '1871', end: '1875', terms: 2 }]);
  });

  it('member who left during the sitting Congress (Gerald Connolly): term end is the day he left', () => {
    const facts = formerMemberFacts(
      {
        chamber: 'House',
        terms: [
          { startYear: '2025', endYear: '2025', chamber: 'House' },
          { startYear: '2023', endYear: '2025', chamber: 'House' },
          { startYear: '2009', endYear: '2011', chamber: 'House' },
        ],
        currentTerm: { start: '2025-01-03', end: '2025-05-21' },
      },
      NOW
    );
    expect(facts.hasRecordOnSite).toBe(true);
    expect(facts.recordCongress).toBe(119);
    expect(facts.leftOffice).toBe('2025-05-21');
  });

  it('a member whose term ends when the 120th convenes keeps the 119th record while it is served', () => {
    const member = {
      chamber: 'House' as const,
      terms: [{ startYear: '2025', endYear: '2027', chamber: 'House' }],
      currentTerm: { start: '2025-01-03', end: '2027-01-03' },
    };
    const in2027 = formerMemberFacts(member, new Date('2027-02-01T12:00:00Z'));
    expect(in2027.hasRecordOnSite).toBe(true);
    expect(in2027.recordCongress).toBe(119);
    expect(in2027.leftOffice).toBe('2027-01-03');
    // Once the 121st convenes, the 119th is no longer served.
    const in2029 = formerMemberFacts(member, new Date('2029-02-01T12:00:00Z'));
    expect(in2029.hasRecordOnSite).toBe(false);
    expect(in2029.leftOffice).toBeNull();
  });

  it('a term ending on the convening day belongs to the previous Congress', () => {
    const facts = formerMemberFacts(
      {
        chamber: 'House',
        terms: [{ startYear: '2023', endYear: '2025', chamber: 'House' }],
        currentTerm: { start: '2023-01-03', end: '2025-01-03' },
      },
      NOW
    );
    expect(facts.hasRecordOnSite).toBe(false);
  });

  it("uses the vacancy date when the roster still shows the term's scheduled end", () => {
    const facts = formerMemberFacts(
      {
        chamber: 'House',
        terms: [{ startYear: '2025', endYear: '2027', chamber: 'House' }],
        currentTerm: { start: '2025-01-03', end: '2027-01-03' },
        statusEffectiveDate: '2026-04-21',
      },
      NOW
    );
    expect(facts.hasRecordOnSite).toBe(true);
    expect(facts.leftOffice).toBe('2026-04-21');
  });

  it('leaves the departure date out when no record gives one', () => {
    const facts = formerMemberFacts(
      {
        chamber: 'Senate',
        terms: [{ startYear: '2021', endYear: '2027', chamber: 'Senate' }],
        currentTerm: { start: '2021-01-03', end: '2027-01-03' },
        statusEffectiveDate: null,
      },
      NOW
    );
    expect(facts.hasRecordOnSite).toBe(true);
    expect(facts.leftOffice).toBeNull();
  });

  it('lists service in each chamber, oldest first', () => {
    const facts = formerMemberFacts(
      {
        chamber: 'Senate',
        terms: [
          { startYear: '2019', endYear: '2025', chamber: 'Senate' },
          { startYear: '2015', endYear: '2017', chamber: 'House' },
          { startYear: '2013', endYear: '2015', chamber: 'House' },
        ],
        currentTerm: { start: '2019-01-03', end: '2025-01-03' },
      },
      NOW
    );
    expect(facts.service.map(r => `${r.chamber} ${r.start}–${r.end}`)).toEqual([
      'House 2013–2017',
      'Senate 2019–2025',
    ]);
  });
});

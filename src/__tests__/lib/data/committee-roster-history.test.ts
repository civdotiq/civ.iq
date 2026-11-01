/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Committee roster history (src/lib/data/committee-roster-history.ts): a
 * committee page's "Latest record" is the upstream commit that last changed
 * the facts it shows, so the fingerprint must move on exactly those facts.
 */

import {
  applyCommitteeVersion,
  committeeFingerprints,
  type UpstreamCommitteeEntry,
  type UpstreamMembership,
} from '@/lib/data/committee-roster-history';

const COMMITTEES: UpstreamCommitteeEntry[] = [
  {
    thomas_id: 'SSJU',
    name: 'Senate Committee on the Judiciary',
    subcommittees: [
      { thomas_id: '01', name: 'Subcommittee on the Constitution' },
      { thomas_id: '04', name: 'Subcommittee on Crime' },
    ],
  },
  { thomas_id: 'JSPR', name: 'Joint Committee on Printing' },
];

const MEMBERSHIP: UpstreamMembership = {
  SSJU: [
    { bioguide: 'G000386', title: 'Chairman', rank: 1, party: 'majority' },
    { bioguide: 'D000563', title: 'Ranking Member', rank: 1, party: 'minority' },
  ],
  SSJU01: [{ bioguide: 'G000386', rank: 1, party: 'majority' }],
};

describe('committeeFingerprints', () => {
  it('keys a committee by its thomas_id and each subcommittee by its full ID', () => {
    expect(Object.keys(committeeFingerprints(COMMITTEES, MEMBERSHIP)).sort()).toEqual([
      'JSPR',
      'SSJU',
      'SSJU01',
      'SSJU04',
    ]);
  });

  it('ignores member order and does not change for an unrelated committee', () => {
    const base = committeeFingerprints(COMMITTEES, MEMBERSHIP);
    const reordered = committeeFingerprints(COMMITTEES, {
      ...MEMBERSHIP,
      SSJU: [...(MEMBERSHIP.SSJU ?? [])].reverse(),
    });
    expect(reordered).toEqual(base);

    const crimeMoved = committeeFingerprints(COMMITTEES, {
      ...MEMBERSHIP,
      SSJU04: [{ bioguide: 'H000601', rank: 1, party: 'majority' }],
    });
    expect(crimeMoved.SSJU04).not.toBe(base.SSJU04);
    expect(crimeMoved.SSJU).toBe(base.SSJU);
    expect(crimeMoved.SSJU01).toBe(base.SSJU01);
  });

  it('changes when a title, rank or party side changes, or a subcommittee is renamed', () => {
    const base = committeeFingerprints(COMMITTEES, MEMBERSHIP);
    const newRanking = committeeFingerprints(COMMITTEES, {
      ...MEMBERSHIP,
      SSJU: [
        { bioguide: 'G000386', title: 'Chairman', rank: 1, party: 'majority' },
        { bioguide: 'D000563', rank: 2, party: 'minority' },
      ],
    });
    expect(newRanking.SSJU).not.toBe(base.SSJU);

    const renamed = committeeFingerprints(
      [
        {
          ...COMMITTEES[0]!,
          subcommittees: [
            { thomas_id: '01', name: 'Subcommittee on the Constitution and Federalism' },
            { thomas_id: '04', name: 'Subcommittee on Crime' },
          ],
        },
        COMMITTEES[1]!,
      ],
      MEMBERSHIP
    );
    expect(renamed.SSJU01).not.toBe(base.SSJU01);
    expect(renamed.SSJU).not.toBe(base.SSJU); // the parent lists its subcommittees
    expect(renamed.SSJU04).toBe(base.SSJU04);
  });
});

describe('applyCommitteeVersion', () => {
  it('dates new and changed committees by the commit, keeps unchanged ones, drops removed ones', () => {
    const first = applyCommitteeVersion({}, COMMITTEES, {}, '2025-01-04T02:03:32Z');
    // An empty roster is a real state (upstream clears the file when a Congress convenes).
    expect(first.SSJU?.changedOn).toBe('2025-01-03'); // 02:03 UTC is Jan 3 in Washington
    expect(Object.keys(first).sort()).toEqual(['JSPR', 'SSJU', 'SSJU01', 'SSJU04']);

    const organized = applyCommitteeVersion(first, COMMITTEES, MEMBERSHIP, '2025-04-04T15:00:00Z');
    expect(organized.SSJU?.changedOn).toBe('2025-04-04');
    expect(organized.SSJU01?.changedOn).toBe('2025-04-04');
    expect(organized.SSJU04).toEqual(first.SSJU04); // still no members, same name
    expect(organized.JSPR).toEqual(first.JSPR);

    const dissolved = applyCommitteeVersion(
      organized,
      [COMMITTEES[0]!],
      MEMBERSHIP,
      '2026-07-15T12:34:10Z'
    );
    expect(dissolved.JSPR).toBeUndefined();
    expect(dissolved.SSJU).toEqual(organized.SSJU);
  });
});

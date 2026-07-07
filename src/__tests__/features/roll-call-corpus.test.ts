/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Tests for the roll-call corpus pure helpers: menu-issue → bill parsing
 * and compact roll round-tripping (the shapes the MR10 Senate mirror and
 * chamber baselines both depend on).
 */

import {
  billFromMenuEntry,
  compactRoll,
  expandRoll,
  rollKey,
  type SenateMenuEntry,
} from '@/features/representatives/services/roll-call-corpus';
import type { StandardizedVote } from '@/features/representatives/services/batch-voting-service';

function menuEntry(overrides: Partial<SenateMenuEntry>): SenateMenuEntry {
  return {
    n: 1,
    d: '2026-01-05',
    q: 'On Passage',
    r: 'Passed',
    i: 'S. 100',
    t: 'A bill for testing',
    ...overrides,
  };
}

describe('billFromMenuEntry', () => {
  it('parses plain bill and resolution issue formats to Congress.gov types', () => {
    const cases: Array<[string, string, string]> = [
      ['S. 185', 'S', '185'],
      ['H.R. 3424', 'HR', '3424'],
      ['S.J.Res. 185', 'SJRES', '185'],
      ['H.J.Res. 25', 'HJRES', '25'],
      ['S.Con.Res. 7', 'SCONRES', '7'],
      ['H.Con.Res. 14', 'HCONRES', '14'],
      ['S.Res. 33', 'SRES', '33'],
      ['H.Res. 353', 'HRES', '353'],
    ];
    for (const [issue, type, number] of cases) {
      const bill = billFromMenuEntry(menuEntry({ i: issue }), 119);
      expect(bill).toEqual({ congress: 119, type, number, title: 'A bill for testing' });
    }
  });

  it('returns undefined for nominations and treaty documents', () => {
    expect(billFromMenuEntry(menuEntry({ i: 'PN938-2' }), 119)).toBeUndefined();
    expect(billFromMenuEntry(menuEntry({ i: 'PN12' }), 119)).toBeUndefined();
    expect(billFromMenuEntry(menuEntry({ i: 'Treaty Doc. 118-3' }), 119)).toBeUndefined();
    expect(billFromMenuEntry(menuEntry({ i: '' }), 119)).toBeUndefined();
  });

  it('uses the measure title after the "; " separator in menu titles', () => {
    const bill = billFromMenuEntry(
      menuEntry({
        i: 'S.J.Res. 185',
        t: 'Motion to Proceed to S. J. Res. 185; A joint resolution to direct the removal of forces',
      }),
      119
    );
    expect(bill?.title).toBe('A joint resolution to direct the removal of forces');
  });
});

describe('compactRoll / expandRoll round trip', () => {
  const roll: StandardizedVote = {
    voteId: 'senate-119-2-42',
    congress: 119,
    session: 2,
    chamber: 'Senate',
    rollCallNumber: 42,
    date: '2026-03-01T17:00:00.000Z',
    question: 'On Passage',
    result: 'Passed',
    totals: { yea: 2, nay: 1, present: 1, notVoting: 1 },
    memberVotes: [
      { bioguideId: 'A000001', name: 'A', party: 'D', state: 'MI', position: 'Yea' },
      { bioguideId: 'B000002', name: 'B', party: 'R', state: 'OH', position: 'Yea' },
      { bioguideId: 'C000003', name: 'C', party: 'R', state: 'TX', position: 'Nay' },
      { bioguideId: 'D000004', name: 'D', party: 'D', state: 'CA', position: 'Present' },
      { bioguideId: 'E000005', name: 'E', party: 'I', state: 'VT', position: 'Not Voting' },
    ],
    sourceUrl: 'https://www.senate.gov/test',
    processedAt: '2026-03-01T18:00:00.000Z',
  };

  it('preserves positions, parties, and identifiers, and recomputes totals', () => {
    const expanded = expandRoll(compactRoll(roll), 119, 'Senate');
    expect(expanded.voteId).toBe('senate-119-2-42');
    expect(expanded.session).toBe(2);
    expect(expanded.rollCallNumber).toBe(42);
    expect(expanded.totals).toEqual({ yea: 2, nay: 1, present: 1, notVoting: 1 });
    expect(expanded.memberVotes.map(m => [m.bioguideId, m.party, m.position])).toEqual(
      roll.memberVotes.map(m => [m.bioguideId, m.party, m.position])
    );
  });
});

describe('rollKey', () => {
  it('builds chamber-scoped corpus keys', () => {
    expect(rollKey('senate', 119, 2, 42)).toBe('record-card:roll:senate:119:2:42');
    expect(rollKey('house', 119, 1, 7)).toBe('record-card:roll:house:119:1:7');
  });
});

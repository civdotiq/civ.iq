/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * The roll-call corpus is built from OpenStates' per-session CSV and read per
 * member at request time. These pin the encoding: newest first, party tallies
 * from the roster with the member's own vote inside them, the floor flag from
 * voter count, committee organizations resolved to their chamber, and rows
 * with no voter_id counted but never attributed.
 */

import { buildVotesCorpus } from '@/lib/data-sources/openstates-votes/build-votes';
import type { SessionInput, RosterMember } from '@/lib/data-sources/openstates-votes/build-votes';
import {
  decodeMemberVotes,
  decodeRollCall,
} from '@/lib/data-sources/openstates-votes/votes-corpus';

const LOWER = 'ocd-organization/lower';
const COMMITTEE = 'ocd-organization/committee';

const roster: RosterMember[] = [
  { uuid: 'aaaa', party: 'Democratic', chamber: 'lower' },
  { uuid: 'bbbb', party: 'Democratic', chamber: 'lower' },
  { uuid: 'cccc', party: 'Republican', chamber: 'lower' },
  { uuid: 'dddd', party: 'Republican', chamber: 'lower' },
  { uuid: 'eeee', party: 'Independent', chamber: 'lower' },
];

function session(overrides: Partial<SessionInput> = {}): SessionInput {
  return {
    identifier: '2025-2026',
    name: '2025-2026 Regular Session',
    upstreamGeneratedAt: '2026-10-07T23:17:52.843Z',
    organizations: [
      { id: LOWER, classification: 'lower' },
      { id: COMMITTEE, classification: 'committee', parent_id: LOWER },
    ],
    bills: [{ id: 'ocd-bill/b1', identifier: 'H 1', title: 'An act relating to schools' }],
    votes: [
      // Older floor vote: 4 of 5 members voted
      {
        id: 'ocd-vote/old',
        start_date: '2025-02-06',
        result: 'pass',
        organization_id: LOWER,
        bill_id: 'ocd-bill/b1',
        motion_text: 'Shall the bill pass?',
      },
      // Newer committee vote: 2 voters, one unresolved
      {
        id: 'ocd-vote/new',
        start_date: '2026-05-29T08:00:00+00:00',
        result: 'fail',
        organization_id: COMMITTEE,
        bill_id: 'ocd-bill/b1',
        motion_text: 'Do pass',
      },
    ],
    votePeople: [
      { vote_event_id: 'ocd-vote/old', option: 'yes', voter_id: 'ocd-person/aaaa' },
      { vote_event_id: 'ocd-vote/old', option: 'yes', voter_id: 'ocd-person/bbbb' },
      { vote_event_id: 'ocd-vote/old', option: 'no', voter_id: 'ocd-person/cccc' },
      { vote_event_id: 'ocd-vote/old', option: 'Aye', voter_id: 'ocd-person/dddd' },
      { vote_event_id: 'ocd-vote/new', option: 'no', voter_id: 'ocd-person/aaaa' },
      { vote_event_id: 'ocd-vote/new', option: 'yes', voter_name: 'White', voter_id: '' },
    ],
    ...overrides,
  };
}

function build(sessions = [session()]) {
  return buildVotesCorpus({
    jurisdiction: 'vt',
    generatedAt: '2026-10-08T00:00:00Z',
    sessions,
    roster,
  });
}

describe('buildVotesCorpus', () => {
  it('orders roll calls newest first and keeps member entries in that order', () => {
    const file = build();
    expect(file.jurisdiction).toBe('VT');
    expect(file.rollCalls.map(r => r[0])).toEqual(['new', 'old']);
    expect(file.rollCalls.map(r => r[1])).toEqual(['2026-05-29', '2025-02-06']);
    // aaaa: [rollCallIdx 0 → 'no', rollCallIdx 1 → 'yes']
    expect(file.members['aaaa']).toEqual([0, 1, 1, 0]);
  });

  it('tallies parties from the roster and flags floor votes by voter count', () => {
    const file = build();
    const old = decodeRollCall(file, file.rollCalls[1]!);
    expect(old.floor).toBe(true); // 4 of 5 ≥ 60%
    expect(old.yes).toBe(2);
    expect(old.no).toBe(1);
    expect(old.other).toBe(1); // 'Aye' is not a named option
    expect(old.partyTally.get('Democratic')).toEqual({ yes: 2, no: 0 });
    expect(old.partyTally.get('Republican')).toEqual({ yes: 0, no: 1 });
    expect(old.billIdentifier).toBe('H 1');
    expect(old.billTitle).toBe('An act relating to schools');
    expect(old.id).toBe('ocd-vote/old');
    expect(old.billId).toBe('ocd-bill/b1');

    const recent = decodeRollCall(file, file.rollCalls[0]!);
    expect(recent.floor).toBe(false); // 2 of 5
    expect(recent.chamber).toBe('lower'); // committee resolved through parent_id
    expect(recent.result).toBe('fail');
  });

  it('counts unresolved rows in the tallies but attributes them to nobody', () => {
    const file = build();
    expect(file.meta.unresolvedVotes).toBe(1);
    expect(file.meta.memberVotes).toBe(5);
    expect(file.meta.members).toBe(4);
    const recent = decodeRollCall(file, file.rollCalls[0]!);
    expect(recent.yes).toBe(1);
    expect(Object.keys(file.members)).not.toContain('');
  });

  it('skips roll calls whose organization resolves to no chamber', () => {
    const file = build([
      session({
        votes: [
          {
            id: 'ocd-vote/orphan',
            start_date: '2026-01-01',
            result: 'pass',
            organization_id: 'ocd-organization/unknown',
          },
        ],
        votePeople: [],
      }),
    ]);
    expect(file.rollCalls).toHaveLength(0);
  });

  it('folds several sessions into one artifact with session indexes', () => {
    const special = session({
      identifier: '2025 Special',
      name: 'Special Session',
      votes: [
        {
          id: 'ocd-vote/sp',
          start_date: '2025-12-01',
          result: 'pass',
          organization_id: LOWER,
        },
      ],
      votePeople: [{ vote_event_id: 'ocd-vote/sp', option: 'yes', voter_id: 'ocd-person/aaaa' }],
    });
    const file = build([session(), special]);
    expect(file.sessions.map(s => s.identifier)).toEqual(['2025-2026', '2025 Special']);
    const sp = file.rollCalls.find(r => r[0] === 'sp')!;
    expect(decodeRollCall(file, sp).session.name).toBe('Special Session');
  });
});

describe('decodeMemberVotes', () => {
  it('returns a member’s votes newest first with shared decoded roll calls', () => {
    const file = build();
    const votes = decodeMemberVotes(file, 'ocd-person/aaaa');
    expect(votes.map(v => [v.rollCall.date, v.option])).toEqual([
      ['2026-05-29', 'no'],
      ['2025-02-06', 'yes'],
    ]);
  });

  it('answers [] for a member with no recorded votes', () => {
    expect(decodeMemberVotes(build(), 'ocd-person/eeee')).toEqual([]);
  });
});

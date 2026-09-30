/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Bill roll calls: Congress.gov repeats a roll call on several actions, and
 * bill pages must link each vote to its own chamber's vote page.
 */

import {
  fetchBillVotes,
  officialVoteResult,
  type CongressAction,
} from '@/lib/services/bill.service';
import { getBillVoteHref, type BillVote } from '@/types/bill';
import { parseRollCallXML } from '@/features/legislation/services/rollcall-parser';

jest.mock('@/features/legislation/services/rollcall-parser', () => ({
  parseRollCallXML: jest.fn(async () => null),
}));

const senate244 = {
  chamber: 'Senate',
  congress: 119,
  rollNumber: 244,
  sessionNumber: 2,
  url: 'https://www.senate.gov/legislative/LIS/roll_call_votes/vote1192/vote_119_2_00244.xml',
};
const house282 = {
  chamber: 'House',
  congress: 119,
  rollNumber: 282,
  sessionNumber: 2,
  url: 'https://clerk.house.gov/evs/2026/roll282.xml',
};

// Shape of H.Con.Res. 89 (119th): each roll call appears on two actions.
const actions: CongressAction[] = [
  {
    actionDate: '2026-09-24',
    text: 'Failed of passage in Senate by Yea-Nay Vote. 49 - 50.',
    recordedVotes: [senate244],
  },
  {
    actionDate: '2026-09-24',
    text: 'Failed of passage/not agreed to in Senate.',
    recordedVotes: [senate244],
  },
  {
    actionDate: '2026-07-23',
    text: 'On agreeing to the resolution Agreed to by the Yeas and Nays: 214 - 208',
    recordedVotes: [house282],
  },
  { actionDate: '2026-07-23', text: 'Passed/agreed to in House.', recordedVotes: [house282] },
];

describe('fetchBillVotes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns each roll call once, even when several actions cite it', async () => {
    const votes = await fetchBillVotes(actions, '119', 'hconres', '89');
    expect(votes.map(v => `${v.chamber}-${v.rollNumber}`)).toEqual(['Senate-244', 'House-282']);
    expect(parseRollCallXML).toHaveBeenCalledTimes(2);
  });

  it('carries the session so links resolve to the right roll call', async () => {
    const votes = await fetchBillVotes(actions, '119', 'hconres', '89');
    expect(votes.map(v => v.session)).toEqual([2, 2]);
  });
});

describe('fetchBillVotes labels', () => {
  it("uses the clerk's question and result over the action-text guess", async () => {
    // H.R. 1 (119th), Senate roll 359: the action text reads like a failed
    // passage vote, but the roll call is the Warnock motion to commit.
    (parseRollCallXML as jest.Mock).mockResolvedValueOnce({
      question: 'On the Motion',
      result: 'Motion Rejected',
      votes: [],
      totals: { yea: 48, nay: 51, present: 0, notVoting: 1 },
    });
    const [vote] = await fetchBillVotes(
      [
        {
          actionDate: '2025-07-01',
          text: 'Motion to commit to the Committee on Finance failed of passage by Yea-Nay Vote. 48 - 51.',
          recordedVotes: [{ ...senate244, rollNumber: 359, sessionNumber: 1 }],
        },
      ],
      '119',
      'hr',
      '1'
    );
    expect(vote?.question).toBe('On the Motion');
    expect(vote?.result).toBe('Failed');
  });
});

describe('officialVoteResult', () => {
  it.each([
    ['Bill Passed', 'Passed'],
    ['Passed', 'Passed'],
    ['Motion Rejected', 'Failed'],
    ['Concurrent Resolution Rejected', 'Failed'],
    ['Failed', 'Failed'],
    ['Motion Agreed to', 'Agreed to'],
    ['Amendment Not Agreed to', 'Disagreed to'],
  ])('%s → %s', (raw, expected) => {
    expect(officialVoteResult(raw)).toBe(expected);
  });

  it('returns null for an unknown or missing result', () => {
    expect(officialVoteResult('')).toBeNull();
    expect(officialVoteResult(undefined)).toBeNull();
  });
});

describe('getBillVoteHref', () => {
  const base: BillVote = {
    voteId: '119-hconres-89-282',
    chamber: 'House',
    date: '2026-07-23',
    question: 'On Passage',
    result: 'Passed',
    rollNumber: 282,
    session: 2,
  };

  it('names the chamber — a bare roll number is read as a Senate vote', () => {
    expect(getBillVoteHref(base, '119')).toBe('/vote/house-119-2-282');
    expect(getBillVoteHref({ ...base, chamber: 'Senate', rollNumber: 244 }, '119')).toBe(
      '/vote/senate-119-2-244'
    );
  });

  it('omits the session when unknown (vote page tries both sessions)', () => {
    expect(getBillVoteHref({ ...base, session: undefined }, '119')).toBe('/vote/house-119-282');
  });

  it('returns null without a roll number', () => {
    expect(getBillVoteHref({ ...base, rollNumber: undefined }, '119')).toBeNull();
  });
});

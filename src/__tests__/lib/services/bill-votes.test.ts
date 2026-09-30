/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * Bill roll calls: Congress.gov repeats a roll call on several actions, and
 * bill pages must link each vote to its own chamber's vote page.
 */

import { fetchBillVotes, type CongressAction } from '@/lib/services/bill.service';
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

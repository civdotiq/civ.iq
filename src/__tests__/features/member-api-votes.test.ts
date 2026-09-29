/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { toSenateApiVotes } from '@/features/representatives/services/member-api-votes';
import type { MemberVoteRecord } from '@/features/representatives/services/batch-voting-service';

jest.mock('@/lib/logging/simple-logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

// Senate rolls 119-2-249 (amendment), 250 (passage) and 241 (nomination)
const S4668_TITLE =
  'A bill to protect the name, image, and likeness rights of, and provide protections for, student athletes and to promote fair competition among intercollegiate athletics, and for other purposes.';
const s4668 = { congress: 119, type: 'S', number: '4668', title: S4668_TITLE };

const amendmentVote: MemberVoteRecord = {
  voteId: 'senate-119-2-249',
  date: '2026-09-28T21:21:00.000Z',
  question: 'On the Amendment S.Amdt. 6835',
  position: 'Yea',
  result: 'Rejected',
  rollCallNumber: 249,
  bill: s4668,
  amendment: {
    number: 'S.Amdt. 6835',
    purpose: 'To establish certain standards with respect to coaches of varsity sports teams.',
    sponsorLabel: 'Booker',
  },
  majorityRequirement: '1/2',
};
const passageVote: MemberVoteRecord = {
  voteId: 'senate-119-2-250',
  date: '2026-09-28T21:42:00.000Z',
  question: 'On Passage of the Bill',
  position: 'Nay',
  result: 'Passed',
  rollCallNumber: 250,
  bill: s4668,
  majorityRequirement: '1/2',
};
const nominationVote: MemberVoteRecord = {
  voteId: 'senate-119-2-241',
  date: '2026-09-23T14:16:00.000Z',
  question: 'On the Nomination PN999-1',
  position: 'Nay',
  result: 'Confirmed',
  rollCallNumber: 241,
  nomination: {
    number: 'PN999-1',
    description:
      'Angela Veronica Colmenero, of Texas, to be United States District Judge for the Southern District of Texas',
  },
};

const lookup = jest.fn(async () => ({ title: 'Protect College Sports Act of 2026' }));

describe('toSenateApiVotes', () => {
  beforeEach(() => lookup.mockClear());

  it('passes the amendment and majority requirement through', async () => {
    const [v] = await toSenateApiVotes([amendmentVote], lookup);
    expect(v?.amendment).toEqual(amendmentVote.amendment);
    expect(v?.majorityRequirement).toBe('1/2');
    expect(v?.bill.title).toBe(S4668_TITLE);
    expect(v?.rollNumber).toBe(249);
  });

  it('adds the Congress.gov display title once per distinct bill', async () => {
    const votes = await toSenateApiVotes([amendmentVote, passageVote], lookup);
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(votes.map(v => v.bill.displayTitle)).toEqual([
      'Protect College Sports Act of 2026',
      'Protect College Sports Act of 2026',
    ]);
  });

  it('omits displayTitle when it matches the title or the lookup fails', async () => {
    const same = jest.fn(async () => ({ title: S4668_TITLE }));
    const [a] = await toSenateApiVotes([passageVote], same);
    expect(a?.bill).not.toHaveProperty('displayTitle');
    const failed = jest.fn(async () => null);
    const [b] = await toSenateApiVotes([passageVote], failed);
    expect(b?.bill).not.toHaveProperty('displayTitle');
  });

  it('labels a nomination by its nominee, not as a Senate resolution', async () => {
    const [v] = await toSenateApiVotes([nominationVote], lookup);
    expect(v?.nomination).toEqual(nominationVote.nomination);
    expect(v?.bill.type).toBe('Nomination');
    expect(v?.bill.title).toMatch(/^Angela Veronica Colmenero/);
    expect(lookup).not.toHaveBeenCalled();
  });

  it('leaves the new fields off votes that do not have them', async () => {
    const [v] = await toSenateApiVotes(
      [{ ...passageVote, majorityRequirement: undefined }],
      lookup
    );
    expect(v).not.toHaveProperty('amendment');
    expect(v).not.toHaveProperty('nomination');
    expect(v).not.toHaveProperty('majorityRequirement');
  });
});

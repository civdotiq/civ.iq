import { partyAlignment, summarizeVoteTally, votesNeeded } from '@/lib/vote-tally';
import type { MemberVote, UnifiedVoteDetail } from '@/lib/services/vote.service';

function member(
  party: MemberVote['party'],
  position: MemberVote['position'],
  i: number
): MemberVote {
  return { id: `M${i}`, firstName: '', lastName: '', fullName: '', state: 'VT', party, position };
}

const detail: UnifiedVoteDetail = {
  voteId: 'senate-119-2-249',
  congress: '119',
  session: '2',
  rollNumber: 249,
  date: '2026-09-28',
  title: '',
  question: 'On the Amendment S.Amdt. 6835',
  description: '',
  result: 'Rejected',
  chamber: 'Senate',
  yeas: 3,
  nays: 2,
  present: 0,
  absent: 1,
  totalVotes: 6,
  requiredMajority: '3/5',
  members: [
    member('R', 'Nay', 1),
    member('D', 'Yea', 2),
    member('D', 'Yea', 3),
    member('I', 'Yea', 4),
    member('R', 'Nay', 5),
    member('R', 'Not Voting', 6),
  ],
};

describe('summarizeVoteTally', () => {
  it('drops the member list and counts each party, in D/R/I order', () => {
    const tally = summarizeVoteTally(detail);
    expect(tally).not.toHaveProperty('members');
    expect(tally.parties).toEqual([
      { party: 'D', yea: 2, nay: 0, other: 0 },
      { party: 'R', yea: 0, nay: 2, other: 1 },
      { party: 'I', yea: 1, nay: 0, other: 0 },
    ]);
  });

  it('keeps the official totals, seats and threshold', () => {
    expect(summarizeVoteTally(detail)).toMatchObject({
      yeas: 3,
      nays: 2,
      notVoting: 1,
      seats: 6,
      requiredMajority: '3/5',
    });
  });
});

describe('votesNeeded', () => {
  const base = summarizeVoteTally(detail);
  it('counts seats for 3/5 and those voting for 2/3 and 1/2', () => {
    expect(votesNeeded({ ...base, seats: 100, requiredMajority: '3/5' })).toBe(60);
    expect(votesNeeded({ ...base, yeas: 300, nays: 120, requiredMajority: '2/3' })).toBe(280);
    expect(votesNeeded({ ...base, yeas: 51, nays: 49, requiredMajority: '1/2' })).toBe(51);
  });
  it('returns null when the source gives no threshold', () => {
    expect(votesNeeded({ ...base, requiredMajority: undefined })).toBeNull();
  });
});

describe('partyAlignment', () => {
  const tally = summarizeVoteTally(detail);
  it('compares with the member’s own party majority', () => {
    expect(partyAlignment(tally, 'Democrat', 'Yea')).toBe('with');
    expect(partyAlignment(tally, 'Republican', 'Yea')).toBe('split');
  });
  it('says nothing for independents or non-votes', () => {
    expect(partyAlignment(tally, 'Independent', 'Yea')).toBeNull();
    expect(partyAlignment(tally, 'Democrat', 'Not Voting')).toBeNull();
  });
});

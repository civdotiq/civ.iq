import { groupVotesByMeasure, voteKind } from '../vote-groups';
import type { Vote } from '../../VoteRow';

function vote(roll: number, question: string, extra: Partial<Vote> = {}): Vote {
  return {
    voteId: `senate-119-2-${roll}`,
    bill: {
      number: '4668',
      title: 'A bill to protect the name, image, and likeness rights of student athletes',
      displayTitle: 'Protect College Sports Act of 2026',
      congress: '119',
      type: 'S',
    },
    question,
    result: 'Rejected',
    date: '2026-09-28',
    position: 'Yea',
    chamber: 'Senate',
    rollNumber: roll,
    description: '',
    ...extra,
  };
}

// Real sequence: Senate roll calls 243–250, 119th Congress (Sept 2026).
const sequence: Vote[] = [
  vote(250, 'On Passage of the Bill', { result: 'Passed', position: 'Nay' }),
  vote(249, 'On the Amendment S.Amdt. 6835', {
    amendment: { number: 'S.Amdt. 6835', sponsorLabel: 'Booker Amdt. No. 6835' },
  }),
  vote(248, 'On the Amendment S.Amdt. 6805', { amendment: { number: 'S.Amdt. 6805' } }),
  vote(244, 'On the Concurrent Resolution', {
    bill: {
      number: '38',
      title:
        'Directing the President to remove United States Armed Forces from hostilities with Iran.',
      congress: '119',
      type: 'SCONRES',
    },
  }),
  vote(243, 'On the Cloture Motion', { result: 'Agreed to' }),
];

describe('voteKind', () => {
  it.each([
    ['On Passage of the Bill', 'Passage'],
    ['On Motion to Suspend the Rules and Pass', 'Passage'],
    ['On the Concurrent Resolution', 'Passage'],
    ['On the Cloture Motion', 'Cloture'],
    ['On the Motion to Table', 'Motion to table'],
    ['On the Nomination', 'Confirmation'],
    ['On the Motion to Proceed', 'Motion'],
    ['On the Amendment S.Amdt. 6835', 'Amendment'],
  ])('%s → %s', (question, kind) => {
    expect(voteKind({ question })).toBe(kind);
  });
});

describe('groupVotesByMeasure', () => {
  it('collapses every roll call on one bill into a single group, newest measure first', () => {
    const groups = groupVotesByMeasure(sequence, 6);
    expect(groups.map(g => g.billLabel)).toEqual(['S. 4668', 'S.Con.Res. 38']);
    expect(groups[0]?.votes.map(v => v.rollNumber)).toEqual([250, 249, 248, 243]);
  });

  it('uses the passage vote as the deciding vote and the short title as the name', () => {
    const [group] = groupVotesByMeasure(sequence, 6);
    expect(group?.deciding.rollNumber).toBe(250);
    expect(group?.title).toBe('Protect College Sports Act of 2026');
  });

  it('falls back to the latest vote when no passage vote is in the window', () => {
    const [group] = groupVotesByMeasure(sequence.slice(1), 6);
    expect(group?.deciding.rollNumber).toBe(249);
  });

  it('groups nomination votes by nomination and names them by the nominee', () => {
    const nomination = { number: 'PN999-1', description: 'Jane Roe, of Texas, to be Judge' };
    const groups = groupVotesByMeasure(
      [
        vote(260, 'On the Nomination', {
          bill: { number: 'N/A', title: '', congress: '119', type: '' },
          nomination,
        }),
        vote(259, 'On the Cloture Motion', {
          bill: { number: 'N/A', title: '', congress: '119', type: '' },
          nomination,
        }),
      ],
      6
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.title).toBe(nomination.description);
    expect(groups[0]?.deciding.rollNumber).toBe(260);
  });

  it('stops at the limit', () => {
    expect(groupVotesByMeasure(sequence, 1)).toHaveLength(1);
  });
});

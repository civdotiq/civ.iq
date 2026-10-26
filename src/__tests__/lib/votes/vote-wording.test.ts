import {
  explainVoteOutcome,
  requiredMajorityLabel,
  voteMetaDescription,
} from '@/lib/votes/vote-wording';

// Question/result pairs in the 119th Congress Senate vote menu (915 roll calls,
// mirrored from senate.gov, read 2026-10-25). Not yet covered: "On the
// Decision of the Chair" and "On the Point of Order" (6 roll calls), whose
// "Sustained"/"Well Taken" results still fall through to "did NOT pass".
const SENATE_119_PAIRS: Array<[string, string]> = [
  ['On the Cloture Motion', 'Agreed to'],
  ['On the Nomination', 'Confirmed'],
  ['On the Amendment', 'Rejected'],
  ['On the Motion', 'Rejected'],
  ['On the Motion to Proceed', 'Agreed to'],
  ['On Cloture on the Motion to Proceed', 'Rejected'],
  ['On the Joint Resolution', 'Passed'],
  ['On the Motion to Discharge', 'Rejected'],
  ['On the Motion to Proceed', 'Rejected'],
  ['On the Amendment', 'Agreed to'],
  ['On Passage of the Bill', 'Passed'],
  ['On the Motion to Table', 'Agreed to'],
  ['On Cloture on the Motion to Proceed', 'Agreed to'],
  ['On the Cloture Motion', 'Rejected'],
  ['On the Motion to Recommit', 'Rejected'],
  ['On the Resolution', 'Agreed to'],
  ['On the Joint Resolution', 'Rejected'],
  ['On the Motion', 'Agreed to'],
  ['On the Motion to Table', 'Rejected'],
  ['On Passage of the Bill', 'Rejected'],
  ['On the Concurrent Resolution', 'Agreed to'],
  ['On the Motion to Discharge', 'Agreed to'],
  ['On the Motion to Reconsider', 'Agreed to'],
  ['On the Motion to Adjourn', 'Rejected'],
  ['On the Concurrent Resolution', 'Rejected'],
];

describe('explainVoteOutcome', () => {
  it('says a confirmed Senate nomination was confirmed', () => {
    expect(
      explainVoteOutcome({ question: 'On the Nomination', result: 'Confirmed', chamber: 'Senate' })
    ).toBe('The Senate CONFIRMED this nomination. The nominee will assume their position.');
  });

  it('says a rejected Senate nomination was rejected', () => {
    expect(
      explainVoteOutcome({ question: 'On the Nomination', result: 'Rejected', chamber: 'Senate' })
    ).toBe('The Senate REJECTED this nomination. The nominee will not assume the position.');
  });

  it.each(SENATE_119_PAIRS)(
    'never contradicts a successful Senate result: %s / %s',
    (question, result) => {
      const text = explainVoteOutcome({ question, result, chamber: 'Senate' });
      const succeeded = /agreed|passed|confirmed/i.test(result);
      if (succeeded) {
        expect(text).not.toMatch(/did NOT|REJECTED|FAILED|voted NOT/);
      } else {
        expect(text).not.toMatch(/PASSED|CONFIRMED|APPROVED|ADOPTED|voted to end debate/);
      }
    }
  );

  it.each<[string, string, string]>([
    [
      'On Passage',
      'Passed',
      'The bill PASSED the House and will now move to the Senate (or to the President if already passed by the Senate).',
    ],
    [
      'On Passage',
      'Failed',
      'The bill FAILED to pass. It will not become law unless reconsidered.',
    ],
    [
      'On Motion to Suspend the Rules and Pass',
      'Failed',
      'The House REJECTED this procedural motion.',
    ],
    ['On Agreeing to the Resolution', 'Passed', 'The House APPROVED this measure.'],
    [
      'On Agreeing to the Amendment',
      'Agreed to',
      'This amendment was ADOPTED and will be included in the bill.',
    ],
    ['On Ordering the Previous Question', 'Passed', 'This measure PASSED the House.'],
  ])('keeps House wording unchanged: %s / %s', (question, result, expected) => {
    expect(explainVoteOutcome({ question, result, chamber: 'House' })).toBe(expected);
  });
});

describe('requiredMajorityLabel', () => {
  it('counts senators voting for a simple majority, not 51 seats', () => {
    expect(requiredMajorityLabel('1/2', 'Senate')).toBe(
      'a majority of senators voting (the Vice President breaks a tie)'
    );
  });

  it('keeps the cloture and two-thirds thresholds', () => {
    expect(requiredMajorityLabel('3/5', 'Senate')).toBe('3/5 majority (60 votes)');
    expect(requiredMajorityLabel('2/3', 'Senate')).toBe('2/3 majority (67 votes)');
  });
});

describe('voteMetaDescription', () => {
  it('reads as a sentence for a Senate confirmation', () => {
    expect(
      voteMetaDescription({
        chamber: 'Senate',
        rollNumber: 1,
        question: 'On the Nomination',
        result: 'Confirmed',
        yeas: 50,
        nays: 35,
      })
    ).toBe(
      'On roll call #1, the Senate voted 50 yea to 35 nay on the Nomination. Result: Confirmed. See how each member voted and the party breakdown.'
    );
  });

  it('reads as a sentence for a House passage vote', () => {
    expect(
      voteMetaDescription({
        chamber: 'House',
        rollNumber: 101,
        question: 'On Passage',
        result: 'Passed',
        yeas: 218,
        nays: 206,
      })
    ).toBe(
      'On roll call #101, the House voted 218 yea to 206 nay on Passage. Result: Passed. See how each member voted and the party breakdown.'
    );
  });

  it('drops the question and result clauses when the source has none', () => {
    expect(
      voteMetaDescription({
        chamber: 'Senate',
        rollNumber: 7,
        question: '',
        result: '',
        yeas: 60,
        nays: 40,
      })
    ).toBe(
      'On roll call #7, the Senate voted 60 yea to 40 nay. See how each member voted and the party breakdown.'
    );
  });
});

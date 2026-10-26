import {
  explainVoteOutcome,
  requiredMajorityLabel,
  voteMetaDescription,
} from '@/lib/votes/vote-wording';

// Question/result pairs in the 119th Congress Senate vote menu (915 roll calls,
// mirrored from senate.gov, read 2026-10-25).
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
  ['On the Decision of the Chair', 'Sustained'],
  ['On the Decision of the Chair', 'Not Sustained'],
  ['On the Point of Order', 'Sustained'],
  ['On the Point of Order', 'Well Taken'],
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
      const succeeded = /^(agreed|passed|confirmed|sustained|well taken)/i.test(result);
      if (succeeded) {
        expect(text).not.toMatch(/did NOT|REJECTED|FAILED|voted NOT|OVERTURNED/);
      } else {
        expect(text).not.toMatch(/PASSED|CONFIRMED|APPROVED|ADOPTED|UPHELD|voted to end debate/);
      }
    }
  );

  it.each<[string, string]>([
    ['Sustained', "The Senate UPHELD the chair's ruling."],
    ['Not Sustained', "The Senate OVERTURNED the chair's ruling."],
  ])('says a ruling from the chair was upheld or overturned: %s', (result, expected) => {
    expect(
      explainVoteOutcome({ question: 'On the Decision of the Chair', result, chamber: 'Senate' })
    ).toBe(expected);
  });

  it.each<[string, string]>([
    ['Sustained', 'The Senate UPHELD this point of order.'],
    ['Well Taken', 'The Senate UPHELD this point of order.'],
    ['Not Sustained', 'The Senate REJECTED this point of order.'],
    ['Not Well Taken', 'The Senate REJECTED this point of order.'],
  ])('says a point of order was upheld or rejected: %s', (result, expected) => {
    expect(
      explainVoteOutcome({ question: 'On the Point of Order', result, chamber: 'Senate' })
    ).toBe(expected);
  });

  it('says cloture on a nomination moves the nomination forward, not a bill', () => {
    expect(
      explainVoteOutcome({
        question: 'On the Cloture Motion',
        result: 'Agreed to',
        chamber: 'Senate',
        requiredMajority: '1/2',
        bill: { number: 'PN373', title: 'Sara Bailey', type: 'PN' },
      })
    ).toBe(
      'The Senate voted to end debate and move forward with this nomination. This breaks any filibuster and allows the Senate to proceed to a final vote.'
    );
  });

  it('recognizes a partitioned nomination number from the XML feed', () => {
    expect(
      explainVoteOutcome({
        question: 'On the Cloture Motion',
        result: 'Agreed to',
        chamber: 'Senate',
        bill: { number: 'PN12-19', title: '', type: 'Nomination' },
      })
    ).toContain('move forward with this nomination');
  });

  it('says failed cloture on a nomination needed a simple majority, not 60', () => {
    expect(
      explainVoteOutcome({
        question: 'On the Cloture Motion',
        result: 'Rejected',
        chamber: 'Senate',
        requiredMajority: '1/2',
        bill: { number: 'PN25-28', title: '', type: 'PN' },
      })
    ).toBe(
      'The Senate voted NOT to end debate. The filibuster continues, and the nomination cannot move forward to a final vote at this time. A majority of senators voting was needed.'
    );
  });

  it('keeps 60 votes for failed cloture on legislation', () => {
    expect(
      explainVoteOutcome({
        question: 'On Cloture on the Motion to Proceed',
        result: 'Rejected',
        chamber: 'Senate',
        requiredMajority: '3/5',
        bill: { number: 'H.R. 5371', title: '', type: 'HR' },
      })
    ).toBe(
      'The Senate voted NOT to end debate. The filibuster continues, and the bill cannot move forward to a final vote at this time. 60 votes were needed.'
    );
  });

  it.each<[string, string, string]>([
    ['S.Res. 532', 'SRES', 'resolution'],
    ['H.Res. 12', 'HRES', 'resolution'],
    ['S.J.Res. 55', 'SJRES', 'joint resolution'],
    ['H.J.Res. 4', 'HJRES', 'joint resolution'],
    ['H.Con.Res. 14', 'HCONRES', 'concurrent resolution'],
    ['H.R. 5371', 'HR', 'bill'],
    ['S. 1071', 'S', 'bill'],
    ['PN373', 'PN', 'nomination'],
    ['Treaty Doc. 118-1', 'TREATYDOC', 'measure'],
  ])('names the measure a cloture vote moves forward: %s', (number, type, noun) => {
    expect(
      explainVoteOutcome({
        question: 'On the Cloture Motion',
        result: 'Agreed to',
        chamber: 'Senate',
        bill: { number, title: '', type },
      })
    ).toBe(
      `The Senate voted to end debate and move forward with this ${noun}. This breaks any filibuster and allows the Senate to proceed to a final vote.`
    );
  });

  it("reads the measure type from the XML feed's dotted document type", () => {
    expect(
      explainVoteOutcome({
        question: 'On the Cloture Motion',
        result: 'Agreed to',
        chamber: 'Senate',
        bill: { number: '', title: '', type: 'S.J.Res.' },
      })
    ).toContain('move forward with this joint resolution');
  });

  it('states no number for failed cloture when the source gives no threshold', () => {
    expect(
      explainVoteOutcome({
        question: 'On the Cloture Motion',
        result: 'Rejected',
        chamber: 'Senate',
      })
    ).toBe(
      'The Senate voted NOT to end debate. The filibuster continues, and the measure cannot move forward to a final vote at this time.'
    );
  });

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

  it('keeps 60 votes for cloture on legislation', () => {
    expect(requiredMajorityLabel('3/5', 'Senate')).toBe('3/5 majority (60 votes)');
  });

  it('counts those voting for two-thirds, not a flat 67', () => {
    expect(requiredMajorityLabel('2/3', 'Senate')).toBe('two-thirds of senators voting');
    expect(requiredMajorityLabel('2/3', 'House')).toBe('two-thirds of members voting');
    expect(requiredMajorityLabel('2/3', 'Senate')).not.toMatch(/67/);
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

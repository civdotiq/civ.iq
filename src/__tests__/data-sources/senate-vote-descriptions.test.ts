/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * What a Senate roll call read from the Congressional Record was on, from
 * real Daily Digest text and real Congress.gov action wording (downloaded
 * 2026-10-30). The full check against senate.gov's 915 vote descriptions is
 * scripts/check-senate-record-votes.ts --descriptions.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  actionsForRoll,
  amendmentInAction,
  billLabel,
  digestVoteContext,
  easternDate,
  measureCitations,
  nominationCitation,
  nominationKey,
  nomineeDescription,
  nomineeKeys,
  questionFromAction,
  recordedVoteTime,
  resultFromAction,
  resultFromRecord,
  voteTitle,
} from '@/lib/data-sources/congressional-record/senate-vote-descriptions';
import { recordText } from '@/lib/data-sources/congressional-record/senate-roll-calls';

const digest = recordText(
  readFileSync(
    join(__dirname, 'fixtures/congressional-record', 'CREC-2026-09-30-senate-digest.txt'),
    'utf8'
  )
);

/** The Jan 13, 2026 Digest around roll 8, as printed (line breaks kept). */
const JAN_13_DIGEST = [
  'Page S176',
  'Patient Protection and Affordable Care Act; Market Integrity and ',
  'Affordability: Senate began consideration of the motion to proceed to ',
  'consideration of S.J. Res. 84, providing for congressional disapproval ',
  'under chapter 8 of title 5, United States Code, of the rule submitted.',
  '  Pages S147-57',
  '  During consideration of this measure today, Senate also took the ',
  'following action:',
  '  By 47 yeas to 52 nays (Vote No. 8), Senate did not agree to the ',
  'motion to proceed to consideration of the joint resolution.',
  'Page S152',
].join('\n');

describe('digestVoteContext', () => {
  it('runs from the entry heading to the end of the paragraph naming the vote', () => {
    const context = digestVoteContext(JAN_13_DIGEST, 8) ?? '';
    expect(context).toMatch(/^Patient Protection and Affordable Care Act/);
    expect(context).toMatch(/consideration of the joint resolution\.$/);
    expect(measureCitations(context)).toEqual([{ kind: 'bill', type: 'SJRES', number: '84' }]);
  });

  it('keeps the nominee after "(Vote No. EX. 256)", middle initials and all', () => {
    const context = digestVoteContext(digest, 256) ?? '';
    expect(context).toContain('Keith Sonderling, of Florida, to be Secretary of Labor');
    expect(nomineeKeys(context)).toContain('keith sonderling|florida');
    const initials = digestVoteContext(
      'Page S1\nNomination Confirmed: Senate confirmed the following nomination:\n' +
        '  By 53 yeas to 40 nays (Vote No. EX. 6), Alexander C. Van Hook, of \n' +
        'Louisiana, to be United States District Judge.\nPage S99',
      6
    );
    expect(nomineeKeys(initials ?? '')).toEqual(['alexander c van hook|louisiana']);
  });

  it('skips sub-headings inside an entry ("Pending:", "Rejected:")', () => {
    const text = [
      'Page S770',
      'ROAD to Housing Act: Senate began consideration of H.R. 6644, to increase the supply.',
      'Page S771',
      'Pending: Scott (SC)/Warren Amendment No. 4308, in the nature of a substitute.',
      'Page S773',
      '  By 90 yeas to 8 nays (Vote No. 45), Senate agreed to the motion to proceed.',
      'Page S775',
    ].join('\n');
    expect(digestVoteContext(text, 45)).toMatch(/^ROAD to Housing Act/);
  });

  it('is null when the Digest does not name the vote', () => {
    expect(digestVoteContext(digest, 253)).toBeNull();
  });
});

describe('measureCitations', () => {
  it('reads bills, resolutions and amendments in the forms the Record prints', () => {
    expect(
      measureCitations(
        'H.R. 9340; S. 2296; S. J. Res. 83; H.J. Res. 131; S. Con. Res. 7; S. Res. 377; ' +
          'PROVIDING FOR CONGRESSIONAL DISAPPROVAL ... S.J. RES. 84; Paul amendment No. 3941'
      )
    ).toEqual([
      { kind: 'bill', type: 'HR', number: '9340' },
      { kind: 'bill', type: 'S', number: '2296' },
      { kind: 'bill', type: 'SJRES', number: '83' },
      { kind: 'bill', type: 'HJRES', number: '131' },
      { kind: 'bill', type: 'SCONRES', number: '7' },
      { kind: 'bill', type: 'SRES', number: '377' },
      { kind: 'bill', type: 'SJRES', number: '84' },
      { kind: 'amendment', number: '3941' },
    ]);
  });

  it('ignores page numbers and "U.S."', () => {
    expect(measureCitations('Pages S5199-S5201, under 50 U.S.C. 1546a, U.S. 30')).toEqual([]);
  });
});

describe('nominations', () => {
  it('matches a Congress.gov description to the name the Record prints', () => {
    expect(
      nominationKey(
        'Keith Sonderling, of Florida, to be Secretary of Labor, vice Lori Chavez-DeRemer, resigned.'
      )
    ).toBe('keith sonderling|florida');
    expect(nominationKey('')).toBeNull();
  });

  it('writes citations as senate.gov does', () => {
    expect(nominationCitation(1129, '00')).toBe('PN1129');
    expect(nominationCitation(938, '02')).toBe('PN938-2');
  });

  it('drops the "vice …" clause from a description', () => {
    expect(
      nomineeDescription(
        'Keith Sonderling, of Florida, to be Secretary of Labor, vice Lori Chavez-DeRemer, resigned.'
      )
    ).toBe('Keith Sonderling, of Florida, to be Secretary of Labor');
  });
});

describe('actionsForRoll', () => {
  const bill = {
    actionDate: '2026-09-30',
    text: 'Cloture on the motion to proceed to the measure not invoked in Senate by Yea-Nay Vote. 57 - 43. Record Vote Number: 254.',
    recordedVotes: [
      { chamber: 'Senate', rollNumber: 254, sessionNumber: 2, date: '2026-09-30T17:45:52Z' },
    ],
  };
  const nomination = {
    actionDate: '2026-09-30',
    text: 'Confirmed by the Senate by Yea-Nay Vote. 47 - 41. Record Vote Number: 256.',
  };

  it("uses Congress.gov's recorded vote, matching roll and session", () => {
    expect(actionsForRoll([bill], 254, 2, ['2026-09-30'])).toEqual([bill]);
    expect(actionsForRoll([bill], 254, 1, ['2026-09-30'])).toEqual([]);
    expect(recordedVoteTime(bill, 254, 2)).toBe('2026-09-30T17:45:52Z');
  });

  it('falls back to "Record Vote Number: N" on the vote date (nominations)', () => {
    expect(actionsForRoll([nomination], 256, 2, ['2026-09-30'])).toEqual([nomination]);
    expect(actionsForRoll([nomination], 256, 2, ['2025-09-30'])).toEqual([]);
    expect(actionsForRoll([nomination], 25, 2, ['2026-09-30'])).toEqual([]);
  });
});

describe('questionFromAction and resultFromAction (real Congress.gov wording)', () => {
  const cases: Array<[string, Parameters<typeof questionFromAction>[1], string, string | null]> = [
    [
      'Confirmed by the Senate by Yea-Nay Vote. 47 - 41. Record Vote Number: 256.',
      { kind: 'nomination' },
      'On the Nomination',
      'Confirmed',
    ],
    [
      'Cloture invoked in Senate by Yea-Nay Vote. 53 - 47. Record Vote Number: 255.',
      { kind: 'nomination' },
      'On the Cloture Motion',
      'Agreed to',
    ],
    [
      'Cloture motion on the motion to proceed to the measure not invoked in Senate by Yea-Nay Vote. 50 - 46. Record Vote Number: 195. (CR S3918)',
      { kind: 'bill', type: 'S' },
      'On Cloture on the Motion to Proceed',
      'Rejected',
    ],
    [
      'Amendment SA 3937 agreed to in Senate by Yea-Nay Vote. 60 - 40. Record Vote Number: 616.',
      { kind: 'amendment', number: '3937' },
      'On the Amendment S.Amdt. 3937',
      'Agreed to',
    ],
    [
      'Motion to waive all applicable budgetary discipline with respect to amendment SA 5294, not having achieved 60 votes in the affirmative, rejected in Senate by Yea-Nay Vote.',
      { kind: 'amendment', number: '5294' },
      'On the Motion S.Amdt. 5294',
      'Rejected',
    ],
    [
      'Senate Committee on Foreign Relations discharged by Yea-Nay Vote. 52 - 47. Record Vote Number: 5, by motion, pursuant to 50 U.S.C. 1546a.',
      { kind: 'bill', type: 'SJRES' },
      'On the Motion to Discharge',
      'Agreed to',
    ],
    [
      'Motion to table the point of order that the measure is not entitled to expedited procedures under the Congressional Review Act agreed to in Senate by Yea-Nay Vote.',
      { kind: 'bill', type: 'HJRES' },
      'On the Motion to Table',
      'Agreed to',
    ],
    [
      'Senate concurred in the House amendment to the Senate amendment with an amendment (SA 5823) by Yea-Nay Vote. 85 - 5. Record Vote Number: 182.',
      { kind: 'bill', type: 'HR' },
      'On the Motion',
      'Agreed to',
    ],
    [
      'Passed Senate with an amendment by Yea-Nay Vote. 51 - 49. Record Vote Number: 250.',
      { kind: 'bill', type: 'S' },
      'On Passage of the Bill',
      'Passed',
    ],
    // Points of order: the three sources word the result differently, so
    // it stays blank.
    [
      'Point of order that the measure is not entitled to expedited procedures under 50 U.S.C. 1546(a) raised against the measure agreed to in Senate by Yea-Nay Vote. 50 - 50. Record Vote Number: 9.',
      { kind: 'bill', type: 'SJRES' },
      'On the Point of Order',
      null,
    ],
  ];

  it.each(cases)('%s', (text, target, question, result) => {
    expect(questionFromAction(text, target)).toBe(question);
    expect(resultFromAction(text, target)).toBe(result);
  });

  it('reads the amendment an action votes on, not one in parentheses', () => {
    expect(amendmentInAction('Motion to table amendment SA 3941 agreed to in Senate')).toBe('3941');
    expect(
      amendmentInAction(
        'Cloture on the motion to concur in the House amendment to the Senate amendment to H.R. 6644 with an amendment (SA 5823) invoked'
      )
    ).toBeNull();
  });
});

describe('resultFromRecord', () => {
  it("reads the Record's outcome sentence", () => {
    expect(resultFromRecord('The nomination was confirmed.')).toBe('Confirmed');
    expect(resultFromRecord('The motion was rejected.')).toBe('Rejected');
    expect(resultFromRecord('The motion was not agreed to.')).toBe('Rejected');
    expect(resultFromRecord('The bill (S. 4668), as amended, was passed.')).toBe('Passed');
    expect(resultFromRecord('The amendment (No. 6828) was agreed to.')).toBe('Agreed to');
  });

  it('leaves points of order and missing sentences blank', () => {
    expect(resultFromRecord('The point of order is well-taken.')).toBeNull();
    expect(
      resultFromRecord(
        'The Senate being equally divided, the Vice President votes in the affirmative and the point of order is sustained.'
      )
    ).toBeNull();
    expect(resultFromRecord(null)).toBeNull();
  });
});

describe('voteTitle', () => {
  it('writes the "<head>; <tail>" shape the vote readers split', () => {
    expect(
      voteTitle('On the Nomination', {
        kind: 'nomination',
        description: 'Keith Sonderling, of Florida, to be Secretary of Labor',
      })
    ).toBe('Confirmation: Keith Sonderling, of Florida, to be Secretary of Labor');
    expect(
      voteTitle('On the Amendment S.Amdt. 3937', {
        kind: 'amendment',
        number: '3937',
        sponsor: 'Collins',
        purpose: 'In the nature of a substitute.',
      })
    ).toBe('Collins Amdt. No. 3937; In the nature of a substitute.');
    expect(
      voteTitle('On Cloture on the Motion to Proceed', {
        kind: 'bill',
        label: 'H.R. 9340',
        title: 'Ratepayer Protection Act',
      })
    ).toBe('Cloture on the Motion to Proceed: H.R. 9340; Ratepayer Protection Act');
    expect(
      voteTitle('On Passage of the Bill', { kind: 'bill', label: 'S. 4668', title: 'An act' })
    ).toBe('S. 4668; An act');
  });
});

describe('labels and dates', () => {
  it('writes bill numbers as senate.gov does', () => {
    expect(billLabel('HR', '9340')).toBe('H.R. 9340');
    expect(billLabel('SJRES', '84')).toBe('S.J.Res. 84');
    expect(billLabel('HCONRES', '89')).toBe('H.Con.Res. 89');
    expect(billLabel('PN', '1')).toBeNull();
  });

  it('dates a vote by the day in Washington it closed', () => {
    // 2026 roll 96 closed after midnight in an overnight session.
    expect(easternDate('2026-04-23T05:10:38Z')).toBe('2026-04-23');
    expect(easternDate('2026-09-30T23:30:00Z')).toBe('2026-09-30');
  });
});

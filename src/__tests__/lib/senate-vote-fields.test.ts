/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import {
  amendmentNumberFromText,
  amendmentSponsorLabel,
  amendmentSponsorName,
  cleanAmendmentPurpose,
  isNominationNumber,
  nominationDescriptionFromTitle,
  parseBillMeasure,
  splitMenuTitle,
  stripMeasureTags,
} from '@/lib/senate-vote-fields';
import { voteMeasureLabel } from '@/lib/bill-label';

describe('senate-vote-fields', () => {
  it('strips <measure> markup and keeps the inner text', () => {
    expect(stripMeasureTags('On the Amendment\n        <measure>S.Amdt. 6835</measure>')).toBe(
      'On the Amendment S.Amdt. 6835'
    );
    expect(stripMeasureTags('On the Nomination\n         ')).toBe('On the Nomination');
  });

  it('treats "No Statement of Purpose on File." as no purpose', () => {
    expect(cleanAmendmentPurpose('No Statement of Purpose on File.')).toBeUndefined();
    expect(cleanAmendmentPurpose('  ')).toBeUndefined();
    expect(cleanAmendmentPurpose(undefined)).toBeUndefined();
    expect(cleanAmendmentPurpose('To improve the bill.')).toBe('To improve the bill.');
  });

  it('finds the amendment number in a question, with or without markup', () => {
    expect(amendmentNumberFromText('On the Amendment <measure>S.Amdt. 6835</measure>')).toBe(
      'S.Amdt. 6835'
    );
    expect(
      amendmentNumberFromText('On the Amendment S.Amdt. 6805 to S.Amdt. 6776 to S. 4668')
    ).toBe('S.Amdt. 6805');
    expect(amendmentNumberFromText('On Passage of the Bill')).toBeUndefined();
  });

  it('accepts sponsor labels but not motion titles', () => {
    expect(amendmentSponsorLabel('Booker Amdt. No. 6835')).toBe('Booker Amdt. No. 6835');
    expect(amendmentSponsorLabel('Van Hollen Amdt. No. 5632')).toBe('Van Hollen Amdt. No. 5632');
    expect(amendmentSponsorLabel('Amdt. No. 6776')).toBe('Amdt. No. 6776');
    expect(amendmentSponsorLabel('Motion to Table Lee Amdt. No. 4286')).toBeUndefined();
    expect(amendmentSponsorLabel('Motion to Invoke Cloture: Cruz Amdt. No. 6776')).toBeUndefined();
    expect(amendmentSponsorName('Booker Amdt. No. 6835')).toBe('Booker');
    expect(amendmentSponsorName('Van Hollen Amdt. No. 5632')).toBe('Van Hollen');
    expect(amendmentSponsorName('Amdt. No. 6776')).toBeUndefined();
    expect(amendmentSponsorName(undefined)).toBeUndefined();
  });

  it('splits menu titles at the first "; "', () => {
    expect(splitMenuTitle('Paul Amdt. No. 6758; To improve the bill.')).toEqual({
      head: 'Paul Amdt. No. 6758',
      tail: 'To improve the bill.',
    });
    expect(splitMenuTitle('H. Con. Res. 89')).toEqual({ head: 'H. Con. Res. 89' });
  });

  it('recognizes nominations and extracts the nominee description', () => {
    expect(isNominationNumber('PN999-1')).toBe(true);
    expect(isNominationNumber('PN12')).toBe(true);
    expect(isNominationNumber('S. 4668')).toBe(false);
    expect(nominationDescriptionFromTitle('Confirmation: Angela Veronica Colmenero, of T.X.')).toBe(
      'Angela Veronica Colmenero, of T.X.'
    );
    expect(nominationDescriptionFromTitle('Motion to Invoke Cloture: Jane Doe, of Ohio')).toBe(
      'Jane Doe, of Ohio'
    );
  });

  it('parses bill measures but not amendments, nominations or treaties', () => {
    expect(parseBillMeasure('S. 4668')).toEqual({ type: 'S', number: '4668' });
    expect(parseBillMeasure('H.Con.Res. 89')).toEqual({ type: 'HCONRES', number: '89' });
    expect(parseBillMeasure('S.Amdt. 6835')).toBeUndefined();
    expect(parseBillMeasure('PN999-1')).toBeUndefined();
    expect(parseBillMeasure('Treaty Doc. 118-3')).toBeUndefined();
  });
});

describe('voteMeasureLabel', () => {
  const bill = { number: '4668', type: 'S', title: 'A bill to protect …' };

  it('labels amendment votes by amendment, amended bill and purpose', () => {
    expect(
      voteMeasureLabel({
        bill,
        question: 'On the Amendment S.Amdt. 6835',
        amendment: {
          number: 'S.Amdt. 6835',
          purpose:
            'To establish certain standards with respect to coaches of varsity sports teams.',
        },
      })
    ).toBe(
      'S.Amdt. 6835 to S. 4668 — To establish certain standards with respect to coaches of varsity sports teams.'
    );
    expect(voteMeasureLabel({ bill, amendment: { number: 'S.Amdt. 1' } })).toBe(
      'S.Amdt. 1 to S. 4668'
    );
  });

  it('labels nomination votes by the nominee', () => {
    expect(
      voteMeasureLabel({
        bill: {
          number: 'N/A',
          title: 'Angela Veronica Colmenero, of Texas, …',
          type: 'Nomination',
        },
        question: 'On the Nomination',
        nomination: { number: 'PN999-1', description: 'Angela Veronica Colmenero, of Texas, …' },
      })
    ).toBe('Angela Veronica Colmenero, of Texas, …');
  });

  it('labels bill votes by number and title, preferring the display title', () => {
    expect(voteMeasureLabel({ bill })).toBe('S. 4668 — A bill to protect …');
    expect(
      voteMeasureLabel({ bill: { ...bill, displayTitle: 'Protect College Sports Act of 2026' } })
    ).toBe('S. 4668 — Protect College Sports Act of 2026');
    // Title fallback equal to the bill number is not repeated.
    expect(voteMeasureLabel({ bill: { ...bill, title: 'S. 4668' } })).toBe('S. 4668');
  });

  it('falls back to the cleaned question, then the roll number (old cached shapes)', () => {
    expect(
      voteMeasureLabel({
        bill: { number: 'N/A', title: 'Vote without associated bill', type: 'Senate Resolution' },
        question: 'On the Amendment <measure>S.Amdt. 6835</measure>',
      })
    ).toBe('On the Amendment S.Amdt. 6835');
    expect(voteMeasureLabel({ bill: null, question: '', rollNumber: 12 })).toBe('Roll call 12');
  });
});

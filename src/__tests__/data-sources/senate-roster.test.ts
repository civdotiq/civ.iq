/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Matching surnames printed in the Congressional Record to senators, on
 * entries copied from data/legislators-current.yaml and
 * data/legislators-departed.yaml (2026-10-29).
 */

import {
  isFirstOrLastDay,
  matchPrintedName,
  seatedOn,
  senateTerms,
  type RosterLegislator,
} from '@/lib/data-sources/congressional-record/senate-roster';

const legislators: RosterLegislator[] = [
  {
    id: { bioguide: 'G000359' },
    name: { last: 'Graham', official_full: 'Lindsey Graham' },
    terms: [
      { type: 'rep', start: '1995-01-04', end: '1997-01-03', state: 'SC' },
      { type: 'sen', start: '2021-01-03', end: '2026-07-11', state: 'SC' },
    ],
  },
  {
    id: { bioguide: 'G000608' },
    name: { last: 'Graham Nordone', official_full: 'Darline Graham' },
    terms: [{ type: 'sen', start: '2026-07-14', end: '2027-01-03', state: 'SC' }],
  },
  {
    id: { bioguide: 'S001184' },
    name: { last: 'Scott', official_full: 'Tim Scott' },
    terms: [{ type: 'sen', start: '2023-01-03', end: '2029-01-03', state: 'SC' }],
  },
  {
    id: { bioguide: 'S001217' },
    name: { last: 'Scott', official_full: 'Rick Scott' },
    terms: [
      { type: 'sen', start: '2019-01-08', end: '2025-01-03', state: 'FL' },
      { type: 'sen', start: '2025-01-03', end: '2031-01-03', state: 'FL' },
    ],
  },
  {
    id: { bioguide: 'L000570' },
    name: { last: 'Luján', official_full: 'Ben Ray Luján' },
    terms: [{ type: 'sen', start: '2021-01-03', end: '2027-01-03', state: 'NM' }],
  },
  {
    id: { bioguide: 'V000128' },
    name: { last: 'Van Hollen', official_full: 'Chris Van Hollen' },
    terms: [{ type: 'sen', start: '2023-01-03', end: '2029-01-03', state: 'MD' }],
  },
];

const terms = senateTerms(legislators);

describe('seatedOn', () => {
  it('follows appointments and departures by date', () => {
    const ids = (date: string) => seatedOn(terms, date).map(t => t.bioguide);
    expect(ids('2026-07-10')).toContain('G000359');
    expect(ids('2026-07-10')).not.toContain('G000608');
    expect(ids('2026-07-14')).toContain('G000608');
    expect(ids('2026-07-14')).not.toContain('G000359');
  });

  it('counts a senator once on the day one term ends and the next begins', () => {
    expect(seatedOn(terms, '2025-01-03').filter(t => t.bioguide === 'S001217')).toHaveLength(1);
  });
});

describe('matchPrintedName', () => {
  it('uses the printed state when two senators share a surname', () => {
    const seated = seatedOn(terms, '2026-09-30');
    expect(matchPrintedName('Scott (FL)', seated)).toEqual({ bioguide: 'S001217' });
    expect(matchPrintedName('Scott (SC)', seated)).toEqual({ bioguide: 'S001184' });
  });

  it('fails, never guesses, when a name could be either senator', () => {
    const result = matchPrintedName('Scott', seatedOn(terms, '2026-09-30'));
    expect(result).toEqual({ error: expect.stringMatching(/matches 2 seated senators/) });
  });

  it('fails when a name matches no one seated that day', () => {
    expect(matchPrintedName('Mullin', seatedOn(terms, '2026-09-30'))).toEqual({
      error: expect.stringMatching(/matches no seated senator/),
    });
  });

  it('reads "Graham" as the senator seated that day', () => {
    expect(matchPrintedName('Graham', seatedOn(terms, '2026-07-01'))).toEqual({
      bioguide: 'G000359',
    });
    // Darline Graham's name.last is "Graham Nordone"; her official name ends "Graham".
    expect(matchPrintedName('Graham', seatedOn(terms, '2026-09-30'))).toEqual({
      bioguide: 'G000608',
    });
  });

  it('ignores accents and keeps two-word surnames whole', () => {
    const seated = seatedOn(terms, '2026-09-30');
    expect(matchPrintedName('Lujan', seated)).toEqual({ bioguide: 'L000570' });
    expect(matchPrintedName('Van Hollen', seated)).toEqual({ bioguide: 'V000128' });
  });
});

describe('isFirstOrLastDay', () => {
  it("is true on an appointee's first day and a departing senator's last", () => {
    expect(isFirstOrLastDay(terms, 'G000608', '2026-07-14')).toBe(true);
    expect(isFirstOrLastDay(terms, 'G000359', '2026-07-11')).toBe(true);
  });

  it('is false mid-term and where one term runs into the next', () => {
    expect(isFirstOrLastDay(terms, 'G000608', '2026-07-15')).toBe(false);
    expect(isFirstOrLastDay(terms, 'S001217', '2025-01-03')).toBe(false);
  });
});

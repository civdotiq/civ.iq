/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The Congressional Record Senate roll-call reader, on real GPO text
 * (sections downloaded from GovInfo 2026-10-29; long sections trimmed to the
 * roll call; NUL bytes GPO leaves in the text stripped).
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseChangesOfVote,
  parseDigestVotePages,
  parseSenateRollCalls,
  recordNotes,
  recordText,
  selectGranulesForPages,
  senateGranuleStartPage,
} from '@/lib/data-sources/congressional-record/senate-roll-calls';

const fixture = (name: string) =>
  readFileSync(join(__dirname, 'fixtures/congressional-record', name), 'utf8');

const rollsIn = (name: string) => parseSenateRollCalls(recordText(fixture(name)));

describe('parseDigestVotePages', () => {
  it('reads a page list with a full range (Sep 30, 2026)', () => {
    expect(parseDigestVotePages(fixture('CREC-2026-09-30-senate-digest.txt'))).toEqual([
      { from: 5199, to: 5200 },
      { from: 5241, to: 5241 },
    ]);
  });

  it('expands shortened ranges ("S5039-44" is S5039 through S5044)', () => {
    const text =
      'Record Votes: Six record votes were taken today. (Total--250) \n' +
      '                                                         Pages S5039-44\n';
    expect(parseDigestVotePages(text)).toEqual([{ from: 5039, to: 5044 }]);
  });

  it('reads "and" and a one-hyphen total (Jun 16, 2026: "(Total-175)")', () => {
    const text =
      'Record Votes: Three record votes were taken today. (Total-175) \n' +
      '                                           Pages S2807, S2812-13, and S2815\n' +
      'Adjournment: Senate convened at 10 a.m.';
    expect(parseDigestVotePages(text)).toEqual([
      { from: 2807, to: 2807 },
      { from: 2812, to: 2813 },
      { from: 2815, to: 2815 },
    ]);
  });

  it('returns no pages when the Senate took no record votes', () => {
    expect(parseDigestVotePages(fixture('CREC-2026-10-26-senate-digest-pro-forma.txt'))).toEqual(
      []
    );
  });
});

describe('selectGranulesForPages', () => {
  // Sep 30, 2026: roll 256 is printed on S5241 but sits in the section that
  // starts on S5238, the one before the Digest's page.
  const ids = [
    'CREC-2026-09-30-pt1-PgS5237',
    'CREC-2026-09-30-pt1-PgS5238',
    'CREC-2026-09-30-pt1-PgS5241',
    'CREC-2026-09-30-pt1-PgS5241-2',
    'CREC-2026-09-30-pt1-PgS5242',
  ];

  it('takes the sections on the pages plus the one running onto them', () => {
    expect(selectGranulesForPages(ids, [{ from: 5241, to: 5241 }])).toEqual([
      'CREC-2026-09-30-pt1-PgS5238',
      'CREC-2026-09-30-pt1-PgS5241',
      'CREC-2026-09-30-pt1-PgS5241-2',
    ]);
  });

  it('reads the start page from a section ID', () => {
    expect(senateGranuleStartPage('CREC-2026-09-30-pt1-PgS5199-2')).toBe(5199);
    expect(senateGranuleStartPage('CREC-2026-09-30-pt1-PgS-FrontMatter-3')).toBeNull();
  });
});

describe('parseSenateRollCalls', () => {
  it('reads roll 253 of 2026: every name, both Scotts, the tally', () => {
    const [roll] = rollsIn('CREC-2026-09-30-PgS5199-roll-253.htm');
    expect(roll?.rollCall).toBe(253);
    expect(roll?.kind).toBe('Leg');
    expect(roll?.printedCounts).toEqual({ Y: 53, N: 47 });
    expect(roll?.names.Y).toHaveLength(53);
    expect(roll?.names.N).toHaveLength(47);
    expect(roll?.names.Y).toEqual(
      expect.arrayContaining(['Scott (FL)', 'Scott (SC)', 'Hyde-Smith'])
    );
    expect(roll?.names.N).toEqual(
      expect.arrayContaining(['Blunt Rochester', 'Van Hollen', 'Lujan'])
    );
    expect(roll?.tally).toEqual({ yeas: 53, nays: 47 });
  });

  it('joins a name list across a page break (roll 256, an "Ex." vote on S5241)', () => {
    const [roll] = rollsIn('CREC-2026-09-30-PgS5238-roll-256-page-break.htm');
    expect(roll?.rollCall).toBe(256);
    expect(roll?.kind).toBe('Ex');
    const listed = roll ? roll.names.Y.length + roll.names.N.length + roll.names.X.length : 0;
    const printed = roll ? Object.values(roll.printedCounts).reduce((a, b) => a + b, 0) : -1;
    expect(listed).toBe(printed);
    expect(roll?.result).toMatch(/nomination was confirmed/i);
  });

  it('records a Vice President tie-break as the result, not as a senator (roll 9)', () => {
    const [roll] = rollsIn('CREC-2026-01-14-PgS218-roll-9-vice-president.htm');
    expect(roll?.rollCall).toBe(9);
    expect(roll?.names.Y).toHaveLength(50);
    expect(roll?.names.N).toHaveLength(50);
    expect(roll?.vicePresident).toBe('Y');
    expect(roll?.result).toMatch(/point of order is sustained/i);
  });

  it("reads an ANSWERED ``PRESENT'' heading (roll 44)", () => {
    const [roll] = rollsIn('CREC-2026-03-02-roll-44-answered-present.htm');
    expect(roll?.printedCounts).toEqual({ Y: 84, N: 6, P: 1, X: 9 });
    expect(roll?.names.P).toEqual(['Booker']);
    expect(roll?.unknownHeadings).toEqual([]);
  });

  it('reads "YEAS--- 99" (roll 119)', () => {
    const [roll] = rollsIn('CREC-2026-05-13-roll-119-three-hyphens.htm');
    expect(roll?.printedCounts.Y).toBe(99);
    expect(roll?.names.Y).toHaveLength(99);
  });

  it('keeps the lead-in tally apart from a misprinted read-out (roll 138: "54" for 84)', () => {
    const [roll] = rollsIn('CREC-2026-06-04-roll-138-chair-misprint.htm');
    expect(roll?.tally).toEqual({ yeas: 15, nays: 84 });
    expect(roll?.chairTally).toEqual({ yeas: 15, nays: 54 });
    expect(roll?.names.N).toHaveLength(84);
  });

  it('reads the corrected list around a GPO note, and keeps the note (roll 99)', () => {
    const html = fixture('CREC-2026-04-22-roll-99-correction-note.htm');
    const [roll] = parseSenateRollCalls(recordText(html));
    expect(roll?.rollCall).toBe(99);
    expect(roll?.names.Y).toHaveLength(25);
    expect(roll?.names.N).toHaveLength(73);
    // The note: Husted was first printed as a nay; the online Record has him as a yea.
    expect(roll?.names.Y).toContain('Husted');
    expect(roll?.names.N).not.toContain('Husted');
    const notes = recordNotes(html);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatch(/corrected to read: \[Rollcall Vote No\. 99 Leg\.\]/);
  });

  it('strips NUL bytes and page markers', () => {
    const text = recordText('\0     Alsobrooks\n\n[[Page S18]]\n\n     Baldwin\n');
    expect(text).not.toMatch(/\0|\[\[Page/);
  });
});

describe('print variants seen in 2025', () => {
  it('reads a reversed lead-in tally ("announced--60 yeas, 36 nays", roll 219)', () => {
    const text =
      '  The result was announced--60 yeas, 36 nays, as follows:\n\n' +
      '                      [Rollcall Vote No. 219 Ex.]\n\n' +
      '                                YEAS--60\n\n     Alsobrooks\n\n' +
      '  The nomination was confirmed.\n';
    expect(parseSenateRollCalls(text)[0]?.tally).toEqual({ yeas: 60, nays: 36 });
  });

  it('reads a heading printed without its number ("NOT VOTING--", roll 444)', () => {
    const text =
      '                      [Rollcall Vote No. 444 Ex.]\n\n' +
      '                                YEAS--1\n\n     Welch\n\n' +
      '                              NOT VOTING--\n\n       \n     Justice\n       \n' +
      '  The PRESIDING OFFICER (Mr. Banks). On this vote, the yeas are 52.\n';
    const [roll] = parseSenateRollCalls(text);
    expect(roll?.names.X).toEqual(['Justice']);
    expect(roll?.uncountedHeadings).toEqual(['X']);
    expect(roll?.printedCounts.X).toBeUndefined();
  });

  it('keeps a bare "<" in the text from swallowing the roll call ("<50K", 2025)', () => {
    const htm =
      '<pre>Income  <50K   50-100K\n  The result was announced--yeas 15, nays 82, as follows:\n' +
      '                      [Rollcall Vote No. 165 Leg.]\n</pre>';
    expect(parseSenateRollCalls(recordText(htm))[0]?.rollCall).toBe(165);
  });

  it('reads "Exec." in a roll call header (roll 543, as corrected)', () => {
    expect(parseSenateRollCalls('[Rollcall Vote No. 543 Exec.]')[0]?.kind).toBe('Ex');
  });
});

describe('parseChangesOfVote', () => {
  it('reads a granted change of vote (Padilla, roll 26 of 2025)', () => {
    expect(parseChangesOfVote(fixture('CREC-2025-02-04-PgS574-change-of-vote.htm'))).toEqual([
      { speaker: 'PADILLA', rollCall: 26, from: 'N', to: 'Y' },
    ]);
  });

  it('reads "I was recorded as a ``yes.\'\'" (Alsobrooks, roll 114 of 2025)', () => {
    const text =
      '  Ms. ALSOBROOKS. Mr. President, on rollcall vote No. 114, I was \n' +
      "recorded as a ``yes.'' It was my intention to vote no.\n" +
      '  Therefore, I ask unanimous consent that I be permitted to change my \n' +
      'vote since it will not affect the outcome.\n' +
      '  The PRESIDING OFFICER. Without objection, it is so ordered.\n';
    expect(parseChangesOfVote(text)).toEqual([
      { speaker: 'ALSOBROOKS', rollCall: 114, from: 'Y', to: 'N' },
    ]);
  });

  it('ignores a request the chair did not grant', () => {
    const text =
      '  Mr. PADILLA. Mr. President, on rollcall vote 26, I voted nay. It was \n' +
      'my intention to vote aye. I ask unanimous consent that I be permitted \n' +
      'to change my vote.\n  Mr. LEE. I object.\n';
    expect(parseChangesOfVote(text)).toEqual([]);
  });
});

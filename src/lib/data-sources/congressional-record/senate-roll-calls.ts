/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Senate roll-call votes as printed in the Congressional Record (GovInfo, GPO).
 *
 * senate.gov has blocked our vote mirror since 2026-10-23 (issue #300). The
 * Record prints every Senate roll call the morning after it is held:
 *
 *   The yeas and nays resulted--yeas 53, nays 47, as follows:
 *                       [Rollcall Vote No. 253 Leg.]
 *                                 YEAS--53
 *      Armstrong
 *      ...
 *      Scott (FL)
 *                                 NAYS--47
 *      ...
 *   The PRESIDING OFFICER. On this vote, the yeas are 53, the nays are 47.
 *   ... The motion was agreed to.
 *
 * Senators are printed by surname, with "(ST)" only when two sitting senators
 * share it; senate-roster.ts turns them into Bioguide IDs. This module only
 * reads text: finding the right Record sections, and parsing them.
 *
 * Variations seen across 2025 and 2026: "Rollcall vote", "Ex.", "Exec.",
 * "Executive" or no kind at all, "No. 71." with a stray period, page markers
 * ("[[Page S544]]") inside a name list, and Digest page lists that are wrong
 * (roll 75 is on S1707; the Digest says S1701).
 */

import type { PositionCode } from '@/features/representatives/services/roll-call-corpus';

export interface PageRange {
  from: number;
  to: number;
}

export interface Tally {
  yeas: number;
  nays: number;
}

export interface RecordRollCall {
  rollCall: number;
  /** "Leg." (legislative) or "Ex." (executive: nominations, treaties); null when not printed. */
  kind: 'Leg' | 'Ex' | null;
  /** Surnames as printed under each heading. */
  names: Record<PositionCode, string[]>;
  /** The number printed in each heading ("YEAS--53"). */
  printedCounts: Partial<Record<PositionCode, number>>;
  /** Headings other than the four known ones. Any of these fails the roll call. */
  unknownHeadings: string[];
  /** Known headings printed without their number ("NOT VOTING--"). */
  uncountedHeadings: PositionCode[];
  /** The lead-in tally: "resulted--yeas 53, nays 47" or "The result was
   *  announced--yeas 50, nays 35". */
  tally: Tally | null;
  /** The chair's read-out, when printed: "On this vote, the yeas are 53, the
   *  nays are 47". GPO misprints it now and then (2026 roll 138: "54" for 84). */
  chairTally: Tally | null;
  /** Set when the Vice President broke a tie. The result, never a senator's vote. */
  vicePresident: 'Y' | 'N' | null;
  /** The sentence giving the outcome ("The motion was rejected."), when found. */
  result: string | null;
  /** Up to 8,000 characters of Record text before the roll call (back to the
   *  previous one), whitespace collapsed: where the measure is named. */
  context: string;
}

const HEADINGS: Record<string, PositionCode> = {
  YEAS: 'Y',
  NAYS: 'N',
  'NOT VOTING': 'X',
  PRESENT: 'P',
  'ANSWERED PRESENT': 'P',
};

/**
 * Pages the Senate Daily Digest gives for the day's record votes:
 * "(Total--256) Pages S5199-S5200, S5241". GPO shortens ranges ("S5039-44"
 * is S5039 through S5044) and sometimes prints one hyphen ("(Total-175)").
 */
export function parseDigestVotePages(digestText: string): PageRange[] {
  const clean = digestText.replace(/\0/g, '');
  const match =
    /Record\s+Votes?:[^()]{0,300}\(Total-+\s*\d+\s*\)\s*(Pages?\s+[S\d,\s-]*(?:and\s+S\d+(?:-S?\d+)?)?)/i.exec(
      clean
    );
  if (!match?.[1]) return [];
  const ranges: PageRange[] = [];
  for (const m of match[1].matchAll(/S(\d+)(?:-S?(\d+))?/g)) {
    const start = m[1] ?? '';
    const end = m[2] ?? start;
    const fullEnd =
      end.length < start.length ? start.slice(0, start.length - end.length) + end : end;
    ranges.push({ from: Number(start), to: Number(fullEnd) });
  }
  return ranges;
}

/** Senate page a Record section starts on: "CREC-2026-09-30-pt1-PgS5199-2" → 5199. */
export function senateGranuleStartPage(granuleId: string): number | null {
  const m = /-PgS(\d+)(?:-\d+)?$/.exec(granuleId);
  return m?.[1] ? Number(m[1]) : null;
}

/**
 * The Senate sections (in Record order) that cover the given pages: every
 * section starting inside a range, plus the one before it, which may run onto
 * the range's first page (roll 256 of 2026 starts in a section on S5238 and is
 * printed on S5241).
 */
export function selectGranulesForPages(granuleIds: string[], ranges: PageRange[]): string[] {
  const picked = new Set<number>();
  for (const range of ranges) {
    let before = -1;
    granuleIds.forEach((id, i) => {
      const page = senateGranuleStartPage(id);
      if (page === null) return;
      if (page < range.from) before = i;
      else if (page <= range.to) picked.add(i);
    });
    if (before >= 0) picked.add(before);
  }
  return [...picked].sort((a, b) => a - b).map(i => granuleIds[i] ?? '');
}

/** Real tags only: the text itself can hold a bare "<" ("<50K" in a 2025 table). */
const HTML_TAG = /<\/?[a-zA-Z][^>]*>/g;

/**
 * Plain text of a Record section's HTML: tags, entities, NUL bytes, the GPO
 * header, page markers and GPO correction notes removed, so sections can be
 * joined in order and a roll call split across two of them reads as one.
 * The text online is already corrected; recordNotes() keeps the notes.
 */
export function recordText(htm: string): string {
  let text = htm
    .replace(/\0/g, '')
    .replace(HTML_TAG, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'");
  const header = text.indexOf('[www.gpo.gov]');
  if (header >= 0) text = text.slice(text.indexOf('\n', header) + 1);
  return text
    .replace(NOTE_BLOCK, '')
    .split('\n')
    .filter(line => !/^\s*\[\[Page [SH]\d+\]\]\s*$/.test(line))
    .join('\n');
}

const NOTE_BLOCK = /[ \t]*=+ NOTE =+[\s\S]*?=+ END NOTE =+[ \t]*/g;

/**
 * GPO correction notes in a Record section that mention a roll call: "On page
 * S1914 ... the following appears: [Rollcall Vote No. 99 Leg.] ... The online
 * Record has been corrected to read: ...". Whitespace collapsed.
 */
export function recordNotes(htm: string): string[] {
  const text = htm.replace(/\0/g, '').replace(HTML_TAG, '');
  return [...text.matchAll(NOTE_BLOCK)]
    .map(m =>
      m[0]
        .replace(/=+ (?:END )?NOTE =+/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    )
    .filter(note => /Rollcall\s+Vote/i.test(note));
}

const ROLL_HEADER =
  /\[Rollcall\s+Vote\s+No\.\s*(\d+)\.?\s*(Leg|Legislative|Ex|Exec|Executive)?\.?\]/gi;
/** "YEAS--53", "YEAS--- 99", "ANSWERED ``PRESENT'' --1", and once "NOT VOTING--"
 *  with the number left off (2025 roll 444). */
const HEADING_LINE = /^\s+([A-Z][A-Z `']*[A-Z'])\s*-{2,}\s*(\d+)?\s*$/;
/** A printed surname: one or two capitalized words ("Van Hollen", "Hyde-Smith",
 *  "McCormick"), maybe "(ST)". Indented five spaces, or centered after a GPO
 *  note. All-caps section titles and running text don't match. */
const NAME_WORD = "[A-Z][a-z\u00e0-\u00ff][A-Za-z\u00e0-\u00ff'.-]*";
const NAME_LINE = new RegExp(`^\\s+(${NAME_WORD}(?: ${NAME_WORD})?(?: \\([A-Z]{2}\\))?)\\s*$`);
/** "resulted--yeas 53, nays 47", "announced---yeas 48, nays 47", "resulted 54, nays 46". */
const LEAD_IN_TALLY = /(?:resulted|announced)-*\s*(?:yeas\s+)?(\d+),?\s+nays\s+(\d+)/gi;
/** "The result was announced--60 yeas, 36 nays" (2025 roll 219). */
const LEAD_IN_TALLY_REVERSED = /(?:resulted|announced)-*\s*(\d+)\s+yeas,?\s+(\d+)\s+nays/gi;
const CHAIR_TALLY = /the yeas are (\d+),? (?:and )?the nays are (\d+)/i;

function emptyNames(): Record<PositionCode, string[]> {
  return { Y: [], N: [], P: [], X: [] };
}

/** Roll calls printed in Record text (one or more sections joined in order). */
export function parseSenateRollCalls(text: string): RecordRollCall[] {
  const headers = [...text.matchAll(ROLL_HEADER)];
  return headers.map((header, i) => {
    const start = (header.index ?? 0) + header[0].length;
    const end = headers[i + 1]?.index ?? text.length;
    const kindWord = header[2]?.toLowerCase();
    const roll: RecordRollCall = {
      rollCall: Number(header[1]),
      kind: kindWord ? (kindWord.startsWith('ex') ? 'Ex' : 'Leg') : null,
      names: emptyNames(),
      printedCounts: {},
      unknownHeadings: [],
      uncountedHeadings: [],
      tally: null,
      chairTally: null,
      vicePresident: null,
      result: null,
      context: text
        .slice(Math.max(headers[i - 1]?.index ?? 0, (header.index ?? 0) - 8000), header.index ?? 0)
        .replace(/\s+/g, ' ')
        .trim(),
    };

    // The name lists: headings and surnames, until the first line of running
    // text ("  The PRESIDING OFFICER. ...").
    const lines = text.slice(start, end).split('\n');
    let current: PositionCode | null = null;
    let afterLists = lines.length;
    for (let li = 0; li < lines.length; li++) {
      const line = lines[li] ?? '';
      if (!line.trim()) continue;
      const heading = HEADING_LINE.exec(line);
      if (heading) {
        const label = (heading[1] ?? '').replace(/[`']/g, '').replace(/\s+/g, ' ');
        const code = HEADINGS[label];
        if (code && heading[2] === undefined) {
          current = code;
          roll.uncountedHeadings.push(code);
        } else if (code) {
          current = code;
          roll.printedCounts[code] = (roll.printedCounts[code] ?? 0) + Number(heading[2]);
        } else {
          current = null;
          roll.unknownHeadings.push(label);
        }
        continue;
      }
      const name = NAME_LINE.exec(line);
      if (name && current) {
        roll.names[current].push(name[1] ?? '');
        continue;
      }
      afterLists = li;
      break;
    }

    // What follows the lists, up to the next roll call: the chair's tally,
    // a Vice President's tie-breaking vote, and the outcome.
    const rest = lines.slice(afterLists).join('\n').slice(0, 2500);
    const flat = rest.replace(/\s+/g, ' ');
    const before = text
      .slice(Math.max(0, (header.index ?? 0) - 400), header.index ?? 0)
      .replace(/\s+/g, ' ');
    const leadIn =
      [...before.matchAll(LEAD_IN_TALLY)].pop() ??
      [...before.matchAll(LEAD_IN_TALLY_REVERSED)].pop();
    const chair = CHAIR_TALLY.exec(flat);
    if (leadIn) roll.tally = { yeas: Number(leadIn[1]), nays: Number(leadIn[2]) };
    if (chair) roll.chairTally = { yeas: Number(chair[1]), nays: Number(chair[2]) };
    const vp = /Vice President votes in the (affirmative|negative)/i.exec(flat);
    if (vp) roll.vicePresident = vp[1]?.toLowerCase() === 'affirmative' ? 'Y' : 'N';
    const result =
      /[^.]*\b(?:is|was|are|were)\s+(?:not\s+)?(?:agreed to|confirmed|passed|adopted|sustained|rejected|invoked|ratified|well[ -]taken|tabled)\b[^.]*\./i.exec(
        flat
      ) ?? /[^.]*\bfails? (?:of passage|to pass)\b[^.]*\./i.exec(flat);
    if (result) roll.result = result[0].trim();
    return roll;
  });
}

export interface ChangeOfVote {
  /** The senator's surname as the Record prints the speaker ("PADILLA"). */
  speaker: string;
  rollCall: number;
  /** The vote as cast, and the vote the Senate agreed to record instead. */
  from: PositionCode;
  to: PositionCode;
}

const VOTE_WORD: Record<string, PositionCode> = { aye: 'Y', yea: 'Y', yes: 'Y', nay: 'N', no: 'N' };

/**
 * A senator may ask unanimous consent to change a recorded vote when it won't
 * change the outcome. The Record prints it days later in a "Change of Vote"
 * section, and senate.gov's roll call shows the changed vote:
 *
 *   Mr. PADILLA. Mr. President, on rollcall vote 26, I voted nay. It was my
 *   intention to vote aye. I ask unanimous consent that I be permitted to
 *   change my vote since it will not affect the outcome.
 *   The PRESIDING OFFICER. Without objection, it is so ordered.
 *
 * Only requests the chair grants ("so ordered") count.
 */
export function parseChangesOfVote(htm: string): ChangeOfVote[] {
  const flat = recordText(htm).replace(/[`']+/g, '').replace(/\s+/g, ' ');
  const changes: ChangeOfVote[] = [];
  const request =
    /\bM(?:r|s|rs)\. ([A-Z][A-Z -]*[A-Z])(?: of [A-Z][a-z]+(?: [A-Z][a-z]+)?)?\. .*?rollcall vote (?:No\. ?)?(\d+), I (?:voted|was recorded as(?: a)?) (aye|yea|yes|nay|no)\b.*?intention to vote (aye|yea|yes|nay|no)\b(.*?)(?=\bM(?:r|s|rs)\. [A-Z]{2,}|$)/gi;
  for (const m of flat.matchAll(request)) {
    const from = VOTE_WORD[(m[3] ?? '').toLowerCase()];
    const to = VOTE_WORD[(m[4] ?? '').toLowerCase()];
    if (!from || !to || from === to || !/so ordered/i.test(m[5] ?? '')) continue;
    changes.push({ speaker: m[1] ?? '', rollCall: Number(m[2]), from, to });
  }
  return changes;
}

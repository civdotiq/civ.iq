/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * What a Senate roll call read from the Congressional Record was on: the
 * question, result, measure and title that senate.gov's vote menu carries
 * (SenateMenuEntry q, r, i and t).
 *
 * The Record prints every senator's position, but names the measure only in
 * running text. Congress.gov (Library of Congress) lists, on each bill,
 * amendment and nomination, the Senate record votes taken on it:
 *
 *   "Confirmed by the Senate by Yea-Nay Vote. 47 - 41. Record Vote Number: 256."
 *
 * Candidates come from the Daily Digest entry that reports the vote ("By 47
 * yeas to 41 nays (Vote No. EX. 256), Keith Sonderling, of Florida, to be
 * Secretary of Labor.") and from the Record text before it. A measure is used
 * only when Congress.gov's own actions on it list this roll call. Anything not
 * confirmed that way is left blank: a vote shows without a bill link rather
 * than with a guessed one.
 *
 * Pure functions; the fetching lives in scripts/senate-record-source.ts.
 */

import { foldForSearch } from '@/lib/utils/fold-for-search';

/** A bill or resolution (Congress.gov type code) or a Senate amendment. */
export type MeasureRef =
  { kind: 'bill'; type: string; number: string } | { kind: 'amendment'; number: string };

/** The fields of a Congress.gov action this module reads. */
export interface CongressAction {
  actionDate?: string;
  text?: string;
  recordedVotes?: Array<{
    chamber?: string;
    rollNumber?: number;
    sessionNumber?: number;
    /** When the vote closed, UTC ("2026-04-23T04:24:54Z"). */
    date?: string;
  }>;
}

/** The vote's close time from an action that records it, or null. */
export function recordedVoteTime(
  action: CongressAction,
  rollCall: number,
  session: number
): string | null {
  const vote = (action.recordedVotes ?? []).find(
    v => v.rollNumber === rollCall && v.sessionNumber === session
  );
  return vote?.date && !Number.isNaN(Date.parse(vote.date)) ? vote.date : null;
}

/** The calendar day in Washington of a UTC time. */
export function easternDate(utc: string): string {
  return new Date(utc).toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
}

/** Congress.gov type code → the label senate.gov's vote menu uses. */
const BILL_LABEL: Record<string, string> = {
  HR: 'H.R.',
  S: 'S.',
  HJRES: 'H.J.Res.',
  SJRES: 'S.J.Res.',
  HCONRES: 'H.Con.Res.',
  SCONRES: 'S.Con.Res.',
  HRES: 'H.Res.',
  SRES: 'S.Res.',
};

/** "H.R. 9340" from { type: 'HR', number: '9340' }. */
export function billLabel(type: string, number: string): string | null {
  const label = BILL_LABEL[type.toUpperCase()];
  return label ? `${label} ${number}` : null;
}

/** "PN1129" for part 00, "PN938-2" for part 02, as senate.gov writes them. */
export function nominationCitation(number: number | string, partNumber?: string): string {
  const part = Number.parseInt(partNumber ?? '0', 10);
  return part > 0 ? `PN${number}-${part}` : `PN${number}`;
}

/** A Digest page reference line: "Page S157", "  Pages S147-57", "Pages S5199-S5201, S5241". */
const PAGE_REF_LINE = /^\s*(?:Pages?\s+S\d[\dS,\s-]*(?:and\s+S\d+)?|\[\[Page [A-Z]\d+\]\])\s*$/;

/** Labels inside an entry that also start in column 0 after a page
 *  reference ("Pending: Scott (SC)/Warren Amendment No. 4308, …"). */
const ENTRY_SUBHEADING =
  /^(?:Pending|Rejected|Adopted|Agreed to|Not agreed to|Withdrawn|Failed|Fell|Tabled|Ruled[^:]{0,40})\s*:/i;

/**
 * The Daily Digest entry that reports a roll call: from the entry's heading
 * to the end of the paragraph naming "(Vote No. 255)" or "(Vote No. EX.
 * 256)". Each entry starts in column 0 right after a page reference line;
 * its own lines wrap to column 0 too, and its later paragraphs are indented:
 *
 *   Page S176
 *   Patient Protection and Affordable Care Act; Market Integrity and
 *   Affordability: Senate began consideration of the motion to proceed to
 *   consideration of S.J. Res. 84, providing for …
 *     Pages S147-57
 *     By 47 yeas to 52 nays (Vote No. 8), Senate did not agree to the
 *   motion to proceed to consideration of the joint resolution.
 *   Page S152
 *
 * Null when the Digest doesn't name the vote.
 */
export function digestVoteContext(digestText: string, rollCall: number): string | null {
  const mention = new RegExp(`\\(Vote\\s+No\\.\\s*(?:EX\\.\\s*)?${rollCall}\\)`).exec(digestText);
  if (!mention) return null;
  const lines = digestText.split('\n');
  let at = digestText.slice(0, mention.index).split('\n').length - 1;
  let start = at;
  for (let i = at; i >= 0; i--) {
    const line = lines[i] ?? '';
    const previous = i > 0 ? (lines[i - 1] ?? '') : '';
    start = i;
    if (
      /^\S/.test(line) &&
      !PAGE_REF_LINE.test(line) &&
      !ENTRY_SUBHEADING.test(line) &&
      (i === 0 || PAGE_REF_LINE.test(previous))
    ) {
      break;
    }
  }
  // The paragraph runs on to its page reference.
  while (at + 1 < lines.length && !PAGE_REF_LINE.test(lines[at + 1] ?? '')) at += 1;
  return lines
    .slice(start, at + 1)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** "H.R. 9340", "S. 2296", "S.J. Res. 84", "S. CON. RES. 7" (titles are in capitals). */
const BILL_CITATION =
  /(?<![A-Za-z.])([HS])\.\s?(?:([Jj])\.\s?)?(?:(Con|CON)\.\s?)?(R\.|Res\.|RES\.)?\s?(\d{1,5})\b/g;
const AMENDMENT_CITATION = /\bamendment\s+No\.\s*(\d{1,5})\b/gi;

/** Bills, resolutions and amendments cited in Record or Digest text. */
export function measureCitations(text: string): MeasureRef[] {
  const flat = text.replace(/\s+/g, ' ');
  const out = new Map<string, MeasureRef>();
  for (const m of flat.matchAll(BILL_CITATION)) {
    const chamber = m[1] ?? '';
    const joint = m[2] ? 'J' : '';
    const con = m[3] ? 'CON' : '';
    const tail = m[4] === 'R.' ? 'R' : m[4] ? 'RES' : '';
    if (tail === 'R' && (chamber !== 'H' || joint || con)) continue;
    if ((joint || con) && tail !== 'RES') continue;
    const type = `${chamber}${joint}${con}${tail}`;
    if (!BILL_LABEL[type]) continue;
    const number = m[5] ?? '';
    out.set(`bill|${type}|${number}`, { kind: 'bill', type, number });
  }
  for (const m of flat.matchAll(AMENDMENT_CITATION)) {
    const number = m[1] ?? '';
    out.set(`amendment|${number}`, { kind: 'amendment', number });
  }
  return [...out.values()];
}

const NOMINEE =
  /([A-Z][A-Za-zÀ-ſ.'’-]*(?:\s+[A-Z][A-Za-zÀ-ſ.'’-]*){0,5}),\s+of\s+(?:the\s+)?([A-Z][a-z]+(?:\s+(?:of\s+)?[A-Z][a-z]+){0,3}),\s+to\s+be\b/g;

function nomineeKeyOf(name: string, state: string): string {
  const fold = (s: string) => foldForSearch(s).replace(/[.'’]/g, '').replace(/\s+/g, ' ').trim();
  return `${fold(name)}|${fold(state)}`;
}

/** "keith sonderling|florida" for each "Keith Sonderling, of Florida, to be …" in the text. */
export function nomineeKeys(text: string): string[] {
  const flat = text.replace(/\s+/g, ' ');
  return [...new Set([...flat.matchAll(NOMINEE)].map(m => nomineeKeyOf(m[1] ?? '', m[2] ?? '')))];
}

/** The nominee key of a Congress.gov nomination description, or null. */
export function nominationKey(description: string | undefined): string | null {
  if (!description) return null;
  const m = new RegExp(NOMINEE.source).exec(description.replace(/\s+/g, ' '));
  return m && m.index === 0 ? nomineeKeyOf(m[1] ?? '', m[2] ?? '') : null;
}

/**
 * Actions that record this roll call: Congress.gov's recordedVotes entry for
 * the Senate roll and session, or, where an action has none (nominations),
 * "Record Vote Number: N" in its text on one of the vote's possible dates.
 */
export function actionsForRoll(
  actions: CongressAction[],
  rollCall: number,
  session: number,
  dates: string[]
): CongressAction[] {
  const number = new RegExp(`Record Vote Number:?\\s*${rollCall}\\b`, 'i');
  return actions.filter(a => {
    const recorded = a.recordedVotes ?? [];
    if (recorded.length) {
      return recorded.some(
        v =>
          (v.chamber ?? '').toLowerCase() === 'senate' &&
          v.rollNumber === rollCall &&
          v.sessionNumber === session
      );
    }
    return number.test(a.text ?? '') && dates.includes((a.actionDate ?? '').slice(0, 10));
  });
}

/** The amendment an action votes on ("Amendment SA 3937 agreed to …",
 *  "Motion to table amendment SA 3941 …"). An amendment in parentheses is a
 *  motion's own text, not the question ("Cloture on the motion to concur …
 *  with an amendment (SA 5823) invoked": 2026 roll 180). */
export function amendmentInAction(text: string): string | null {
  return /\bamendment\s+SA\s+(\d{1,5})\b/i.exec(text)?.[1] ?? null;
}

export type VoteTarget =
  { kind: 'nomination' } | { kind: 'bill'; type: string } | { kind: 'amendment'; number: string };

const PASSAGE_QUESTIONS = new Set([
  'On Passage of the Bill',
  'On the Joint Resolution',
  'On the Concurrent Resolution',
  'On the Resolution',
]);

function passageQuestion(type: string): string | null {
  if (type === 'HR' || type === 'S') return 'On Passage of the Bill';
  if (type.endsWith('JRES')) return 'On the Joint Resolution';
  if (type.endsWith('CONRES')) return 'On the Concurrent Resolution';
  if (type.endsWith('RES')) return 'On the Resolution';
  return null;
}

/**
 * senate.gov's question wording for a Congress.gov action, or null when the
 * action doesn't say. Amendment votes carry the amendment, as senate.gov's
 * do ("On the Motion to Table S.Amdt. 3941").
 */
/** "Motion by Senator Cortez Masto to recommit …" reads as "motion to recommit …". */
function plainAction(text: string): string {
  return text.toLowerCase().replace(/\bmotion by senators? [^,;]*? to\b/, 'motion to');
}

export function questionFromAction(text: string, target: VoteTarget): string | null {
  const t = plainAction(text);
  const amdt = target.kind === 'amendment' ? ` S.Amdt. ${target.number}` : '';
  // An appeal of the chair's ruling: senate.gov names no amendment (2025 roll 331).
  if (/ruling of the chair|decision of the chair/.test(t)) return 'On the Decision of the Chair';
  // "Motion … to reconsider tabled" was a vote to table the motion (2025 roll 38).
  if (/to reconsider (?:was )?tabled/.test(t)) return `On the Motion to Table${amdt}`;
  // Motions first: "Motion to table the point of order …" is on the motion.
  if (/motion to reconsider/.test(t)) return 'On the Motion to Reconsider';
  if (/motion to adjourn/.test(t)) return 'On the Motion to Adjourn';
  if (/motion to table/.test(t)) return `On the Motion to Table${amdt}`;
  if (/motion to recommit/.test(t)) return 'On the Motion to Recommit';
  if (/motion to discharge|\bdischarged by\b/.test(t)) return 'On the Motion to Discharge';
  if (/point of order/.test(t)) return 'On the Point of Order';
  if (/cloture (?:motion )?on the motion to proceed/.test(t)) {
    return 'On Cloture on the Motion to Proceed';
  }
  if (/cloture/.test(t)) return `On the Cloture Motion${amdt}`;
  if (/motion to proceed/.test(t)) return 'On the Motion to Proceed';
  // Agreeing to the House's amendment is a motion to concur (2025 roll 648).
  if (/\bmotion\b|\bconcurred in\b|agreed to the house amendment/.test(t)) {
    return `On the Motion${amdt}`;
  }
  if (target.kind === 'nomination') return /confirm/.test(t) ? 'On the Nomination' : null;
  if (target.kind === 'amendment') return /amendment/.test(t) ? `On the Amendment${amdt}` : null;
  if (/passed|passage|agreed to|failed/.test(t)) return passageQuestion(target.type);
  return null;
}

/** Points of order and appeals of the chair: senate.gov, Congress.gov and
 *  the Record word their results differently from each other (2026 roll 9:
 *  Congress.gov "agreed to", the Record "sustained", senate.gov "Well
 *  Taken"; 2025 roll 330: the Record "not well-taken", senate.gov
 *  "Sustained"), so their result is left blank. */
const POINT_OF_ORDER = /point of order|decision of the chair|ruling of the chair/;

/** senate.gov's result wording for a Congress.gov action, or null. */
export function resultFromAction(text: string, target: VoteTarget): string | null {
  const t = plainAction(text);
  if (!/^motion to (?:table|waive)/.test(t) && POINT_OF_ORDER.test(t)) return null;
  if (/\bdischarged by\b|\bconcurred in\b/.test(t)) return 'Agreed to';
  if (/not confirmed|rejected|not agreed to|not invoked|failed/.test(t)) return 'Rejected';
  if (/confirmed/.test(t)) return 'Confirmed';
  if (/\bpassed\b/.test(t)) {
    if (target.kind !== 'bill') return null;
    return target.type === 'HR' || target.type === 'S' || target.type.endsWith('JRES')
      ? 'Passed'
      : 'Agreed to';
  }
  if (/agreed to|invoked|tabled/.test(t)) return 'Agreed to';
  return null;
}

/**
 * senate.gov's result wording read from the Record's outcome sentence ("The
 * nomination was confirmed."), for a roll call Congress.gov hasn't listed
 * yet. Null when the sentence is missing or unclear.
 */
export function resultFromRecord(sentence: string | null): string | null {
  if (!sentence) return null;
  const t = sentence.toLowerCase();
  if (POINT_OF_ORDER.test(t) || /well[ -]taken|sustained/.test(t)) return null;
  if (/\bnot\b|rejected|fails?\b/.test(t)) return 'Rejected';
  if (/confirmed/.test(t)) return 'Confirmed';
  if (/\bbill\b.*\bpassed\b|\bjoint resolution\b.*\bpassed\b/.test(t)) return 'Passed';
  if (/agreed to|adopted|invoked|tabled/.test(t)) return 'Agreed to';
  return null;
}

/** A nomination description without its "vice …" clause or end period. */
export function nomineeDescription(description: string): string {
  return description
    .replace(/\s+/g, ' ')
    .replace(/,\s+vice\b.*$/i, '')
    .replace(/\.\s*$/, '')
    .trim();
}

/**
 * A vote title in senate.gov's "<head>; <tail>" shape, which the readers in
 * roll-call-corpus.ts split: the tail is the measure's title or the
 * amendment's purpose, and an amendment vote's head is its sponsor label.
 */
export function voteTitle(
  question: string,
  measure:
    | { kind: 'nomination'; description: string }
    | { kind: 'bill'; label: string; title?: string }
    | { kind: 'amendment'; number: string; sponsor?: string; purpose?: string }
): string {
  const motion = question.replace(/^On (?:the )?/, '').replace(/\s*S\.Amdt\. \d+$/, '');
  if (measure.kind === 'nomination') {
    if (question === 'On the Nomination') return `Confirmation: ${measure.description}`;
    if (question === 'On the Cloture Motion')
      return `Motion to Invoke Cloture: ${measure.description}`;
    return `${motion}: ${measure.description}`;
  }
  if (measure.kind === 'amendment') {
    const label = `${measure.sponsor ? `${measure.sponsor} ` : ''}Amdt. No. ${measure.number}`;
    const head = motion === 'Amendment' ? label : `${motion} on ${label}`;
    return measure.purpose ? `${head}; ${measure.purpose}` : head;
  }
  const head = PASSAGE_QUESTIONS.has(question) ? measure.label : `${motion}: ${measure.label}`;
  return measure.title ? `${head}; ${measure.title}` : head;
}

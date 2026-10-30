/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The checks every Senate roll call read from the Congressional Record must
 * pass before it is compared or stored (proven on all 915 roll calls of the
 * 119th Congress against senate.gov, 2026-10-29):
 *
 * - no heading other than YEAS, NAYS, PRESENT, NOT VOTING;
 * - each heading's printed number equals the names listed under it;
 * - the lead-in tally ("resulted--yeas 53, nays 47") is printed and agrees;
 * - every printed name matches exactly one senator seated that day, once;
 * - every seated senator is listed.
 *
 * Two printed oddities are notes, not failures: a heading printed without
 * its number, and a senator missing on their first or last day of service
 * (senate.gov omits them too). A misprinted chair's read-out is a note as
 * well: headings, lead-in and names agreed every time it happened.
 */

import type { PositionCode } from '@/features/representatives/services/roll-call-corpus';
import type { RecordRollCall } from './senate-roll-calls';
import { isFirstOrLastDay, matchPrintedName, seatedOn, type SenateTerm } from './senate-roster';

export const POSITION_WORD: Record<PositionCode, string> = {
  Y: 'Yea',
  N: 'Nay',
  P: 'Present',
  X: 'Not Voting',
};

const CODES: PositionCode[] = ['Y', 'N', 'P', 'X'];

export interface RollCallCheck {
  /** Bioguide ID → position. Complete only when `problems` is empty. */
  positions: Map<string, PositionCode>;
  /** Bioguide ID → party ("R", "D", "I") on the vote date. */
  parties: Map<string, string>;
  /** Any of these fails the roll call. */
  problems: string[];
  /** Printed oddities that touch no position. */
  notes: string[];
}

/** Check one roll call printed on `date` (YYYY-MM-DD). */
export function checkRecordRollCall(
  roll: RecordRollCall,
  terms: SenateTerm[],
  date: string
): RollCallCheck {
  const problems: string[] = [];
  const notes: string[] = [];
  const n = roll.rollCall;

  if (roll.unknownHeadings.length) {
    problems.push(`unknown heading ${roll.unknownHeadings.join(', ')}`);
  }
  for (const code of CODES) {
    const printed = roll.printedCounts[code];
    const listed = roll.names[code].length;
    if (roll.uncountedHeadings.includes(code)) {
      notes.push(
        `Roll ${n}: the ${POSITION_WORD[code]} heading has no number; ${listed} name${listed === 1 ? '' : 's'} listed`
      );
    } else if ((printed ?? 0) !== listed) {
      problems.push(`${POSITION_WORD[code]}: heading says ${printed ?? 0}, ${listed} names listed`);
    }
  }
  const lists = `${roll.names.Y.length}-${roll.names.N.length}`;
  if (!roll.tally) problems.push('no tally sentence found');
  else if (`${roll.tally.yeas}-${roll.tally.nays}` !== lists) {
    problems.push(`tally sentence ${roll.tally.yeas}-${roll.tally.nays}, lists ${lists}`);
  }
  if (roll.chairTally && `${roll.chairTally.yeas}-${roll.chairTally.nays}` !== lists) {
    notes.push(
      `Roll ${n}: the chair's read-out says ${roll.chairTally.yeas}-${roll.chairTally.nays}; headings, lead-in and names say ${lists}`
    );
  }

  const seated = seatedOn(terms, date);
  const positions = new Map<string, PositionCode>();
  const parties = new Map<string, string>();
  for (const code of CODES) {
    for (const name of roll.names[code]) {
      const match = matchPrintedName(name, seated);
      if ('error' in match) problems.push(match.error);
      else if (positions.has(match.bioguide)) problems.push(`${name} listed twice`);
      else {
        positions.set(match.bioguide, code);
        parties.set(match.bioguide, seated.find(s => s.bioguide === match.bioguide)?.party ?? '');
      }
    }
  }
  for (const s of seated.filter(t => !positions.has(t.bioguide))) {
    if (isFirstOrLastDay(terms, s.bioguide, date)) {
      notes.push(
        `Roll ${n}: ${s.bioguide} not listed on their first or last day of service (${date})`
      );
    } else {
      problems.push(`seated but not listed: ${s.bioguide}`);
    }
  }
  return { positions, parties, problems, notes };
}

/** Whether an outcome means the question carried. Null when it can't be told. */
export function carried(text: string | null): boolean | null {
  if (!text) return null;
  const t = text.toLowerCase();
  if (/veto sustained/.test(t)) return false;
  if (/\bnot\b|rejected|fail/.test(t)) return false;
  if (
    /agreed|confirmed|passed|adopted|sustained|invoked|ratified|well[ -]taken|tabled|overridden/.test(
      t
    )
  )
    return true;
  return null;
}

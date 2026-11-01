/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Per-legislator roll-call corpus for state legislatures.
 *
 * OpenStates v3 has no per-person votes endpoint: its OpenAPI spec lists 12
 * paths and roll calls are reachable only inside a bill (`/bills/{id}?
 * include=votes`). Reading one member's record through that door means paging
 * every bill of the session — ~2,500 for California — against a 1,000/day cap.
 * So the record comes from OpenStates' per-session bulk CSV instead (public
 * domain; `votes.csv` + `vote_people.csv`), rebuilt monthly into one artifact
 * per state and read here at request time.
 *
 * Why one artifact per state rather than one corpus: California alone is
 * ~600,000 member-votes. A profile needs one state, and the artifacts are
 * refreshed monthly, so they live outside the repo (see load-votes.ts) with
 * only a small manifest committed.
 *
 * Encoding: a roll-call table plus, per member, a flat list of
 * `[rollCallIdx, optionIdx]` pairs. Everything a profile shows about a roll
 * call — date, result, bill, motion, tallies, and the yes/no split of each
 * party computed from the roster at build time — is on the roll call row, so
 * party alignment needs no second lookup.
 *
 * This module holds the shape and the decoder only, with no imports, so the
 * request-time reader does not drag the build-time CSV parser into consumers.
 */

/** The vote options the CSV uses, plus 'other' for anything it leaves unnamed. */
export type VoteOption = 'yes' | 'no' | 'abstain' | 'not voting' | 'absent' | 'excused' | 'other';

export const VOTE_OPTIONS: readonly VoteOption[] = [
  'yes',
  'no',
  'abstain',
  'not voting',
  'absent',
  'excused',
  'other',
];

export type RollCallChamber = 'upper' | 'lower' | 'legislature';
export const ROLL_CALL_CHAMBERS: readonly RollCallChamber[] = ['upper', 'lower', 'legislature'];

/**
 * One encoded roll call. Slots, in order:
 *   0  uuid           — `ocd-vote/` prefix stripped; the decoder restores it
 *   1  date           — YYYY-MM-DD
 *   2  result         — 1 pass, 0 fail
 *   3  chamberIdx     — index into `chambers`
 *   4  billUuid       — `ocd-bill/` prefix stripped; '' when the vote has no bill
 *   5  billIdentifier — 'H 909', 'AB 1' ...; '' when no bill
 *   6  billTitle      — truncated; '' when no bill
 *   7  motion         — truncated motion text
 *   8  yes            — count of yes votes
 *   9  no             — count of no votes
 *   10 other          — every other option
 *   11 floor          — 1 when the voter count is at least FLOOR_SHARE of the
 *                       chamber's roster (a floor vote), 0 for committee-sized
 *   12 partyTally     — flat [partyIdx, yes, no, ...] over voters resolved to
 *                       the roster, from their roster party
 *   13 sessionIdx     — index into `sessions`
 */
export type EncodedRollCall = [
  string,
  string,
  0 | 1,
  number,
  string,
  string,
  string,
  string,
  number,
  number,
  number,
  0 | 1,
  number[],
  number,
];

/**
 * A roll call counts as a floor vote when at least this share of the chamber's
 * roster voted. California files committee roll calls under the chamber, so the
 * organization alone cannot tell the two apart; the voter count can.
 */
export const FLOOR_SHARE = 0.6;

export interface VotesCorpusFile {
  version: 1;
  /** USPS code. */
  jurisdiction: string;
  generatedAt: string;
  /** The sessions folded into this artifact, in `sessionIdx` order. */
  sessions: Array<{
    identifier: string;
    name: string;
    /** `Generated At` from the archive's README — when upstream last built it. */
    upstreamGeneratedAt: string;
  }>;
  chambers: readonly RollCallChamber[];
  /** Distinct roster party names, verbatim ('Democratic', 'Nonpartisan', ...). */
  parties: string[];
  options: readonly VoteOption[];
  /** Newest first. */
  rollCalls: EncodedRollCall[];
  /** person uuid (`ocd-person/` stripped) → flat [rollCallIdx, optionIdx, ...], newest first. */
  members: Record<string, number[]>;
  meta: {
    rollCalls: number;
    memberVotes: number;
    members: number;
    /**
     * vote_people rows carrying only a surname that OpenStates could not
     * resolve to a person id. Left unattributed: guessing between the three
     * Whites in Vermont's House would credit votes to the wrong member.
     */
    unresolvedVotes: number;
    source: string;
    methodology: string;
  };
}

/** A decoded roll call. */
export interface CorpusRollCall {
  /** Full `ocd-vote/<uuid>` — the id the v3 API uses inside a bill. */
  id: string;
  date: string;
  result: 'pass' | 'fail';
  chamber: RollCallChamber;
  /** Full `ocd-bill/<uuid>`, or null. */
  billId: string | null;
  billIdentifier: string | null;
  billTitle: string | null;
  motion: string;
  yes: number;
  no: number;
  other: number;
  floor: boolean;
  /** Roster party → yes/no counts among that party's members on this roll call. */
  partyTally: Map<string, { yes: number; no: number }>;
  session: { identifier: string; name: string };
}

export interface CorpusMemberVote {
  rollCall: CorpusRollCall;
  option: VoteOption;
}

/** Decode one roll call against its file's dictionaries. */
export function decodeRollCall(file: VotesCorpusFile, row: EncodedRollCall): CorpusRollCall {
  const partyTally = new Map<string, { yes: number; no: number }>();
  const tally = row[12];
  for (let i = 0; i + 2 < tally.length; i += 3) {
    const party = file.parties[tally[i] ?? -1];
    if (party !== undefined)
      partyTally.set(party, { yes: tally[i + 1] ?? 0, no: tally[i + 2] ?? 0 });
  }
  const session = file.sessions[row[13]];
  return {
    id: `ocd-vote/${row[0]}`,
    date: row[1],
    result: row[2] === 1 ? 'pass' : 'fail',
    chamber: file.chambers[row[3]] ?? 'lower',
    billId: row[4] ? `ocd-bill/${row[4]}` : null,
    billIdentifier: row[5] || null,
    billTitle: row[6] || null,
    motion: row[7],
    yes: row[8],
    no: row[9],
    other: row[10],
    floor: row[11] === 1,
    partyTally,
    session: session
      ? { identifier: session.identifier, name: session.name }
      : { identifier: '', name: '' },
  };
}

/**
 * One member's votes, newest first. Roll calls are decoded once per call and
 * shared across the member's entries.
 */
export function decodeMemberVotes(file: VotesCorpusFile, personId: string): CorpusMemberVote[] {
  const uuid = personId.replace(/^ocd-person\//, '');
  const flat = file.members[uuid];
  if (!flat) return [];

  const decoded = new Map<number, CorpusRollCall>();
  const votes: CorpusMemberVote[] = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const rollCallIdx = flat[i] ?? -1;
    const optionIdx = flat[i + 1] ?? -1;
    const row = file.rollCalls[rollCallIdx];
    const option = file.options[optionIdx];
    if (!row || !option) continue;
    let rollCall = decoded.get(rollCallIdx);
    if (!rollCall) {
      rollCall = decodeRollCall(file, row);
      decoded.set(rollCallIdx, rollCall);
    }
    votes.push({ rollCall, option });
  }
  return votes;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Deterministic curation for digest issues.
 *
 * "Curation" here is arithmetic, never judgment: the closest margin,
 * the most lopsided tally, the furthest-advanced bill, a delegation
 * split described by counting. Selection and ordering carry the
 * editorial care; no text expresses an opinion.
 */

import { voteQuestionContext } from './context';
import type { DigestBill, DigestVote } from './types';

export interface IssueHighlights {
  /** Smallest yea/nay margin with both sides represented. */
  closestVote?: DigestVote;
  /** Largest supermajority (highest winning share, min 20 votes cast). */
  mostBipartisanVote?: DigestVote;
  /** Bill with the highest stage rank this week. */
  furthestBill?: DigestBill;
}

export function isProcedural(vote: DigestVote): boolean {
  return voteQuestionContext(vote.question)?.kind === 'procedural';
}

/** Substantive votes first (each newest-first); procedural votes after. */
export function orderVotes(votes: DigestVote[]): {
  substantive: DigestVote[];
  procedural: DigestVote[];
} {
  const substantive: DigestVote[] = [];
  const procedural: DigestVote[] = [];
  for (const vote of votes) {
    (isProcedural(vote) ? procedural : substantive).push(vote);
  }
  return { substantive, procedural };
}

export function issueHighlights(votes: DigestVote[], bills: DigestBill[]): IssueHighlights {
  const highlights: IssueHighlights = {};

  const contested = votes.filter(v => v.yeas > 0 && v.nays > 0);
  if (contested.length > 0) {
    highlights.closestVote = contested.reduce((closest, v) =>
      Math.abs(v.yeas - v.nays) < Math.abs(closest.yeas - closest.nays) ? v : closest
    );
  }

  const decisive = votes.filter(v => v.yeas + v.nays >= 20);
  if (decisive.length > 0) {
    const winningShare = (v: DigestVote) => Math.max(v.yeas, v.nays) / (v.yeas + v.nays);
    const most = decisive.reduce((best, v) => (winningShare(v) > winningShare(best) ? v : best));
    // Only a highlight when it is actually lopsided — and distinct from the closest.
    if (winningShare(most) >= 0.75 && most.voteId !== highlights.closestVote?.voteId) {
      highlights.mostBipartisanVote = most;
    }
  }

  const staged = bills
    .map(bill => ({ bill, rank: billStage(bill.latestActionText).rank }))
    .filter(entry => entry.rank > 0)
    .sort((a, b) => b.rank - a.rank);
  if (staged.length > 0) {
    highlights.furthestBill = staged[0]?.bill;
  }

  return highlights;
}

export interface MiSplit {
  yeas: number;
  nays: number;
  other: number;
  /** "unanimous" | "split by party" | "crossed party lines" | null (no read) */
  note: string | null;
}

/**
 * Summarize the delegation's positions on one vote by counting.
 * "Split by party" requires every voting D on one side and every voting
 * R on the other; a single crossover flips the note.
 */
export function miSplit(vote: DigestVote): MiSplit {
  let yeas = 0;
  let nays = 0;
  let other = 0;
  const sides = new Map<string, Set<'Yea' | 'Nay'>>();

  for (const member of vote.miPositions) {
    if (member.position === 'Yea') yeas++;
    else if (member.position === 'Nay') nays++;
    else {
      other++;
      continue;
    }
    const party = member.party.charAt(0).toUpperCase();
    if (!sides.has(party)) sides.set(party, new Set());
    sides.get(party)?.add(member.position as 'Yea' | 'Nay');
  }

  let note: string | null = null;
  const voting = yeas + nays;
  if (voting >= 2) {
    if (yeas === 0 || nays === 0) {
      note = 'unanimous';
    } else {
      const dSides = sides.get('D') ?? new Set();
      const rSides = sides.get('R') ?? new Set();
      const cleanSplit =
        dSides.size === 1 && rSides.size === 1 && [...dSides][0] !== [...rSides][0];
      note = cleanSplit ? 'split by party' : 'crossed party lines';
    }
  }

  return { yeas, nays, other, note };
}

export interface BillStage {
  /** Higher = further through the process. 0 = unrecognized. */
  rank: number;
  /** Short label for display (<= 3 words, uppercase-safe). */
  label: string | null;
}

const BILL_STAGES: Array<{ pattern: RegExp; rank: number; label: string }> = [
  { pattern: /became public law|signed by president/i, rank: 7, label: 'Became law' },
  { pattern: /presented to president/i, rank: 6, label: 'To President' },
  { pattern: /passed\/agreed to in (house|senate)/i, rank: 5, label: 'Passed chamber' },
  { pattern: /received in the (house|senate)/i, rank: 5, label: 'Passed chamber' },
  {
    pattern: /ordered to be reported|reported (to|by)|supplemental report filed/i,
    rank: 4,
    label: 'Out of committee',
  },
  {
    pattern: /placed on (the union |the house |senate legislative )?calendar/i,
    rank: 3,
    label: 'On calendar',
  },
  { pattern: /rules committee resolution/i, rank: 3, label: 'Rule set' },
  { pattern: /hearings held/i, rank: 2, label: 'Hearings' },
  { pattern: /referred to/i, rank: 1, label: 'In committee' },
];

export function billStage(actionText: string | undefined): BillStage {
  if (!actionText) return { rank: 0, label: null };
  for (const stage of BILL_STAGES) {
    if (stage.pattern.test(actionText)) return { rank: stage.rank, label: stage.label };
  }
  return { rank: 0, label: null };
}

/** Bills ordered by stage (furthest first), stage rank attached. */
export function orderBills(bills: DigestBill[]): Array<DigestBill & { stage: BillStage }> {
  return bills
    .map(bill => ({ ...bill, stage: billStage(bill.latestActionText) }))
    .sort((a, b) => b.stage.rank - a.stage.rank);
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { formatBillNumber, voteMeasureLabel } from '@/lib/bill-label';
import type { Vote } from '../VoteRow';

/** What a roll call decided, read from its official question text. */
export type VoteKind =
  'Passage' | 'Amendment' | 'Cloture' | 'Confirmation' | 'Motion to table' | 'Motion' | 'Other';

/** One measure (bill, resolution or nomination) and every roll call on it. */
export interface VoteGroup {
  key: string;
  /** "S. 4668", or undefined for nominations and bill-less votes. */
  billLabel?: string;
  /** Official short title when there is one, else the official title. Never rewritten. */
  title: string;
  /** The vote that settled the measure — passage or confirmation, else the latest. */
  deciding: Vote;
  /** Newest first, as delivered. Only votes inside the fetched window. */
  votes: Vote[];
}

export function voteKind(vote: Pick<Vote, 'question' | 'amendment'>): VoteKind {
  const q = vote.question ?? '';
  if (/cloture/i.test(q)) return 'Cloture';
  if (/motion to table/i.test(q)) return 'Motion to table';
  if (vote.amendment || /amendment/i.test(q)) return 'Amendment';
  if (/nomination/i.test(q)) return 'Confirmation';
  if (/pass|on the (joint |concurrent )?resolution|on the bill/i.test(q)) return 'Passage';
  if (/motion/i.test(q)) return 'Motion';
  return 'Other';
}

/** Passage and confirmation settle a measure; everything else is procedure along the way. */
function isDeciding(vote: Vote): boolean {
  const kind = voteKind(vote);
  return kind === 'Passage' || kind === 'Confirmation';
}

function billNumberOf(vote: Vote): string | undefined {
  const n = vote.bill?.number;
  return n && n !== 'N/A' ? n : undefined;
}

function groupKey(vote: Vote): string {
  const number = billNumberOf(vote);
  if (number) return `bill:${(vote.bill.type ?? '').toUpperCase()}:${number}`;
  if (vote.nomination?.number) return `nom:${vote.nomination.number}`;
  return `vote:${vote.voteId}`;
}

function groupTitle(vote: Vote): string {
  if (vote.nomination?.description) return vote.nomination.description;
  const title = vote.bill?.displayTitle || vote.bill?.title;
  if (billNumberOf(vote) && title && title !== 'Vote without associated bill') return title;
  return voteMeasureLabel(vote);
}

/**
 * Collapse a member's recent roll calls into measures, newest measure first.
 * Eight votes on one bill (cloture, amendments, passage) become one group so
 * the list shows what was decided rather than a wall of procedure.
 */
export function groupVotesByMeasure(votes: Vote[], limit: number): VoteGroup[] {
  const byKey = new Map<string, Vote[]>();
  for (const vote of votes) {
    const key = groupKey(vote);
    const list = byKey.get(key);
    if (list) list.push(vote);
    else byKey.set(key, [vote]);
  }

  const groups: VoteGroup[] = [];
  for (const [key, list] of byKey) {
    const first = list[0];
    if (!first) continue;
    const number = billNumberOf(first);
    groups.push({
      key,
      billLabel: number ? formatBillNumber(first.bill.type, number) : undefined,
      title: groupTitle(first),
      deciding: list.find(isDeciding) ?? first,
      votes: list,
    });
    if (groups.length >= limit) break;
  }
  return groups;
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { MemberVote, UnifiedVoteDetail } from '@/lib/services/vote.service';

export interface PartyTally {
  party: MemberVote['party'];
  yea: number;
  nay: number;
  /** Present or not voting. */
  other: number;
}

/** A roll call's totals without its member list — small enough to fetch per row. */
export interface VoteTallySummary {
  voteId: string;
  chamber: UnifiedVoteDetail['chamber'];
  yeas: number;
  nays: number;
  present: number;
  notVoting: number;
  /** Seats in the chamber roll (members listed), the tally bar's scale. */
  seats: number;
  /** Official threshold when the source states one ("3/5", "1/2", "2/3"). */
  requiredMajority?: string;
  parties: PartyTally[];
}

const PARTY_ORDER: MemberVote['party'][] = ['D', 'R', 'I'];

export function summarizeVoteTally(detail: UnifiedVoteDetail): VoteTallySummary {
  const byParty = new Map<MemberVote['party'], PartyTally>();
  for (const member of detail.members) {
    const tally = byParty.get(member.party) ?? { party: member.party, yea: 0, nay: 0, other: 0 };
    if (member.position === 'Yea') tally.yea += 1;
    else if (member.position === 'Nay') tally.nay += 1;
    else tally.other += 1;
    byParty.set(member.party, tally);
  }

  return {
    voteId: detail.voteId,
    chamber: detail.chamber,
    yeas: detail.yeas,
    nays: detail.nays,
    present: detail.present,
    notVoting: detail.absent,
    seats: detail.members.length,
    requiredMajority: detail.requiredMajority,
    parties: PARTY_ORDER.flatMap(party => {
      const tally = byParty.get(party);
      return tally ? [tally] : [];
    }),
  };
}

/**
 * Votes needed to prevail, when the source states the threshold. 3/5 (cloture)
 * counts seats; 2/3 and simple majority count those voting yea or nay.
 */
export function votesNeeded(tally: VoteTallySummary): number | null {
  const voting = tally.yeas + tally.nays;
  switch (tally.requiredMajority) {
    case '3/5':
      return Math.ceil((tally.seats * 3) / 5);
    case '2/3':
      return Math.ceil((voting * 2) / 3);
    case '1/2':
      return Math.floor(voting / 2) + 1;
    default:
      return null;
  }
}

/**
 * Did the member vote with most of their own party on this roll call? Null
 * for independents (no party majority of their own), ties and non-votes.
 */
export function partyAlignment(
  tally: VoteTallySummary,
  party: string | undefined,
  position: string
): 'with' | 'split' | null {
  const code = party?.trim().charAt(0).toUpperCase();
  if (code !== 'D' && code !== 'R') return null;
  if (position !== 'Yea' && position !== 'Nay') return null;
  const own = tally.parties.find(p => p.party === code);
  if (!own || own.yea === own.nay) return null;
  const majority = own.yea > own.nay ? 'Yea' : 'Nay';
  return majority === position ? 'with' : 'split';
}

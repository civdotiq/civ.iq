/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { UnifiedVoteDetail } from '@/lib/services/vote.service';

type VoteOutcomeInput = Pick<UnifiedVoteDetail, 'question' | 'result' | 'chamber'>;

/**
 * Plain-language meaning of a roll call's result, keyed on the official
 * question and result text. Senate nominations are asked "On the Nomination"
 * and resolve "Confirmed"; House and Senate bills resolve "Passed"/"Failed".
 */
export function explainVoteOutcome(vote: VoteOutcomeInput): string {
  const q = vote.question.toLowerCase();
  const r = vote.result.toLowerCase();
  const chamber = vote.chamber || 'Senate';
  const otherChamber = chamber === 'House' ? 'Senate' : 'House of Representatives';

  if (q.includes('cloture')) {
    if (r.includes('agreed') || r.includes('invoked')) {
      return `The ${chamber} voted to end debate and move forward with this bill. This breaks any filibuster and allows the ${chamber} to proceed to a final vote.`;
    }
    return `The ${chamber} voted NOT to end debate. The filibuster continues, and the bill cannot move forward to a final vote at this time. 60 votes were needed.`;
  }
  if (q.includes('passage') || q.includes('pass the bill')) {
    if (r.includes('passed')) {
      return `The bill PASSED the ${chamber} and will now move to the ${otherChamber} (or to the President if already passed by the ${otherChamber}).`;
    }
    return 'The bill FAILED to pass. It will not become law unless reconsidered.';
  }
  if (q.includes('confirmation') || q.includes('nomination')) {
    if (r.includes('confirmed')) {
      return `The ${chamber} CONFIRMED this nomination. The nominee will assume their position.`;
    }
    return `The ${chamber} REJECTED this nomination. The nominee will not assume the position.`;
  }
  if (q.includes('amendment')) {
    if (r.includes('agreed')) {
      return 'This amendment was ADOPTED and will be included in the bill.';
    }
    return 'This amendment was REJECTED and will not be included in the bill.';
  }
  if (q.includes('motion to') || q.includes('agreeing to the resolution')) {
    if (r.includes('agreed') || r.includes('passed')) {
      return `The ${chamber} APPROVED this measure.`;
    }
    return `The ${chamber} REJECTED this procedural motion.`;
  }
  if (r.includes('passed') || r.includes('agreed')) {
    return `This measure PASSED the ${chamber}.`;
  }
  return `This measure did NOT pass the ${chamber}.`;
}

/**
 * The "Required to pass" threshold. A simple majority counts those voting,
 * not seats, so a 50–35 vote passes.
 */
export function requiredMajorityLabel(
  requiredMajority: string,
  chamber: UnifiedVoteDetail['chamber']
): string {
  switch (requiredMajority) {
    case '1/2':
      return chamber === 'House'
        ? 'a majority of members voting'
        : 'a majority of senators voting (the Vice President breaks a tie)';
    case '3/5':
      return '3/5 majority (60 votes)';
    case '2/3':
      return '2/3 majority (67 votes)';
    default:
      return `${requiredMajority} majority`;
  }
}

type VoteDescriptionInput = Pick<
  UnifiedVoteDetail,
  'chamber' | 'rollNumber' | 'question' | 'result' | 'yeas' | 'nays'
>;

/** Meta description: "On roll call #1, the Senate voted 50 yea to 35 nay on the Nomination. Result: Confirmed. …" */
export function voteMetaDescription(vote: VoteDescriptionInput): string {
  const question = vote.question.trim().replace(/^On\b/, 'on');
  const onQuestion = question ? ` ${question}` : '';
  const result = vote.result.trim() ? ` Result: ${vote.result.trim()}.` : '';
  return `On roll call #${vote.rollNumber}, the ${vote.chamber} voted ${vote.yeas} yea to ${vote.nays} nay${onQuestion}.${result} See how each member voted and the party breakdown.`;
}

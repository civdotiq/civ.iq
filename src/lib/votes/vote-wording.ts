/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { UnifiedVoteDetail } from '@/lib/services/vote.service';
import { isNominationNumber } from '@/lib/senate-vote-fields';

type VoteOutcomeInput = Pick<
  UnifiedVoteDetail,
  'question' | 'result' | 'chamber' | 'requiredMajority' | 'bill'
>;

/**
 * What a cloture vote moves forward, from the measure's number ("S.Res. 532",
 * "H.J.Res. 4", "PN373") or type. "measure" when the source names none.
 */
function clotureMeasureNoun(bill: VoteOutcomeInput['bill']): string {
  if (!bill) return 'measure';
  if (bill.type.toUpperCase() === 'PN' || isNominationNumber(bill.number)) return 'nomination';
  const prefix = (bill.number.match(/^[A-Za-z.\s]+/)?.[0] ?? bill.type)
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase();
  if (prefix.endsWith('JRES')) return 'joint resolution';
  if (prefix.endsWith('CONRES')) return 'concurrent resolution';
  if (prefix.endsWith('RES')) return 'resolution';
  if (prefix === 'HR' || prefix === 'S') return 'bill';
  return 'measure';
}

/** The threshold a failed cloture vote missed, per the official record. */
function clotureThresholdSentence(requiredMajority: string | undefined): string {
  switch (requiredMajority) {
    case '3/5':
      return ' 60 votes were needed.';
    case '1/2':
      return ' A majority of senators voting was needed.';
    default:
      return '';
  }
}

/**
 * Plain-language meaning of a roll call's result, keyed on the official
 * question and result text. Senate nominations are asked "On the Nomination"
 * and resolve "Confirmed"; House and Senate bills resolve "Passed"/"Failed".
 * Rulings from the chair and points of order resolve "Sustained", "Not
 * Sustained" or "Well Taken".
 */
export function explainVoteOutcome(vote: VoteOutcomeInput): string {
  const q = vote.question.toLowerCase();
  const r = vote.result.toLowerCase();
  const chamber = vote.chamber || 'Senate';
  const otherChamber = chamber === 'House' ? 'Senate' : 'House of Representatives';

  if (q.includes('decision of the chair') || q.includes('point of order')) {
    const upheld = !r.startsWith('not') && (r.includes('sustained') || r.includes('well taken'));
    if (q.includes('decision of the chair')) {
      return upheld
        ? `The ${chamber} UPHELD the chair's ruling.`
        : `The ${chamber} OVERTURNED the chair's ruling.`;
    }
    return upheld
      ? `The ${chamber} UPHELD this point of order.`
      : `The ${chamber} REJECTED this point of order.`;
  }
  if (q.includes('cloture')) {
    const measure = clotureMeasureNoun(vote.bill);
    if (r.includes('agreed') || r.includes('invoked')) {
      return `The ${chamber} voted to end debate and move forward with this ${measure}. This breaks any filibuster and allows the ${chamber} to proceed to a final vote.`;
    }
    return `The ${chamber} voted NOT to end debate. The filibuster continues, and the ${measure} cannot move forward to a final vote at this time.${clotureThresholdSentence(vote.requiredMajority)}`;
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
 * The "Required to pass" threshold. A simple majority and two-thirds count
 * those voting, not seats, so a 50–35 vote passes. Only cloture on
 * legislation (3/5) counts sworn senators: 60 with no vacancies.
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
      return chamber === 'House' ? 'two-thirds of members voting' : 'two-thirds of senators voting';
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

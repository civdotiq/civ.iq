/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { BillVote } from '@/types/bill';
import { findFinalPassageVote, formatDate } from './helpers';

const vote = (
  rollNumber: number,
  chamber: BillVote['chamber'],
  date: string,
  question: string,
  result: BillVote['result']
): BillVote => ({
  voteId: `v-${rollNumber}`,
  chamber,
  date,
  question,
  result,
  rollNumber,
  votes: { yea: 1, nay: 1, present: 0, notVoting: 0 },
});

describe('findFinalPassageVote', () => {
  it("picks H.R. 1's House concurrence, not a later-listed Senate motion", () => {
    // Clerk labels for H.R. 1 (119th). The Senate's same-day motions must not
    // become the headline "final vote".
    const votes = [
      vote(190, 'House', '2025-07-03', 'On Motion to Concur in the Senate Amendment', 'Passed'),
      vote(372, 'Senate', '2025-07-01', 'On Passage of the Bill', 'Passed'),
      vote(359, 'Senate', '2025-07-01', 'On the Motion', 'Failed'),
      vote(329, 'Senate', '2025-06-28', 'On the Motion to Proceed', 'Agreed to'),
      vote(145, 'House', '2025-05-22', 'On Passage', 'Passed'),
      vote(144, 'House', '2025-05-22', 'On Motion to Recommit', 'Failed'),
    ];
    expect(findFinalPassageVote(votes)?.rollNumber).toBe(190);
  });

  it('treats concurrent-resolution questions as decisive', () => {
    const votes = [
      vote(282, 'House', '2026-07-23', 'On Agreeing to the Resolution', 'Passed'),
      vote(244, 'Senate', '2026-09-24', 'On the Concurrent Resolution', 'Failed'),
    ];
    expect(findFinalPassageVote(votes)?.rollNumber).toBe(244);
  });

  it('never treats an amendment vote as final passage', () => {
    const votes = [
      vote(10, 'House', '2026-01-10', 'On Passage', 'Passed'),
      vote(11, 'Senate', '2026-02-01', 'On Agreeing to the Amendment', 'Agreed to'),
    ];
    expect(findFinalPassageVote(votes)?.rollNumber).toBe(10);
  });
});

describe('formatDate', () => {
  it('shows the source day for date-only strings in any timezone', () => {
    expect(formatDate('2026-07-22')).toBe('Jul 22, 2026');
  });
});

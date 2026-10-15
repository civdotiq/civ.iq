/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

import type { BillVote } from '@/types/bill';

/**
 * Clerk questions that decide a measure itself, not an amendment or motion:
 * "On Passage of the Bill", "On Motion to Suspend the Rules and Pass",
 * "On Motion to Concur in the Senate Amendment", "On Agreeing to the
 * Resolution", "On the Concurrent Resolution", "On Agreeing to the Conference Report".
 */
const DECISIVE_QUESTION =
  /passage|suspend the rules and (pass|agree)|\bconcur|agreeing to the (resolution|concurrent resolution|joint resolution|conference report)|^on the (concurrent |joint )?resolution\b|conference report/i;

/**
 * Find the latest decisive floor vote for the bill. Falls back to the latest
 * vote with counts. Picks by date, so the order of `votes` doesn't matter.
 */
export function findFinalPassageVote(votes: BillVote[]): BillVote | null {
  if (!votes || votes.length === 0) return null;
  const decisive = votes.filter(
    v =>
      v.votes &&
      (v.result === 'Passed' || v.result === 'Failed' || v.result === 'Agreed to') &&
      DECISIVE_QUESTION.test(v.question ?? '')
  );
  const pool = decisive.length > 0 ? decisive : votes.filter(v => v.votes);
  if (pool.length === 0) return null;
  return pool.reduce((latest, v) =>
    new Date(v.date).getTime() > new Date(latest.date).getTime() ? v : latest
  );
}

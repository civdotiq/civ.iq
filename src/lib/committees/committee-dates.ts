/**
 * Copyright (c) 2019-2026 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * The two dates on a committee page (real-dates plan, PR 4). Same rules as
 * member profiles (profile-dates.ts) and districts (district-dates.ts):
 *
 * - Latest record: when the committee's facts last changed upstream, from
 *   the git history of congress-legislators' committee list and membership
 *   files (src/data/committee-roster-history.json). Those two files are the
 *   source of everything the server renders on the page; the hearings and
 *   regulations sections load in the browser and carry no date here.
 * - Checked: when CIV.IQ downloaded those two files, as saved with them
 *   (the older of the two). Null until both times are saved.
 *
 * The sitemap dates each committee by committeeChangedOn, so it, the page
 * line and JSON-LD dateModified agree.
 */

import history from '@/data/committee-roster-history.json';
import { committeeFilesCheckedAt } from '@/features/representatives/services/congress.service';
import {
  combineProfileDates,
  type ProfileDates,
} from '@/features/representatives/services/profile-dates';

const changedOn = (history as { committees: Record<string, { changedOn: string }> }).committees;

/** When a committee's or subcommittee's facts last changed upstream (YYYY-MM-DD), or null. */
export function committeeChangedOn(committeeId: string | null | undefined): string | null {
  if (!committeeId) return null;
  return changedOn[committeeId.toUpperCase()]?.changedOn ?? null;
}

/** A committee page's dates: one history lookup and two cache reads, no upstream calls. */
export async function getCommitteeDates(committeeId: string): Promise<ProfileDates> {
  return combineProfileDates([
    {
      source: 'roster',
      date: committeeChangedOn(committeeId),
      checkedAt: await committeeFilesCheckedAt(),
    },
  ]);
}

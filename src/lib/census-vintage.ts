/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Census Geocoder vintage for looking up CURRENT officeholders' districts.
 *
 * `Current_Current` follows the newest TIGER release. Since September 2026
 * it serves the 120th-Congress and 2026 state legislative districts, which
 * are the lines on the November 2026 ballot. Sitting members hold the 119th
 * Congress and 2024 state legislative districts until the new Congress is
 * seated, and ten states (AL, CA, FL, LA, MO, NC, OH, TN, TX, UT) redrew their
 * House maps between the two. Taking the newest layer named the wrong
 * current representative there (e.g. 505 Travis St, Shreveport: LA-06, not
 * LA-04).
 *
 * `ACS2025_Current` is a frozen vintage serving exactly the sitting lines
 * (119th Congressional Districts + 2024 State Legislative Districts), so
 * current-officeholder lookups pin it until the 120th Congress convenes.
 * Ballot districts come from the committed CD120 corpus
 * (src/lib/data-sources/cd120-districts), not from this vintage.
 */

/** Noon ET, January 3, 2027: the 120th Congress convenes. */
export const CONGRESS_120_CONVENES_MS = Date.UTC(2027, 0, 3, 17, 0, 0);

export const SITTING_119TH_VINTAGE = 'ACS2025_Current';
export const LATEST_VINTAGE = 'Current_Current';

export function currentOfficeholderVintage(now: Date = new Date()): string {
  return now.getTime() < CONGRESS_120_CONVENES_MS ? SITTING_119TH_VINTAGE : LATEST_VINTAGE;
}

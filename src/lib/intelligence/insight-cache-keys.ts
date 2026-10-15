/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the Apache License, Version 2.0. See LICENSE and NOTICE files.
 */

/**
 * Redis keys for cached insights that other modules read directly. The
 * writer and every reader import the same function, so a version bump
 * can't leave a reader on the old key (the district route did, see #242).
 */

/**
 * Vote-finance insight for one member.
 * v5: v4 entries counted every vote twice (the analyzer fetched sessions 1
 * and 2, and the vote service ignored the session).
 */
export const voteFinanceCacheKey = (bioguideId: string): string =>
  `insight:vote_finance:v5:${bioguideId}`;

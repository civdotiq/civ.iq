/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * FEC election cycles are two-year periods named for the even year they end
 * in. Contributions in an odd year belong to the following even-year cycle.
 *
 * Compute cycles from the clock, never hardcode them: a literal
 * `[2024, 2022, ...]` list kept every finance surface on the 2024 cycle
 * through most of the 2026 cycle.
 */

export function getCurrentElectionCycle(now: Date = new Date()): number {
  const year = now.getFullYear();
  return year % 2 === 0 ? year : year + 1;
}

/**
 * The current cycle followed by `count - 1` prior cycles, newest first.
 * Used as a fallback order: a member with no filings this cycle (a senator
 * between races, a new appointee) still shows their most recent campaign.
 */
export function getRecentElectionCycles(
  count: number,
  now: Date = new Date()
): [number, ...number[]] {
  const current = getCurrentElectionCycle(now);
  const prior = Array.from({ length: Math.max(0, count - 1) }, (_, i) => current - 2 * (i + 1));
  return [current, ...prior];
}

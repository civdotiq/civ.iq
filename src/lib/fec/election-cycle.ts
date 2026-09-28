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

/**
 * Walk `cycles` newest first and return the first one with data. Falls back
 * only when a cycle has no data. A thrown fetch (a 429, a timeout) propagates:
 * an unreachable FEC must read as "unavailable", never as the member's
 * older-cycle totals presented in place of the current ones.
 *
 * Sequential on purpose: nearly every sitting member has current-cycle
 * filings, so this is usually one FEC call against a 60/min key.
 */
export async function findNewestCycleWithData<T>(
  cycles: readonly number[],
  fetchCycle: (cycle: number) => Promise<T | null>
): Promise<{ data: T; cycle: number } | null> {
  for (const cycle of cycles) {
    const data = await fetchCycle(cycle);
    if (data) return { data, cycle };
  }
  return null;
}

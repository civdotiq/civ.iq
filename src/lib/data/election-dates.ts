/**
 * Canonical federal general-election date math.
 *
 * Single source of truth for "the Tuesday after the first Monday in November"
 * (2 U.S.C. §1, 3 U.S.C. §1). All computation is UTC. Every other module that
 * needs an election date must import from here — do not hand-roll this again.
 * Consumers: congressional-constants (Senate/House cycle rollover),
 * record-card ballot framing, ElectionPage countdown, state-executives route,
 * temporal vote analyzer.
 */

/** Federal general election day for a year, as a UTC Date. */
export function getGeneralElectionDay(year: number): Date {
  const nov1Weekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstMonday = 1 + ((8 - nov1Weekday) % 7);
  return new Date(Date.UTC(year, 10, firstMonday + 1));
}

/** Federal general election day as an ISO date string (YYYY-MM-DD). */
export function getGeneralElectionDayISO(year: number): string {
  return getGeneralElectionDay(year).toISOString().slice(0, 10);
}

const UTC_DAY_MS = 24 * 60 * 60 * 1000;

/** True once the year's general election day (UTC) is fully over. */
export function generalElectionHasPassed(year: number, now: Date = new Date()): boolean {
  return now.getTime() >= getGeneralElectionDay(year).getTime() + UTC_DAY_MS;
}

/**
 * The next federal general-election year as of `now`: the next even year,
 * rolling forward once that year's election day has fully passed (from the
 * Wednesday after a November election, the answer is two years out).
 */
export function nextGeneralElectionYear(now: Date = new Date()): number {
  const currentYear = now.getUTCFullYear();
  const candidate = currentYear % 2 === 0 ? currentYear : currentYear + 1;
  if (candidate === currentYear && generalElectionHasPassed(candidate, now)) {
    return candidate + 2;
  }
  return candidate;
}

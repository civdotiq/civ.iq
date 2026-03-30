/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * State Election Cycle Lookup
 *
 * State-level elections follow 3 different schedules:
 * - Standard 46: even years (2024, 2026, 2028)
 * - Odd-Year 4: NJ, VA, MS, LA — odd years (2023, 2025, 2027)
 * - 2-Year Senators: 10 states with state senate races every 2 years
 */

export type ElectionGroup = 'standard' | 'odd-year' | '2-year-senate';

/** States that hold major elections in odd years. */
const ODD_YEAR_STATES = new Set(['NJ', 'VA', 'MS', 'LA']);

/** States where state senate seats are up every 2 years instead of 4. */
const TWO_YEAR_SENATE_STATES = new Set([
  'AR',
  'CT',
  'GA',
  'ID',
  'MA',
  'NH',
  'NY',
  'NC',
  'RI',
  'VT',
]);

/**
 * Get the election schedule group for a state.
 * Note: 2-year-senate states still follow even-year gubernatorial cycles.
 */
export function getElectionGroup(stateCode: string): ElectionGroup {
  const code = stateCode.toUpperCase();
  if (ODD_YEAR_STATES.has(code)) return 'odd-year';
  if (TWO_YEAR_SENATE_STATES.has(code)) return '2-year-senate';
  return 'standard';
}

/**
 * Get the most recent election year for state-level races.
 * @param stateCode 2-letter state code
 * @param currentYear The current year (default: current calendar year)
 */
export function getMostRecentElectionYear(stateCode: string, currentYear?: number): number {
  const year = currentYear ?? new Date().getFullYear();
  const group = getElectionGroup(stateCode);

  if (group === 'odd-year') {
    // Odd-year states: 2025, 2023, 2027...
    return year % 2 === 1 ? year : year - 1;
  }
  // Standard and 2-year-senate: even years
  return year % 2 === 0 ? year : year - 1;
}

/**
 * Get the next upcoming election year for state-level races.
 */
export function getNextElectionYear(stateCode: string, currentYear?: number): number {
  const year = currentYear ?? new Date().getFullYear();
  const group = getElectionGroup(stateCode);

  if (group === 'odd-year') {
    return year % 2 === 1 ? year : year + 1;
  }
  return year % 2 === 0 ? year : year + 1;
}

/**
 * Human-readable label for the election cycle.
 */
export function getElectionCycleLabel(stateCode: string): string {
  const group = getElectionGroup(stateCode);
  switch (group) {
    case 'odd-year':
      return 'Odd-year election state (elections in 2025, 2027, ...)';
    case '2-year-senate':
      return 'State senate seats up every 2 years';
    case 'standard':
      return 'Standard even-year elections (2026, 2028, ...)';
  }
}

/** Whether this state has 2-year state senate terms. */
export function hasTwoYearSenateCycle(stateCode: string): boolean {
  return TWO_YEAR_SENATE_STATES.has(stateCode.toUpperCase());
}

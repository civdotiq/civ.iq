/**
 * Congressional Constants - Hardcoded Reference Data
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 *
 * This file centralizes all congressional metadata that rarely or never changes:
 * - Party definitions and colors
 * - Chamber specifications
 * - Congress session dates
 * - Senate class schedules
 * - Term calculations
 *
 * All data is hardcoded with `as const` for maximum type safety.
 * Update frequencies:
 * - Parties/Chambers: Never (unless constitutional amendment)
 * - Congress sessions: Biennial (every 2 years after elections)
 * - Senate classes: Never (constitutional)
 */

// ============================================================================
// PARTY DEFINITIONS
// ============================================================================

/**
 * Party metadata including codes, full names, and official colors
 */
export const PARTIES = {
  DEMOCRAT: {
    code: 'D' as const,
    name: 'Democratic' as const,
    fullName: 'Democratic Party' as const,
    color: '#2563eb' as const, // keep in sync with SEMANTIC_COLORS.democrat — party identification only
    bgClass: 'bg-party-dem/10' as const,
    textClass: 'text-party-dem' as const,
  },
  REPUBLICAN: {
    code: 'R' as const,
    name: 'Republican' as const,
    fullName: 'Republican Party' as const,
    color: '#e11d07' as const, // CIV.IQ red — party identification only
    bgClass: 'bg-civiq-red/10' as const,
    textClass: 'text-civiq-red' as const,
  },
  INDEPENDENT: {
    code: 'I' as const,
    name: 'Independent' as const,
    fullName: 'Independent' as const,
    color: '#6B7280' as const, // Neutral gray — no purple in design system
    bgClass: 'bg-gray-100' as const,
    textClass: 'text-gray-600' as const,
  },
} as const;

/**
 * Lookup party by code (D, R, I)
 */
export const PARTY_BY_CODE = {
  D: PARTIES.DEMOCRAT,
  R: PARTIES.REPUBLICAN,
  I: PARTIES.INDEPENDENT,
} as const;

/**
 * Get party info from code or name
 */
export function getPartyInfo(partyIdentifier: string) {
  const normalized = partyIdentifier.toUpperCase();

  // Try direct code lookup
  if (normalized === 'D') return PARTIES.DEMOCRAT;
  if (normalized === 'R') return PARTIES.REPUBLICAN;
  if (normalized === 'I') return PARTIES.INDEPENDENT;

  // Try name matching
  if (normalized.includes('DEMOCRAT')) return PARTIES.DEMOCRAT;
  if (normalized.includes('REPUBLICAN')) return PARTIES.REPUBLICAN;
  if (normalized.includes('INDEPENDENT')) return PARTIES.INDEPENDENT;

  // Default to independent for unknown
  return PARTIES.INDEPENDENT;
}

/**
 * Get party colors for UI components
 */
export function getPartyColors(partyIdentifier: string) {
  const party = getPartyInfo(partyIdentifier);
  return {
    bg: party.bgClass,
    text: party.textClass,
    hex: party.color,
  };
}

// ============================================================================
// CHAMBER DEFINITIONS
// ============================================================================

/**
 * Chamber metadata including official names and sizes
 */
export const CHAMBERS = {
  HOUSE: {
    code: 'house' as const,
    name: 'House' as const,
    fullName: 'U.S. House of Representatives' as const,
    officialName: 'United States House of Representatives' as const,
    size: 435 as const,
    termYears: 2 as const,
    stateRepresentation: 'proportional' as const, // Based on population
  },
  SENATE: {
    code: 'senate' as const,
    name: 'Senate' as const,
    fullName: 'U.S. Senate' as const,
    officialName: 'United States Senate' as const,
    size: 100 as const,
    termYears: 6 as const,
    stateRepresentation: 'equal' as const, // 2 per state
  },
} as const;

/**
 * Get chamber info from identifier
 */
export function getChamberInfo(chamberIdentifier: string) {
  const normalized = chamberIdentifier.toLowerCase();

  if (normalized === 'house' || normalized === 'h') return CHAMBERS.HOUSE;
  if (normalized === 'senate' || normalized === 's') return CHAMBERS.SENATE;

  // Default to House
  return CHAMBERS.HOUSE;
}

// ============================================================================
// CONGRESS SESSIONS
// ============================================================================

/**
 * Historical and current Congress sessions with start/end dates
 * Formula: Congress number = floor((year - 1789) / 2) + 1
 */
export const CONGRESS_SESSIONS = {
  116: {
    number: 116 as const,
    startDate: '2019-01-03' as const,
    endDate: '2021-01-03' as const,
    startYear: 2019 as const,
    endYear: 2021 as const,
  },
  117: {
    number: 117 as const,
    startDate: '2021-01-03' as const,
    endDate: '2023-01-03' as const,
    startYear: 2021 as const,
    endYear: 2023 as const,
  },
  118: {
    number: 118 as const,
    startDate: '2023-01-03' as const,
    endDate: '2025-01-03' as const,
    startYear: 2023 as const,
    endYear: 2025 as const,
  },
  119: {
    number: 119 as const,
    startDate: '2025-01-03' as const,
    endDate: '2027-01-03' as const,
    startYear: 2025 as const,
    endYear: 2027 as const,
  },
  120: {
    number: 120 as const,
    startDate: '2027-01-03' as const,
    endDate: '2029-01-03' as const,
    startYear: 2027 as const,
    endYear: 2029 as const,
  },
  121: {
    number: 121 as const,
    startDate: '2029-01-03' as const,
    endDate: '2031-01-03' as const,
    startYear: 2029 as const,
    endYear: 2031 as const,
  },
} as const;

/**
 * Current active Congress (119th)
 *
 * @deprecated Evaluated once at module load, so a long-lived process keeps
 * the stale session after a Congress boundary. Use getCurrentCongressNumber()
 * or getCurrentCongressSession() instead.
 */
export const CURRENT_CONGRESS = CONGRESS_SESSIONS[119];

/**
 * Calculate Congress number from year
 * Formula: floor((year - 1789) / 2) + 1
 */
export function getCongressNumber(year: number): number {
  return Math.floor((year - 1789) / 2) + 1;
}

/**
 * Get current Congress number based on today's date.
 *
 * A new Congress convenes January 3 of odd years (20th Amendment), NOT
 * January 1 — so on Jan 1–2 of an odd year the previous Congress is still
 * sitting. Computed in UTC so every server instance agrees on the boundary.
 */
export function getCurrentCongressNumber(now: Date = new Date()): number {
  const year = now.getUTCFullYear();
  const congressFromYear = getCongressNumber(year);
  if (year % 2 === 1) {
    // Odd year: before Jan 3 UTC the outgoing Congress is still sitting
    const convening = Date.UTC(year, 0, 3);
    if (now.getTime() < convening) {
      return congressFromYear - 1;
    }
  }
  return congressFromYear;
}

/**
 * Session info for the currently sitting Congress. Returns undefined once
 * the calendar advances past the last hardcoded CONGRESS_SESSIONS entry —
 * callers should treat that as "update the table".
 */
export function getCurrentCongressSession(now: Date = new Date()) {
  const number = getCurrentCongressNumber(now);
  return number in CONGRESS_SESSIONS
    ? CONGRESS_SESSIONS[number as keyof typeof CONGRESS_SESSIONS]
    : undefined;
}

/**
 * Convening (start) and end instants of a Congress, as UTC Dates.
 * Computed from the January 3 rule (20th Amendment), so valid for any
 * modern Congress without a lookup table. Congress n convenes Jan 3 of
 * year 1789 + 2(n-1) and ends Jan 3 two years later.
 */
export function getCongressDateRange(congressNumber: number): { start: Date; end: Date } {
  const startYear = 1789 + (congressNumber - 1) * 2;
  return {
    start: new Date(Date.UTC(startYear, 0, 3)),
    end: new Date(Date.UTC(startYear + 2, 0, 3)),
  };
}

/**
 * Get Congress session info by number
 */
export function getCongressSession(congressNumber: number) {
  if (congressNumber in CONGRESS_SESSIONS) {
    return CONGRESS_SESSIONS[congressNumber as keyof typeof CONGRESS_SESSIONS];
  }

  // Calculate for congresses not in our hardcoded list
  const startYear = 1789 + (congressNumber - 1) * 2;
  const endYear = startYear + 2;

  return {
    number: congressNumber,
    startDate: `${startYear}-01-03`,
    endDate: `${endYear}-01-03`,
    startYear,
    endYear,
  };
}

// ============================================================================
// SENATE CLASS SCHEDULE
// ============================================================================

/**
 * Senate classes define election cycles (constitutional, never changes)
 * - Class I: Elections in years divisible by 6 starting from 2024
 * - Class II: Elections in years divisible by 6 starting from 2026
 * - Class III: Elections in years divisible by 6 starting from 2028
 */
export const SENATE_CLASSES = {
  CLASS_I: {
    class: 1 as const,
    nextElection: 2024 as const,
    cycle: 6 as const,
    states: [
      'CA',
      'CT',
      'DE',
      'FL',
      'HI',
      'IN',
      'MA',
      'MD',
      'ME',
      'MI',
      'MN',
      'MS',
      'MO',
      'MT',
      'ND',
      'NE',
      'NJ',
      'NM',
      'NV',
      'NY',
      'OH',
      'PA',
      'RI',
      'TN',
      'TX',
      'UT',
      'VT',
      'VA',
      'WA',
      'WI',
      'WV',
      'WY',
    ] as const,
  },
  CLASS_II: {
    class: 2 as const,
    nextElection: 2026 as const,
    cycle: 6 as const,
    states: [
      'AL',
      'AK',
      'AR',
      'CO',
      'DE',
      'GA',
      'ID',
      'IL',
      'IA',
      'KS',
      'KY',
      'LA',
      'ME',
      'MA',
      'MI',
      'MN',
      'MS',
      'MT',
      'NE',
      'NH',
      'NJ',
      'NM',
      'NC',
      'OK',
      'OR',
      'RI',
      'SC',
      'SD',
      'TN',
      'TX',
      'VA',
      'WV',
      'WY',
    ] as const,
  },
  CLASS_III: {
    class: 3 as const,
    nextElection: 2028 as const,
    cycle: 6 as const,
    states: [
      'AK',
      'AZ',
      'AR',
      'CA',
      'CO',
      'CT',
      'FL',
      'GA',
      'HI',
      'ID',
      'IL',
      'IN',
      'IA',
      'KS',
      'KY',
      'LA',
      'MD',
      'MO',
      'NV',
      'NH',
      'NY',
      'NC',
      'ND',
      'OH',
      'OK',
      'OR',
      'PA',
      'SC',
      'SD',
      'UT',
      'VT',
      'WA',
      'WI',
    ] as const,
  },
} as const;

/**
 * Federal general election day for a year: the Tuesday after the first
 * Monday in November (2 U.S.C. §1, 3 U.S.C. §1). UTC.
 */
export function getGeneralElectionDay(year: number): Date {
  const nov1Weekday = new Date(Date.UTC(year, 10, 1)).getUTCDay();
  const firstMonday = 1 + ((8 - nov1Weekday) % 7);
  return new Date(Date.UTC(year, 10, firstMonday + 1));
}

const UTC_DAY_MS = 24 * 60 * 60 * 1000;

/** True once the year's general election day (UTC) is fully over. */
function generalElectionHasPassed(year: number, now: Date): boolean {
  return now.getTime() >= getGeneralElectionDay(year).getTime() + UTC_DAY_MS;
}

/**
 * Roll a base election year forward through a 6-year Senate cycle to the
 * next election that has not yet happened as of `now`.
 */
function nextInSenateCycle(baseElectionYear: number, now: Date): number {
  const currentYear = now.getUTCFullYear();
  const cyclesSinceBase = Math.max(0, Math.ceil((currentYear - baseElectionYear) / 6));
  let next = baseElectionYear + cyclesSinceBase * 6;
  if (next === currentYear && generalElectionHasPassed(next, now)) {
    next += 6;
  }
  return next;
}

/**
 * Get next election year for a state's Senate seat
 */
export function getNextSenateElection(
  stateCode: string,
  seatClass?: 1 | 2 | 3,
  now: Date = new Date()
): number {
  if (seatClass) {
    // If we know the class, calculate directly from the class anchor year
    const baseYear = seatClass === 1 ? 2024 : seatClass === 2 ? 2026 : 2028;
    return nextInSenateCycle(baseYear, now);
  }

  // If we don't know the class, check which class(es) this state belongs to
  const upperState = stateCode.toUpperCase();
  const elections: number[] = [];

  // Cast to readonly string[] for runtime includes check
  if ((SENATE_CLASSES.CLASS_I.states as readonly string[]).includes(upperState)) {
    elections.push(nextInSenateCycle(2024, now));
  }

  if ((SENATE_CLASSES.CLASS_II.states as readonly string[]).includes(upperState)) {
    elections.push(nextInSenateCycle(2026, now));
  }

  if ((SENATE_CLASSES.CLASS_III.states as readonly string[]).includes(upperState)) {
    elections.push(nextInSenateCycle(2028, now));
  }

  // Return the nearest upcoming election
  return Math.min(...elections);
}

/**
 * Next election for a Senate seat given its term-end year. Senate terms end
 * January 3 following the November election, so the seat's election cycle is
 * anchored at endYear - 1; stale term data rolls forward by 6-year cycles.
 */
export function getNextSenateElectionFromTermEnd(
  termEndYear: number,
  now: Date = new Date()
): number {
  return nextInSenateCycle(termEndYear - 1, now);
}

/**
 * Next House election year: the next even year, rolling past election day —
 * from the Wednesday after a November election, the answer is two years out.
 */
export function getNextHouseElection(now: Date = new Date()): number {
  const currentYear = now.getUTCFullYear();
  const candidate = currentYear % 2 === 0 ? currentYear : currentYear + 1;
  if (candidate === currentYear && generalElectionHasPassed(candidate, now)) {
    return candidate + 2;
  }
  return candidate;
}

// ============================================================================
// COMMITTEE TYPES
// ============================================================================

/**
 * Committee type classifications
 */
export const COMMITTEE_TYPES = {
  STANDING: 'standing' as const,
  SELECT: 'select' as const,
  SPECIAL: 'special' as const,
  JOINT: 'joint' as const,
} as const;

/**
 * Get committee type from Thomas ID
 */
export function getCommitteeType(thomasId: string): string {
  if (thomasId.startsWith('J')) return COMMITTEE_TYPES.JOINT;
  if (thomasId.startsWith('SC')) return COMMITTEE_TYPES.SELECT;
  if (thomasId.startsWith('SP')) return COMMITTEE_TYPES.SPECIAL;
  return COMMITTEE_TYPES.STANDING;
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type PartyCode = 'D' | 'R' | 'I';
export type PartyName = 'Democratic' | 'Republican' | 'Independent';
export type ChamberCode = 'house' | 'senate';
export type ChamberName = 'House' | 'Senate';
export type CommitteeType = 'standing' | 'select' | 'special' | 'joint';
export type SenateClass = 1 | 2 | 3;
export type CongressNumber = keyof typeof CONGRESS_SESSIONS | number;

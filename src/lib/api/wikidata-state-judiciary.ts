/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Judiciary Service
 *
 * Serves curated structural facts about state high courts (court name, seat
 * count, term length, selection method) for the states where those have been
 * verified. It does NOT serve justice rosters — no source currently provides a
 * reliable "serving today" set per state. See the note above getStateCourtSystem.
 */

import type { StateCourtSystem, JudicialSelectionMethod } from '@/types/state-judiciary';

/**
 * Map of state codes to Wikidata IDs (same as executives)
 */
const STATE_WIKIDATA_IDS: Record<string, string> = {
  AL: 'Q173',
  AK: 'Q797',
  AZ: 'Q816',
  AR: 'Q1612',
  CA: 'Q99',
  CO: 'Q1261',
  CT: 'Q779',
  DE: 'Q1393',
  FL: 'Q812',
  GA: 'Q1428',
  HI: 'Q782',
  ID: 'Q1221',
  IL: 'Q1204',
  IN: 'Q1415',
  IA: 'Q1546',
  KS: 'Q1558',
  KY: 'Q1603',
  LA: 'Q1588',
  ME: 'Q724',
  MD: 'Q1391',
  MA: 'Q771',
  MI: 'Q1166',
  MN: 'Q1527',
  MS: 'Q1494',
  MO: 'Q1581',
  MT: 'Q1212',
  NE: 'Q1553',
  NV: 'Q1227',
  NH: 'Q759',
  NJ: 'Q1408',
  NM: 'Q1522',
  NY: 'Q1384',
  NC: 'Q1454',
  ND: 'Q1207',
  OH: 'Q1397',
  OK: 'Q1649',
  OR: 'Q824',
  PA: 'Q1400',
  RI: 'Q1387',
  SC: 'Q1456',
  SD: 'Q1211',
  TN: 'Q1509',
  TX: 'Q1439',
  UT: 'Q829',
  VT: 'Q16551',
  VA: 'Q1370',
  WA: 'Q1223',
  WV: 'Q1371',
  WI: 'Q1537',
  WY: 'Q1214',
  DC: 'Q61',
};

/**
 * State supreme court names
 */
const SUPREME_COURT_NAMES: Record<string, string> = {
  MI: 'Michigan Supreme Court',
  CA: 'Supreme Court of California',
  TX: 'Texas Supreme Court',
  NY: 'New York Court of Appeals',
  FL: 'Florida Supreme Court',
  PA: 'Supreme Court of Pennsylvania',
  IL: 'Illinois Supreme Court',
  OH: 'Ohio Supreme Court',
  GA: 'Supreme Court of Georgia',
  NC: 'North Carolina Supreme Court',
  VA: 'Supreme Court of Virginia',
  WA: 'Washington Supreme Court',
  MA: 'Massachusetts Supreme Judicial Court',
  MD: 'Maryland Court of Appeals',
  CO: 'Colorado Supreme Court',
};

/**
 * NOTE: A Wikidata SPARQL roster fetch used to live here. It matched position
 * labels containing "supreme court" with no jurisdiction constraint, so it
 * returned U.S. Supreme Court justices — including deceased ones — and stamped
 * them with whichever state was requested. It has been removed rather than
 * repaired: neither Wikidata nor CourtListener currently yields a clean
 * "justices serving today" set per state. See getStateCourtSystem below.
 */

/**
 * Get complete state court system data
 *
 * @param stateCode - Two-letter state code
 * @returns Complete court system information
 */
export async function getStateCourtSystem(stateCode: string): Promise<StateCourtSystem | null> {
  const upperState = stateCode.toUpperCase();

  if (!STATE_WIKIDATA_IDS[upperState]) {
    return null;
  }

  const courtName = SUPREME_COURT_NAMES[upperState] || `${upperState} Supreme Court`;

  // Verified for these states only. Never defaulted: state high courts range
  // from 5 to 9 seats with term lengths from 6 to 14 years, so a fallback
  // value would be a fabricated fact for the other 40 states.
  const selectionMethods: Record<string, JudicialSelectionMethod> = {
    MI: 'election_nonpartisan',
    OH: 'election_nonpartisan',
    TX: 'election_partisan',
    CA: 'appointment',
    NY: 'appointment',
  };

  return {
    state: upperState,
    stateName: getStateName(upperState),
    supremeCourt: {
      name: courtName,
      seats: getSupremeCourtSeats(upperState),
      termLength: getTermLength(upperState),
      selectionMethod: selectionMethods[upperState],
      // No verified roster source is wired. Wikidata's position data is not
      // jurisdiction-clean (a "supreme court" text match returns U.S. Supreme
      // Court justices, including deceased ones, for every state) and
      // CourtListener's termination filter still returns former justices.
      // Shipping either would put fabricated names under a real court.
      justices: [],
      justicesAvailable: false,
      justicesUnavailableReason:
        'No verified source for current state supreme court rosters is connected yet.',
    },
    lastUpdated: new Date().toISOString(),
    dataSource: ['curated'],
  };
}

/**
 * Get number of seats on state supreme court
 */
function getSupremeCourtSeats(stateCode: string): number | undefined {
  const seats: Record<string, number> = {
    MI: 7,
    CA: 7,
    TX: 9,
    NY: 7,
    FL: 7,
    PA: 7,
    IL: 7,
    OH: 7,
    GA: 9,
    NC: 7,
  };
  return seats[stateCode];
}

/**
 * Get term length for state supreme court
 */
function getTermLength(stateCode: string): number | undefined {
  const terms: Record<string, number> = {
    MI: 8,
    CA: 12,
    TX: 6,
    NY: 14,
    FL: 6,
    PA: 10,
    IL: 10,
    OH: 6,
    GA: 6,
    NC: 8,
  };
  return terms[stateCode];
}

/**
 * Get full state name
 */
function getStateName(stateCode: string): string {
  const names: Record<string, string> = {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    DC: 'Washington D.C.',
  };
  return names[stateCode] || 'Unknown State';
}

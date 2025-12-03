/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikidata State Executives Service
 *
 * Fetches comprehensive data about state executive branch officials
 * including governors, lieutenant governors, attorneys general, and
 * other constitutional officers using Wikidata SPARQL queries.
 *
 * Features:
 * - Current state executives by position
 * - Biographical information
 * - Term dates and political affiliation
 * - Historical executive data
 * - Network retry logic with timeouts
 */

// Network configuration
const REQUEST_TIMEOUT = 10000; // 10 seconds for SPARQL queries
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * State executive position data
 */
export interface StateExecutive {
  wikidataId: string;
  name: string;
  position:
    | 'governor'
    | 'lieutenant_governor'
    | 'attorney_general'
    | 'secretary_of_state'
    | 'treasurer'
    | 'comptroller'
    | 'auditor'
    | 'other';
  party?: string;
  termStart?: string;
  termEnd?: string;
  photoUrl?: string;
  birthDate?: string;
  birthPlace?: string;
  education?: string[];
  previousPositions?: string[];
  wikipediaUrl?: string;
}

/**
 * Wikidata SPARQL binding structure
 */
interface WikidataSparqlBinding {
  official?: { value: string };
  officialLabel?: { value: string };
  party?: { value: string };
  partyLabel?: { value: string };
  termStart?: { value: string };
  termEnd?: { value: string };
  photo?: { value: string };
  birthDate?: { value: string };
  birthPlaceLabel?: { value: string };
  educationLabel?: { value: string };
  previousPositionLabel?: { value: string };
  wikipediaUrl?: { value: string };
}

/**
 * Map of state codes to Wikidata IDs
 * (Reusing from existing wikidata.ts)
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
 * State name mappings for SPARQL queries
 */
const STATE_NAMES: Record<string, string> = {
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
  DC: 'Washington, D.C.',
};

/**
 * Position type identifiers in Wikidata (P31 = instance of)
 * These are the general types we look for when searching
 */
const POSITION_TYPE_IDS: Record<string, string> = {
  governor: 'Q889821', // governor of a U.S. state
  lieutenant_governor: 'Q2148916', // lieutenant governor of a state of the United States
  attorney_general: 'Q26334195', // state attorney general of the United States
  secretary_of_state: 'Q26294155', // secretary of state of a state of the United States
};

/**
 * Fetch with timeout and retry logic for SPARQL queries
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retries = MAX_RETRIES
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok && retries > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (retries > 0) {
      const delay = RETRY_DELAY_BASE * Math.pow(2, MAX_RETRIES - retries);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries - 1);
    }

    throw error;
  }
}

/**
 * Execute SPARQL query against Wikidata
 */
async function executeSparqlQuery(query: string): Promise<WikidataSparqlBinding[]> {
  const encodedQuery = encodeURIComponent(query);
  const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

  try {
    const response = await fetchWithRetry(sparqlUrl);
    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.results?.bindings || [];
  } catch {
    return [];
  }
}

/**
 * Fetch current state official by searching for people who hold a position
 * associated with the state. Uses P39 (position held) with state association.
 *
 * Strategy:
 * 1. For governors: Use P6 (head of government) on the state - this works well
 * 2. For other positions: Search for people who hold positions with the state name
 *    in the position label (e.g., "Lieutenant Governor of Alaska")
 */
async function fetchStateOfficial(
  stateCode: string,
  positionName: StateExecutive['position']
): Promise<StateExecutive | null> {
  const wikidataId = STATE_WIKIDATA_IDS[stateCode.toUpperCase()];
  const stateName = STATE_NAMES[stateCode.toUpperCase()];
  if (!wikidataId || !stateName) {
    return null;
  }

  let query: string;

  if (positionName === 'governor') {
    // Governor: Use P6 (head of government) directly on the state entity
    query = `
      SELECT ?person ?personLabel ?party ?partyLabel ?startTime ?photo ?wikipediaUrl
      WHERE {
        wd:${wikidataId} wdt:P6 ?person .
        OPTIONAL { ?person wdt:P102 ?party . }
        OPTIONAL { ?person wdt:P18 ?photo . }
        OPTIONAL {
          ?person p:P39 ?posStatement .
          ?posStatement ps:P39 ?position .
          ?posStatement pq:P580 ?startTime .
          FILTER NOT EXISTS { ?posStatement pq:P582 ?endTime . }
        }
        OPTIONAL {
          ?wikipediaUrl schema:about ?person;
                       schema:isPartOf <https://en.wikipedia.org/>.
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 1
    `;
  } else {
    // Other positions: Find the position item for this state, then find current holder
    const positionTypeId = POSITION_TYPE_IDS[positionName];
    if (!positionTypeId) {
      return null;
    }

    // Search for people who currently hold a position that:
    // 1. Is an instance of the position type (e.g., lieutenant governor)
    // 2. Is associated with the state (via P1001 jurisdiction or label match)
    // 3. Has no end date (current holder)
    query = `
      SELECT ?person ?personLabel ?party ?partyLabel ?startTime ?photo ?wikipediaUrl ?positionLabel
      WHERE {
        ?person p:P39 ?statement .
        ?statement ps:P39 ?position .

        # Position must be instance of the position type (e.g., lieutenant governor)
        ?position wdt:P31 wd:${positionTypeId} .

        # Position must be associated with this state
        { ?position wdt:P1001 wd:${wikidataId} . }
        UNION
        { ?position wdt:P131 wd:${wikidataId} . }
        UNION
        { ?position rdfs:label ?posLabel . FILTER(CONTAINS(LCASE(?posLabel), LCASE("${stateName}"))) }

        # Must be current holder (no end date)
        FILTER NOT EXISTS { ?statement pq:P582 ?endTime . }

        OPTIONAL { ?statement pq:P580 ?startTime . }
        OPTIONAL { ?person wdt:P102 ?party . }
        OPTIONAL { ?person wdt:P18 ?photo . }
        OPTIONAL {
          ?wikipediaUrl schema:about ?person;
                       schema:isPartOf <https://en.wikipedia.org/>.
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 1
    `;
  }

  const bindings = await executeSparqlQuery(query);
  if (!bindings.length) {
    return null;
  }

  const result = bindings[0];
  if (!result) {
    return null;
  }

  // Extract person ID from URI
  const personUri =
    result.official?.value || (result as Record<string, { value: string }>).person?.value;
  const personWikidataId = personUri?.split('/').pop() || '';

  // Get name from the appropriate label field
  const name =
    result.officialLabel?.value ||
    (result as Record<string, { value: string }>).personLabel?.value ||
    'Unknown';

  return {
    wikidataId: personWikidataId,
    name,
    position: positionName,
    party: result.partyLabel?.value,
    termStart: (result as Record<string, { value: string }>).startTime?.value,
    termEnd: undefined, // Current holder has no end date
    photoUrl: result.photo?.value,
    wikipediaUrl: result.wikipediaUrl?.value,
  };
}

/**
 * Get current state governor
 * @param stateCode - Two-letter state code (e.g., "MI", "CA")
 * @returns Governor data or null if not found
 */
export async function getStateGovernor(stateCode: string): Promise<StateExecutive | null> {
  return fetchStateOfficial(stateCode, 'governor');
}

/**
 * Get current lieutenant governor
 * @param stateCode - Two-letter state code
 * @returns Lieutenant governor data or null if not found
 */
export async function getStateLtGovernor(stateCode: string): Promise<StateExecutive | null> {
  return fetchStateOfficial(stateCode, 'lieutenant_governor');
}

/**
 * Get current attorney general
 * @param stateCode - Two-letter state code
 * @returns Attorney general data or null if not found
 */
export async function getStateAttorneyGeneral(stateCode: string): Promise<StateExecutive | null> {
  return fetchStateOfficial(stateCode, 'attorney_general');
}

/**
 * Get current secretary of state
 * @param stateCode - Two-letter state code
 * @returns Secretary of state data or null if not found
 */
export async function getStateSecretaryOfState(stateCode: string): Promise<StateExecutive | null> {
  return fetchStateOfficial(stateCode, 'secretary_of_state');
}

/**
 * Get all current state executives
 * @param stateCode - Two-letter state code
 * @returns Array of all state executives
 */
export async function getAllStateExecutives(stateCode: string): Promise<StateExecutive[]> {
  try {
    // Fetch all positions in parallel for efficiency
    const [governor, ltGovernor, attorneyGeneral, secretaryOfState] = await Promise.all([
      getStateGovernor(stateCode),
      getStateLtGovernor(stateCode),
      getStateAttorneyGeneral(stateCode),
      getStateSecretaryOfState(stateCode),
    ]);

    const executives: StateExecutive[] = [];

    if (governor) executives.push(governor);
    if (ltGovernor) executives.push(ltGovernor);
    if (attorneyGeneral) executives.push(attorneyGeneral);
    if (secretaryOfState) executives.push(secretaryOfState);

    return executives;
  } catch {
    return [];
  }
}

/**
 * Get historical governors for a state
 * @param stateCode - Two-letter state code
 * @param _limit - Maximum number of past governors to return (reserved for future use)
 * @returns Array of historical governors
 */
export async function getHistoricalGovernors(
  stateCode: string,
  _limit = 10
): Promise<StateExecutive[]> {
  const wikidataId = STATE_WIKIDATA_IDS[stateCode.toUpperCase()];
  if (!wikidataId) {
    return [];
  }

  // This requires knowing the specific "Governor of [State]" position Wikidata ID
  // For now, we'll return empty array - this can be enhanced with state-specific position IDs
  return [];
}

/**
 * Check if a state has executive data available in Wikidata
 * @param stateCode - Two-letter state code
 * @returns Boolean indicating if data is available
 */
export function hasStateExecutiveData(stateCode: string): boolean {
  return STATE_WIKIDATA_IDS[stateCode.toUpperCase()] !== undefined;
}

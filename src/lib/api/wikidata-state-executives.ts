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
 * Wikidata property IDs for executive positions
 */
const POSITION_PROPERTIES: Record<string, string> = {
  governor: 'P6', // head of government
  lieutenant_governor: 'P1313',
  attorney_general: 'P3320',
  secretary_of_state: 'P5769',
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
 * Fetch current state official by position
 */
async function fetchStateOfficial(
  stateCode: string,
  positionProperty: string,
  positionName: StateExecutive['position']
): Promise<StateExecutive | null> {
  const wikidataId = STATE_WIKIDATA_IDS[stateCode.toUpperCase()];
  if (!wikidataId) {
    return null;
  }

  const query = `
    SELECT ?official ?officialLabel ?party ?partyLabel ?termStart ?termEnd
           ?photo ?birthDate ?birthPlaceLabel ?educationLabel ?previousPositionLabel ?wikipediaUrl
    WHERE {
      wd:${wikidataId} wdt:${positionProperty} ?official .
      OPTIONAL { ?official wdt:P102 ?party . }
      OPTIONAL { ?official wdt:P580 ?termStart . }
      OPTIONAL { ?official wdt:P582 ?termEnd . }
      OPTIONAL { ?official wdt:P18 ?photo . }
      OPTIONAL { ?official wdt:P569 ?birthDate . }
      OPTIONAL { ?official wdt:P19 ?birthPlace . }
      OPTIONAL { ?official wdt:P69 ?education . }
      OPTIONAL { ?official wdt:P39 ?previousPosition . }
      OPTIONAL {
        ?wikipediaUrl schema:about ?official;
                     schema:isPartOf <https://en.wikipedia.org/>.
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 1
  `;

  const bindings = await executeSparqlQuery(query);
  if (!bindings.length) {
    return null;
  }

  const result = bindings[0];
  if (!result) {
    return null;
  }

  const officialWikidataId = result.official?.value.split('/').pop() || '';

  // Collect all education and previous positions
  const education = new Set<string>();
  const previousPositions = new Set<string>();

  bindings.forEach(binding => {
    if (binding.educationLabel?.value) {
      education.add(binding.educationLabel.value);
    }
    if (binding.previousPositionLabel?.value) {
      previousPositions.add(binding.previousPositionLabel.value);
    }
  });

  return {
    wikidataId: officialWikidataId,
    name: result.officialLabel?.value || 'Unknown',
    position: positionName,
    party: result.partyLabel?.value,
    termStart: result.termStart?.value,
    termEnd: result.termEnd?.value,
    photoUrl: result.photo?.value,
    birthDate: result.birthDate?.value,
    birthPlace: result.birthPlaceLabel?.value,
    education: Array.from(education),
    previousPositions: Array.from(previousPositions),
    wikipediaUrl: result.wikipediaUrl?.value,
  };
}

/**
 * Get current state governor
 * @param stateCode - Two-letter state code (e.g., "MI", "CA")
 * @returns Governor data or null if not found
 */
export async function getStateGovernor(stateCode: string): Promise<StateExecutive | null> {
  const property = POSITION_PROPERTIES.governor;
  if (!property) return null;
  return fetchStateOfficial(stateCode, property, 'governor');
}

/**
 * Get current lieutenant governor
 * @param stateCode - Two-letter state code
 * @returns Lieutenant governor data or null if not found
 */
export async function getStateLtGovernor(stateCode: string): Promise<StateExecutive | null> {
  const property = POSITION_PROPERTIES.lieutenant_governor;
  if (!property) return null;
  return fetchStateOfficial(stateCode, property, 'lieutenant_governor');
}

/**
 * Get current attorney general
 * @param stateCode - Two-letter state code
 * @returns Attorney general data or null if not found
 */
export async function getStateAttorneyGeneral(stateCode: string): Promise<StateExecutive | null> {
  const property = POSITION_PROPERTIES.attorney_general;
  if (!property) return null;
  return fetchStateOfficial(stateCode, property, 'attorney_general');
}

/**
 * Get current secretary of state
 * @param stateCode - Two-letter state code
 * @returns Secretary of state data or null if not found
 */
export async function getStateSecretaryOfState(stateCode: string): Promise<StateExecutive | null> {
  const property = POSITION_PROPERTIES.secretary_of_state;
  if (!property) return null;
  return fetchStateOfficial(stateCode, property, 'secretary_of_state');
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

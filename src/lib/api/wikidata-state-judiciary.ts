/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikidata State Judiciary Service
 *
 * Fetches state supreme court justices and other state judicial officers
 * from Wikidata using SPARQL queries.
 */

import type {
  StateSupremeCourtJustice,
  StateCourtSystem,
  JudicialSelectionMethod,
} from '@/types/state-judiciary';

// Network configuration
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

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
 * SPARQL binding structure
 */
interface WikidataSparqlBinding {
  justice?: { value: string };
  justiceLabel?: { value: string };
  termStart?: { value: string };
  termEnd?: { value: string };
  photo?: { value: string };
  birthDate?: { value: string };
  birthPlaceLabel?: { value: string };
  educationLabel?: { value: string };
  appointedByLabel?: { value: string };
  wikipediaUrl?: { value: string };
}

/**
 * Fetch with timeout and retry logic
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
 * Execute SPARQL query
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
 * Get state supreme court justices from Wikidata
 *
 * @param stateCode - Two-letter state code
 * @returns Array of supreme court justices
 */
export async function getStateSupremeCourtJustices(
  stateCode: string
): Promise<StateSupremeCourtJustice[]> {
  const upperState = stateCode.toUpperCase();
  const stateName = SUPREME_COURT_NAMES[upperState] || `${upperState} Supreme Court`;

  // This is a simplified query - Wikidata coverage of state courts varies significantly
  // In practice, we'd need state-specific queries for each court system
  const query = `
    SELECT ?justice ?justiceLabel ?termStart ?termEnd ?photo ?birthDate
           ?birthPlaceLabel ?educationLabel ?appointedByLabel ?wikipediaUrl
    WHERE {
      ?justice wdt:P39 ?position .
      ?position rdfs:label ?positionLabel .
      FILTER(CONTAINS(LCASE(?positionLabel), "supreme court"))
      FILTER(LANG(?positionLabel) = "en")

      OPTIONAL { ?justice wdt:P580 ?termStart . }
      OPTIONAL { ?justice wdt:P582 ?termEnd . }
      OPTIONAL { ?justice wdt:P18 ?photo . }
      OPTIONAL { ?justice wdt:P569 ?birthDate . }
      OPTIONAL { ?justice wdt:P19 ?birthPlace . }
      OPTIONAL { ?justice wdt:P69 ?education . }
      OPTIONAL { ?justice wdt:P748 ?appointedBy . }
      OPTIONAL {
        ?wikipediaUrl schema:about ?justice;
                     schema:isPartOf <https://en.wikipedia.org/>.
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT 10
  `;

  const bindings = await executeSparqlQuery(query);

  const justices: StateSupremeCourtJustice[] = [];
  const seenJustices = new Set<string>();

  for (const binding of bindings) {
    if (!binding.justice?.value || !binding.justiceLabel?.value) {
      continue;
    }

    const justiceId = binding.justice.value.split('/').pop() || '';

    // Avoid duplicates
    if (seenJustices.has(justiceId)) {
      continue;
    }
    seenJustices.add(justiceId);

    // Collect education from multiple bindings
    const education: string[] = [];
    bindings
      .filter(b => b.justice?.value === binding.justice?.value && b.educationLabel?.value)
      .forEach(b => {
        if (b.educationLabel?.value) {
          education.push(b.educationLabel.value);
        }
      });

    justices.push({
      wikidataId: justiceId,
      name: binding.justiceLabel.value,
      court: stateName,
      courtType: 'supreme',
      position: 'Justice', // Would need more sophisticated detection for Chief Justice
      state: upperState,
      termStart: binding.termStart?.value,
      termEnd: binding.termEnd?.value,
      photoUrl: binding.photo?.value,
      birthDate: binding.birthDate?.value,
      birthPlace: binding.birthPlaceLabel?.value,
      education,
      appointedBy: binding.appointedByLabel?.value,
      wikipediaUrl: binding.wikipediaUrl?.value,
    });
  }

  return justices;
}

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

  const justices = await getStateSupremeCourtJustices(upperState);
  const courtName = SUPREME_COURT_NAMES[upperState] || `${upperState} Supreme Court`;

  // Default selection methods by state (simplified - real data varies)
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
      selectionMethod: selectionMethods[upperState] || 'appointment',
      justices,
    },
    lastUpdated: new Date().toISOString(),
    dataSource: ['wikidata'],
  };
}

/**
 * Get number of seats on state supreme court
 */
function getSupremeCourtSeats(stateCode: string): number {
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
  return seats[stateCode] || 7;
}

/**
 * Get term length for state supreme court
 */
function getTermLength(stateCode: string): number {
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
  return terms[stateCode] || 8;
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

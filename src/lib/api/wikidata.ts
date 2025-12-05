/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikidata API client - Direct client-side implementation
 *
 * This client makes direct SPARQL calls to Wikidata for biographical data.
 * It includes enhanced mappings and intelligent fallback strategies.
 *
 * Features:
 * - Direct Wikidata SPARQL queries
 * - Enhanced bioguide-to-Wikidata mappings
 * - Comprehensive biographical data extraction
 * - Network retry logic with timeouts
 */

import {
  hasEnhancedWikidataMapping,
  getEnhancedWikidataId,
} from '@/lib/data/enhanced-wikidata-mappings';

// Legacy mappings for fallback
const BIOGUIDE_TO_WIKIDATA: Record<string, string> = {
  T000488: 'Q115604581',
  P000197: 'Q170581',
  A000374: 'Q5584301',
  B001298: 'Q28038204',
  B001291: 'Q22966652',
  S000033: 'Q359442',
};

// Network configuration
const REQUEST_TIMEOUT = 10000; // 10 seconds for SPARQL queries
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

/**
 * Comprehensive biographical data from Wikidata
 */
export interface WikidataBiography {
  birthDate?: string;
  birthPlace?: string;
  education?: string[];
  occupations?: string[];
  spouse?: string;
  children?: number;
  awards?: string[];
  wikidataDescription?: string;
  wikipediaUrl?: string;
}

/**
 * Wikidata SPARQL binding structure with proper typing
 */
interface WikidataSparqlBinding {
  birthDate?: { value: string };
  birthPlaceLabel?: { value: string };
  educationLabel?: { value: string };
  occupationLabel?: { value: string };
  spouseLabel?: { value: string };
  children?: { value: string };
  awardLabel?: { value: string };
  description?: { value: string };
  wikipediaUrl?: { value: string };
}

/**
 * Legacy interface for backward compatibility
 */
interface LegacyWikidataBiography {
  birthDate?: string;
  birthPlace?: string;
  education?: string[];
  occupations?: string[];
  spouse?: string;
  children?: number;
  awards?: string[];
  description?: string;
  wikipediaUrl?: string;
}

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
 * Find Wikidata ID for bioguide ID
 */
async function findWikidataId(bioguideId: string): Promise<string | null> {
  try {
    // Check enhanced mappings first
    if (hasEnhancedWikidataMapping(bioguideId)) {
      return getEnhancedWikidataId(bioguideId);
    }

    // Check legacy mapping
    if (BIOGUIDE_TO_WIKIDATA[bioguideId]) {
      return BIOGUIDE_TO_WIKIDATA[bioguideId];
    }

    // Query Wikidata SPARQL endpoint
    const query = `SELECT ?person WHERE { ?person wdt:P1157 "${bioguideId}" . }`;
    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetchWithRetry(sparqlUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results?.bindings?.length) return null;

    const wikidataUri = data.results.bindings[0]?.person?.value;
    if (!wikidataUri) return null;

    const wikidataId = wikidataUri.split('/').pop();
    if (wikidataId) {
      // Cache for future use
      BIOGUIDE_TO_WIKIDATA[bioguideId] = wikidataId;
    }

    return wikidataId || null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error finding Wikidata ID for ${bioguideId}:`, error);
    return null;
  }
}

/**
 * Fetch comprehensive biographical information from Wikidata
 */
async function fetchWikidataInfo(wikidataId: string): Promise<WikidataBiography | null> {
  try {
    const query = `
      SELECT ?birthDate ?birthPlaceLabel ?educationLabel ?occupationLabel ?spouseLabel
             ?children ?awardLabel ?description ?wikipediaUrl WHERE {
        wd:${wikidataId} wdt:P569 ?birthDate .
        OPTIONAL { wd:${wikidataId} wdt:P19 ?birthPlace . }
        OPTIONAL { wd:${wikidataId} wdt:P69 ?education . }
        OPTIONAL { wd:${wikidataId} wdt:P106 ?occupation . }
        OPTIONAL { wd:${wikidataId} wdt:P26 ?spouse . }
        OPTIONAL { wd:${wikidataId} wdt:P1971 ?children . }
        OPTIONAL { wd:${wikidataId} wdt:P166 ?award . }
        OPTIONAL { wd:${wikidataId} schema:description ?description . FILTER(lang(?description) = "en") }
        OPTIONAL {
          ?wikipediaUrl schema:about wd:${wikidataId};
                       schema:isPartOf <https://en.wikipedia.org/>.
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;

    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetchWithRetry(sparqlUrl);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.results?.bindings?.length) return null;

    const bindings = data.results.bindings as WikidataSparqlBinding[];
    const education = new Set<string>();
    const occupations = new Set<string>();
    const awards = new Set<string>();
    let birthPlace: string | undefined;
    let spouse: string | undefined;
    let children: number | undefined;
    let description: string | undefined;
    let birthDate: string | undefined;
    let wikipediaUrl: string | undefined;

    bindings.forEach(binding => {
      if (binding.birthDate?.value) birthDate = binding.birthDate.value;
      if (binding.birthPlaceLabel?.value) birthPlace = binding.birthPlaceLabel.value;
      if (binding.educationLabel?.value) education.add(binding.educationLabel.value);
      if (binding.occupationLabel?.value) occupations.add(binding.occupationLabel.value);
      if (binding.spouseLabel?.value) spouse = binding.spouseLabel.value;
      if (binding.children?.value) children = parseInt(binding.children.value, 10);
      if (binding.awardLabel?.value) awards.add(binding.awardLabel.value);
      if (binding.description?.value) description = binding.description.value;
      if (binding.wikipediaUrl?.value) wikipediaUrl = binding.wikipediaUrl.value;
    });

    return {
      birthDate,
      birthPlace,
      education: Array.from(education),
      occupations: Array.from(occupations),
      spouse,
      children,
      awards: Array.from(awards),
      wikidataDescription: description,
      wikipediaUrl,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching Wikidata info for ${wikidataId}:`, error);
    return null;
  }
}

/**
 * Calculate age from birth date string
 */
function calculateAge(birthDateStr: string): number | null {
  try {
    const birthDate = new Date(birthDateStr);
    const today = new Date();

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
}

/**
 * Fetch birth date and calculate age using direct Wikidata access
 * @param bioguideId - Official bioguide ID from Congress
 * @returns Age in years or null if not found
 */
export async function getAgeFromWikidata(bioguideId: string): Promise<number | null> {
  try {
    const wikidataId = await findWikidataId(bioguideId);
    if (!wikidataId) return null;

    const biography = await fetchWikidataInfo(wikidataId);
    if (!biography?.birthDate) return null;

    return calculateAge(biography.birthDate);
  } catch {
    return null;
  }
}

/**
 * Fetch comprehensive biographical information using direct Wikidata access
 * @param bioguideId - Official bioguide ID from Congress
 * @returns Biographical information or null if not found
 */
export async function getBiographyFromWikidata(
  bioguideId: string
): Promise<LegacyWikidataBiography | null> {
  try {
    const wikidataId = await findWikidataId(bioguideId);
    if (!wikidataId) return null;

    const biography = await fetchWikidataInfo(wikidataId);
    if (!biography) return null;

    return {
      birthDate: biography.birthDate,
      birthPlace: biography.birthPlace,
      education: biography.education,
      occupations: biography.occupations,
      spouse: biography.spouse,
      children: biography.children,
      awards: biography.awards,
      description: biography.wikidataDescription,
      wikipediaUrl: biography.wikipediaUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Main function to fetch Wikidata biographical data
 * @param bioguideId - Official bioguide ID from Congress
 * @returns Complete biographical data or null if not found
 */
export async function fetchWikidataBiography(
  bioguideId: string
): Promise<WikidataBiography | null> {
  try {
    const wikidataId = await findWikidataId(bioguideId);
    if (!wikidataId) return null;

    return await fetchWikidataInfo(wikidataId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching Wikidata biography for ${bioguideId}:`, error);
    return null;
  }
}

/**
 * Check if bioguide ID has Wikidata biographical data
 * @param bioguideId - Official bioguide ID
 * @returns Promise resolving to boolean indicating if data exists
 */
export async function hasWikidataMapping(bioguideId: string): Promise<boolean> {
  try {
    // Check enhanced mappings first for quick lookup
    if (hasEnhancedWikidataMapping(bioguideId)) {
      return true;
    }

    // Check legacy mapping
    if (BIOGUIDE_TO_WIKIDATA[bioguideId]) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * District information interface
 */
interface DistrictWikidataInfo {
  established?: string;
  area?: number;
  previousRepresentatives?: string[];
  wikipediaUrl?: string;
}

/**
 * Fetch district information from Wikidata
 * Note: This functionality is preserved as-is since it's not part of
 * the biography refactor and still needs direct Wikidata access.
 *
 * @param state - State code (e.g., "MI")
 * @param district - District number (e.g., "12")
 * @returns District information or null if not found
 */
export async function getDistrictFromWikidata(
  state: string,
  district: string
): Promise<DistrictWikidataInfo | null> {
  try {
    // Map state codes to full names for Wikidata query
    const stateNames: Record<string, string> = {
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
      DC: 'District of Columbia',
    };

    const stateName = stateNames[state];
    if (!stateName) {
      return null;
    }

    // SPARQL query to get district information
    const query = `
      SELECT ?district ?districtLabel ?established ?area ?wikipediaUrl WHERE {
        ?district wdt:P31 wd:Q13218391.  # instance of US Congressional District
        ?district rdfs:label ?districtLabel.
        FILTER(CONTAINS(LCASE(?districtLabel), LCASE("${stateName}'s ${district}")))
        OPTIONAL { ?district wdt:P571 ?established. }  # inception date
        OPTIONAL { ?district wdt:P2046 ?area. }  # area
        OPTIONAL {
          ?wikipediaUrl schema:about ?district;
                       schema:isPartOf <https://en.wikipedia.org/>.
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT 1
    `;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.results?.bindings?.length) {
      return null;
    }

    const result = data.results.bindings[0];
    return {
      established: result.established?.value,
      area: result.area ? parseFloat(result.area.value) : undefined,
      wikipediaUrl: result.wikipediaUrl?.value,
    };
  } catch {
    return null;
  }
}

interface StateWikidataInfo {
  name?: string;
  capital?: string;
  statehood?: string;
  population?: number;
  area?: number;
  nickname?: string;
  motto?: string;
  flag?: string;
  seal?: string;
  governor?: string;
  wikipediaUrl?: string;
  officialWebsite?: string;
  timezone?: string;
  majorCities?: string[];
}

/**
 * Fetch comprehensive state information from Wikidata
 * @param stateCode - State abbreviation (e.g., "VT", "CA")
 * @returns State civic information or null if not found
 */
export async function getStateFromWikidata(stateCode: string): Promise<StateWikidataInfo | null> {
  try {
    // Map state codes to Wikidata IDs
    const stateWikidataIds: Record<string, string> = {
      AL: 'Q173', // Alabama
      AK: 'Q797', // Alaska
      AZ: 'Q816', // Arizona
      AR: 'Q1612', // Arkansas
      CA: 'Q99', // California
      CO: 'Q1261', // Colorado
      CT: 'Q779', // Connecticut
      DE: 'Q1393', // Delaware
      FL: 'Q812', // Florida
      GA: 'Q1428', // Georgia
      HI: 'Q782', // Hawaii
      ID: 'Q1221', // Idaho
      IL: 'Q1204', // Illinois
      IN: 'Q1415', // Indiana
      IA: 'Q1546', // Iowa
      KS: 'Q1558', // Kansas
      KY: 'Q1603', // Kentucky
      LA: 'Q1588', // Louisiana
      ME: 'Q724', // Maine
      MD: 'Q1391', // Maryland
      MA: 'Q771', // Massachusetts
      MI: 'Q1166', // Michigan
      MN: 'Q1527', // Minnesota
      MS: 'Q1494', // Mississippi
      MO: 'Q1581', // Missouri
      MT: 'Q1212', // Montana
      NE: 'Q1553', // Nebraska
      NV: 'Q1227', // Nevada
      NH: 'Q759', // New Hampshire
      NJ: 'Q1408', // New Jersey
      NM: 'Q1522', // New Mexico
      NY: 'Q1384', // New York
      NC: 'Q1454', // North Carolina
      ND: 'Q1207', // North Dakota
      OH: 'Q1397', // Ohio
      OK: 'Q1649', // Oklahoma
      OR: 'Q824', // Oregon
      PA: 'Q1400', // Pennsylvania
      RI: 'Q1387', // Rhode Island
      SC: 'Q1456', // South Carolina
      SD: 'Q1211', // South Dakota
      TN: 'Q1509', // Tennessee
      TX: 'Q1439', // Texas
      UT: 'Q829', // Utah
      VT: 'Q16551', // Vermont
      VA: 'Q1370', // Virginia
      WA: 'Q1223', // Washington
      WV: 'Q1371', // West Virginia
      WI: 'Q1537', // Wisconsin
      WY: 'Q1214', // Wyoming
      DC: 'Q61', // Washington D.C.
    };

    const wikidataId = stateWikidataIds[stateCode];
    if (!wikidataId) {
      return null;
    }

    // Comprehensive SPARQL query for state information
    const query = `
      SELECT ?name ?capital ?capitalLabel ?statehood ?population ?area ?nickname ?motto
             ?flag ?seal ?governor ?governorLabel ?wikipediaUrl ?website ?timezone WHERE {
        wd:${wikidataId} rdfs:label ?name .
        FILTER(lang(?name) = "en")

        OPTIONAL { wd:${wikidataId} wdt:P36 ?capital . }
        OPTIONAL { wd:${wikidataId} wdt:P571 ?statehood . }
        OPTIONAL { wd:${wikidataId} wdt:P1082 ?population . }
        OPTIONAL { wd:${wikidataId} wdt:P2046 ?area . }
        OPTIONAL { wd:${wikidataId} wdt:P1449 ?nickname . }
        OPTIONAL { wd:${wikidataId} wdt:P1451 ?motto . }
        OPTIONAL { wd:${wikidataId} wdt:P41 ?flag . }
        OPTIONAL { wd:${wikidataId} wdt:P158 ?seal . }
        OPTIONAL { wd:${wikidataId} wdt:P6 ?governor . }
        OPTIONAL { wd:${wikidataId} wdt:P856 ?website . }
        OPTIONAL { wd:${wikidataId} wdt:P421 ?timezone . }
        OPTIONAL {
          ?wikipediaUrl schema:about wd:${wikidataId};
                       schema:isPartOf <https://en.wikipedia.org/>.
        }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
    `;

    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetchWithRetry(sparqlUrl);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (!data.results?.bindings?.length) {
      return null;
    }

    const result = data.results.bindings[0];

    return {
      name: result.name?.value,
      capital: result.capitalLabel?.value,
      statehood: result.statehood?.value,
      population: result.population ? parseInt(result.population.value, 10) : undefined,
      area: result.area ? parseFloat(result.area.value) : undefined,
      nickname: result.nickname?.value,
      motto: result.motto?.value,
      flag: result.flag?.value,
      seal: result.seal?.value,
      governor: result.governorLabel?.value,
      wikipediaUrl: result.wikipediaUrl?.value,
      officialWebsite: result.website?.value,
      timezone: result.timezone?.value,
    };
  } catch {
    return null;
  }
}

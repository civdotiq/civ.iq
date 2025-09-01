/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikidata integration for representative and district data
 * Maps bioguide IDs to Wikidata IDs and fetches birth dates via SPARQL
 * Also fetches district information when available
 * Follows CLAUDE.MD rules for real data only
 */

// Map bioguide IDs to Wikidata IDs (official government data cross-reference)
const BIOGUIDE_TO_WIKIDATA: Record<string, string> = {
  T000488: 'Q115604581', // Shri Thanedar
  P000197: 'Q170581', // Nancy Pelosi
  A000374: 'Q5584301', // Ralph Abraham
  B001298: 'Q28038204', // Don Bacon
  B001291: 'Q22966652', // Brian Babin
  // Add more mappings as needed
};

interface WikidataResponse {
  results: {
    bindings: Array<{
      birthDate: {
        value: string;
        type: string;
      };
    }>;
  };
}

/**
 * Fetch birth date from Wikidata SPARQL endpoint
 * @param bioguideId - Official bioguide ID from Congress
 * @returns Age in years or null if not found
 */
export async function getAgeFromWikidata(bioguideId: string): Promise<number | null> {
  try {
    const wikidataId = BIOGUIDE_TO_WIKIDATA[bioguideId];
    if (!wikidataId) {
      return null;
    }

    // SPARQL query to get birth date
    const query = `
      SELECT ?birthDate WHERE {
        wd:${wikidataId} wdt:P569 ?birthDate.
      }
    `;

    const encodedQuery = encodeURIComponent(query);
    const sparqlUrl = `https://query.wikidata.org/sparql?query=${encodedQuery}&format=json`;

    const response = await fetch(sparqlUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: WikidataResponse = await response.json();

    if (!data.results.bindings.length || !data.results.bindings[0]) {
      return null;
    }

    const birthDateStr = data.results.bindings[0].birthDate.value;
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
 * Check if bioguide ID has Wikidata mapping
 * @param bioguideId - Official bioguide ID
 * @returns boolean indicating if mapping exists
 */
export function hasWikidataMapping(bioguideId: string): boolean {
  return bioguideId in BIOGUIDE_TO_WIKIDATA;
}

interface DistrictWikidataInfo {
  established?: string;
  area?: number;
  previousRepresentatives?: string[];
  wikipediaUrl?: string;
}

/**
 * Fetch district information from Wikidata
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
      MI: 'Michigan',
      CA: 'California',
      TX: 'Texas',
      NY: 'New York',
      FL: 'Florida',
      // Add more as needed
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
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivIQ/1.0 (https://civiq.org; contact@civiq.org)',
      },
    });

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

/**
 * Get Wikidata ID for bioguide ID
 * @param bioguideId - Official bioguide ID
 * @returns Wikidata ID or null
 */
export function getWikidataId(bioguideId: string): string | null {
  return BIOGUIDE_TO_WIKIDATA[bioguideId] || null;
}

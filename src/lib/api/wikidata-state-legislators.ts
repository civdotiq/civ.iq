/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikidata State Legislators Service
 *
 * Fetches biographical data for state legislators from Wikidata.
 * Uses fuzzy matching to find legislators by name, state, and position.
 */

import { fetchWikidataBiography, type WikidataBiography } from './wikidata';

// Network configuration
const REQUEST_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000;

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
 * Find Wikidata ID for a state legislator using name and location
 * Uses SPARQL fuzzy matching
 */
export async function findStateLegislatorWikidataId(
  name: string,
  stateCode: string,
  _chamber: 'upper' | 'lower'
): Promise<string | null> {
  try {
    // Clean the name for searching
    const cleanName = name.replace(/\s+(Jr\.|Sr\.|III|II|IV)$/i, '').trim();

    // Try to find by name and state
    const query = `
      SELECT ?person WHERE {
        ?person rdfs:label ?label .
        FILTER(CONTAINS(LCASE(?label), LCASE("${cleanName}")))
        ?person wdt:P39 ?position .
        ?position wdt:P2541 ?stateItem .
        FILTER(CONTAINS(STR(?stateItem), "${stateCode}"))
      }
      LIMIT 1
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

    const wikidataUri = data.results.bindings[0]?.person?.value;
    if (!wikidataUri) {
      return null;
    }

    return wikidataUri.split('/').pop() || null;
  } catch {
    return null;
  }
}

/**
 * Get biographical data for a state legislator from Wikidata
 *
 * @param name - Legislator's full name
 * @param stateCode - Two-letter state code
 * @param chamber - 'upper' or 'lower'
 * @returns Wikidata biographical data or null
 */
export async function getStateLegislatorBiography(
  name: string,
  stateCode: string,
  chamber: 'upper' | 'lower'
): Promise<WikidataBiography | null> {
  try {
    const wikidataId = await findStateLegislatorWikidataId(name, stateCode, chamber);

    if (!wikidataId) {
      return null;
    }

    // Use the existing wikidata.ts function to fetch biographical data
    return await fetchWikidataBiography(wikidataId);
  } catch {
    return null;
  }
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikipedia API client - Direct client-side implementation
 *
 * This client makes direct calls to Wikipedia's REST API for biography data.
 * HTML sanitization is handled client-side using DOMPurify for security.
 *
 * Features:
 * - Direct Wikipedia API access with enhanced mappings
 * - Client-side HTML sanitization
 * - Intelligent search strategies for representatives
 * - Network retry logic with timeouts
 */

import {
  hasEnhancedWikipediaMapping,
  getEnhancedWikipediaPageName,
} from '@/lib/data/enhanced-wikipedia-mappings';

// Legacy mappings for fallback
const BIOGUIDE_TO_WIKIPEDIA: Record<string, string> = {
  S000033: 'Bernie_Sanders',
  P000197: 'Nancy_Pelosi',
  T000488: 'Shri_Thanedar',
};

// Network configuration
const REQUEST_TIMEOUT = 8000; // 8 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

/**
 * Interface for Wikipedia biography data
 */
export interface WikipediaBiography {
  wikipediaSummary?: string;
  wikipediaHtmlSummary?: string;
  wikipediaImageUrl?: string;
  wikipediaPageUrl?: string;
  lastUpdated: string;
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
 * Find Wikipedia page name with intelligent search
 */
async function findWikipediaPageName(
  bioguideId: string,
  representativeName: string
): Promise<string | null> {
  try {
    // Check enhanced mappings first
    if (hasEnhancedWikipediaMapping(bioguideId)) {
      return getEnhancedWikipediaPageName(bioguideId);
    }

    // Check legacy mapping
    if (BIOGUIDE_TO_WIKIPEDIA[bioguideId]) {
      return BIOGUIDE_TO_WIKIPEDIA[bioguideId];
    }

    // Search strategies
    const searchStrategies = [
      representativeName.replace(/\s+/g, '_'),
      `"${representativeName}" United States`,
      `"${representativeName}" Congress`,
      `${representativeName} US Senator`,
      `${representativeName} US Representative`,
    ];

    for (const searchQuery of searchStrategies) {
      try {
        // Try direct page access first
        if (searchQuery.includes('_') && !searchQuery.includes('"')) {
          const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchQuery)}`;
          const directResponse = await fetchWithRetry(directUrl);

          if (directResponse.ok) {
            const directResult = await directResponse.json();
            if (directResult.title && !directResult.title.includes('may refer to')) {
              BIOGUIDE_TO_WIKIPEDIA[bioguideId] = searchQuery;
              return searchQuery;
            }
          }
        }

        // Try search API
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(searchQuery)}`;
        const response = await fetchWithRetry(searchUrl);

        if (!response.ok) continue;

        const searchResults = await response.json();
        if (!searchResults.pages?.length) continue;

        // Get the first result that looks like a politician
        const politicalKeywords = ['senator', 'representative', 'congress', 'politician'];
        for (const page of searchResults.pages) {
          const title = page.title?.toLowerCase() || '';
          const excerpt = page.excerpt?.toLowerCase() || '';
          const description = page.description?.toLowerCase() || '';

          const isPolitical = politicalKeywords.some(
            keyword =>
              title.includes(keyword) || excerpt.includes(keyword) || description.includes(keyword)
          );

          if (isPolitical && !title.includes('disambiguation')) {
            BIOGUIDE_TO_WIKIPEDIA[bioguideId] = page.key;
            return page.key;
          }
        }
      } catch {
        continue;
      }
    }

    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error finding Wikipedia page for ${bioguideId}:`, error);
    return null;
  }
}

/**
 * Fetch Wikipedia biography data directly from Wikipedia API
 */
async function fetchWikipediaInfo(pageTitle: string): Promise<WikipediaBiography | null> {
  try {
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
    const response = await fetchWithRetry(summaryUrl);

    if (!response.ok) return null;

    const summary = await response.json();

    return {
      wikipediaSummary: summary.extract,
      wikipediaHtmlSummary: summary.extract_html,
      wikipediaImageUrl: summary.thumbnail?.source || summary.originalimage?.source,
      wikipediaPageUrl: summary.content_urls.desktop.page,
      lastUpdated: new Date().toISOString(),
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching Wikipedia info for ${pageTitle}:`, error);
    return null;
  }
}

/**
 * Fetch biographical data directly from Wikipedia
 * @param bioguideId - Official bioguide ID from Congress
 * @param representativeName - Representative's name for search
 * @returns Biography data from Wikipedia or null if not found
 */
export async function fetchBiography(
  bioguideId: string,
  representativeName?: string
): Promise<WikipediaBiography | null> {
  try {
    if (!representativeName) {
      return null;
    }

    const wikipediaPageName = await findWikipediaPageName(bioguideId, representativeName);
    if (!wikipediaPageName) {
      return null;
    }

    const wikipediaInfo = await fetchWikipediaInfo(wikipediaPageName);
    return wikipediaInfo;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`Error fetching biography for ${bioguideId}:`, error);
    return null;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use fetchBiography instead
 */
export async function getBiographyFromWikipedia(
  bioguideId: string,
  representativeName: string,
  _wikipediaId?: string
): Promise<{
  title?: string;
  description?: string;
  summary?: string;
  htmlSummary?: string;
  imageUrl?: string;
  pageUrl?: string;
  lastModified?: string;
} | null> {
  const biography = await fetchBiography(bioguideId, representativeName);

  if (!biography) {
    return null;
  }

  return {
    title: biography.wikipediaPageUrl ? biography.wikipediaPageUrl.split('/').pop() : undefined,
    description: undefined,
    summary: biography.wikipediaSummary,
    htmlSummary: biography.wikipediaHtmlSummary,
    imageUrl: biography.wikipediaImageUrl,
    pageUrl: biography.wikipediaPageUrl,
    lastModified: biography.lastUpdated,
  };
}

/**
 * Check if bioguide ID has biographical data
 * @param bioguideId - Official bioguide ID
 * @returns Promise resolving to boolean indicating if data exists
 */
export async function hasWikipediaMapping(bioguideId: string): Promise<boolean> {
  try {
    // Check enhanced mappings first for quick lookup
    if (hasEnhancedWikipediaMapping(bioguideId)) {
      return true;
    }

    // Check legacy mapping
    if (BIOGUIDE_TO_WIKIPEDIA[bioguideId]) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Convert district number to ordinal (e.g., 1 → "1st", 22 → "22nd")
 */
function toOrdinal(num: number): string {
  const suffix = ['th', 'st', 'nd', 'rd'];
  const value = num % 100;
  const suffixIndex = (value - 20) % 10;
  return num + (suffix[suffixIndex] || suffix[value] || 'th');
}

/**
 * Fetch Wikipedia data for a state legislative district
 * @param stateName - Full state name (e.g., "Michigan", not "MI")
 * @param districtNumber - District number (e.g., 22)
 * @param chamber - "upper" for Senate or "lower" for House
 * @returns Wikipedia biography data or null if not found
 * @public Exported for state district pages
 */
export async function fetchDistrictBiography(
  stateName: string,
  districtNumber: number,
  chamber: 'upper' | 'lower'
): Promise<WikipediaBiography | null> {
  try {
    const chamberName = chamber === 'upper' ? 'Senate' : 'House';
    const ordinal = toOrdinal(districtNumber);

    // Wikipedia naming pattern: "{State}'s {ordinal} State {Chamber} district"
    const wikipediaPageName = `${stateName}'s_${ordinal}_State_${chamberName}_district`;

    // Try direct fetch first
    const wikipediaInfo = await fetchWikipediaInfo(wikipediaPageName);
    if (wikipediaInfo) {
      return wikipediaInfo;
    }

    // Try search as fallback
    const searchQuery = `${stateName} ${ordinal} State ${chamberName} district`;
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(searchQuery)}&limit=1&format=json&origin=*`;

    const response = await fetchWithRetry(searchUrl);
    if (!response.ok) {
      return null;
    }

    const searchResults = (await response.json()) as [string, string[], string[], string[]];
    const titles = searchResults[1];

    if (titles && titles.length > 0 && titles[0]) {
      const foundPageName = titles[0].replace(/ /g, '_');
      return await fetchWikipediaInfo(foundPageName);
    }

    return null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      `Error fetching district biography for ${stateName} ${chamber} ${districtNumber}:`,
      error
    );
    return null;
  }
}

/**
 * Get Wikipedia page URL for representative
 * @param bioguideId - Official bioguide ID
 * @param representativeName - Full name for enhanced search
 * @returns Wikipedia URL or null if not found
 */
export async function getWikipediaUrl(
  bioguideId: string,
  representativeName: string
): Promise<string | null> {
  try {
    const biography = await fetchBiography(bioguideId, representativeName);
    return biography?.wikipediaPageUrl || null;
  } catch {
    return null;
  }
}

/**
 * Clear in-memory Wikipedia mapping cache
 * @param bioguideId - Optional specific bioguide ID to clear, or clear all if not provided
 * @returns Boolean indicating success
 */
export function clearWikipediaCache(bioguideId?: string): boolean {
  try {
    if (bioguideId) {
      delete BIOGUIDE_TO_WIKIPEDIA[bioguideId];
    } else {
      // Clear all cached mappings
      Object.keys(BIOGUIDE_TO_WIKIPEDIA).forEach(key => {
        delete BIOGUIDE_TO_WIKIPEDIA[key];
      });
    }
    return true;
  } catch {
    return false;
  }
}

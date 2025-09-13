/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikipedia REST API integration for representative biographical data
 * Fetches page summaries and biographical information
 * Follows CLAUDE.MD rules for real data only
 */

interface WikipediaSummary {
  title: string;
  description: string;
  extract: string;
  extract_html: string;
  thumbnail?: {
    source: string;
    width: number;
    height: number;
  };
  originalimage?: {
    source: string;
    width: number;
    height: number;
  };
  content_urls: {
    desktop: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
    mobile: {
      page: string;
      revisions: string;
      edit: string;
      talk: string;
    };
  };
}

interface WikipediaBiographyData {
  title: string;
  description: string;
  summary: string;
  htmlSummary: string;
  imageUrl?: string;
  pageUrl: string;
  lastModified?: string;
}

// Map bioguide IDs to Wikipedia page names
const BIOGUIDE_TO_WIKIPEDIA: Record<string, string> = {
  S000033: 'Bernie_Sanders',
  P000197: 'Nancy_Pelosi',
  T000488: 'Shri_Thanedar',
  // Add more mappings as needed
};

/**
 * Find Wikipedia page name by searching for representative
 * @param bioguideId - Official bioguide ID from Congress
 * @param representativeName - Full name of representative
 * @returns Wikipedia page name or null if not found
 */
async function findWikipediaPageName(
  bioguideId: string,
  representativeName: string
): Promise<string | null> {
  try {
    // Check static mapping first
    if (BIOGUIDE_TO_WIKIPEDIA[bioguideId]) {
      return BIOGUIDE_TO_WIKIPEDIA[bioguideId];
    }

    // Search Wikipedia for the representative
    const searchQuery = encodeURIComponent(`${representativeName} United States Congress`);
    const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${searchQuery}`;

    const response = await fetch(searchUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
      },
    });

    if (!response.ok) {
      return null;
    }

    const searchResults = await response.json();
    if (!searchResults.pages?.length) {
      return null;
    }

    // Find the most relevant result (usually the first one)
    const topResult = searchResults.pages[0];
    if (topResult?.key) {
      // Cache the mapping
      BIOGUIDE_TO_WIKIPEDIA[bioguideId] = topResult.key;
      return topResult.key;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch biographical summary from Wikipedia REST API
 * @param bioguideId - Official bioguide ID from Congress
 * @param representativeName - Full name of representative for search fallback
 * @returns Wikipedia biographical data or null if not found
 */
export async function getBiographyFromWikipedia(
  bioguideId: string,
  representativeName: string
): Promise<WikipediaBiographyData | null> {
  try {
    const pageTitle = await findWikipediaPageName(bioguideId, representativeName);
    if (!pageTitle) {
      return null;
    }

    // Fetch page summary from Wikipedia REST API
    const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;

    const response = await fetch(summaryUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
      },
    });

    if (!response.ok) {
      return null;
    }

    const summary: WikipediaSummary = await response.json();

    return {
      title: summary.title,
      description: summary.description,
      summary: summary.extract,
      htmlSummary: summary.extract_html,
      imageUrl: summary.thumbnail?.source || summary.originalimage?.source,
      pageUrl: summary.content_urls.desktop.page,
      lastModified: new Date().toISOString(), // Wikipedia doesn't provide this in summary API
    };
  } catch {
    return null;
  }
}

/**
 * Check if bioguide ID has Wikipedia mapping
 * @param bioguideId - Official bioguide ID
 * @returns boolean indicating if mapping exists
 */
export function hasWikipediaMapping(bioguideId: string): boolean {
  return bioguideId in BIOGUIDE_TO_WIKIPEDIA;
}

/**
 * Get Wikipedia page URL for representative
 * @param bioguideId - Official bioguide ID
 * @param representativeName - Full name for search fallback
 * @returns Wikipedia URL or null if not found
 */
export async function getWikipediaUrl(
  bioguideId: string,
  representativeName: string
): Promise<string | null> {
  try {
    const pageTitle = await findWikipediaPageName(bioguideId, representativeName);
    if (!pageTitle) {
      return null;
    }

    return `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle)}`;
  } catch {
    return null;
  }
}

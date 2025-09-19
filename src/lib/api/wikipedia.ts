/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Wikipedia REST API integration for representative biographical data
 * Fetches page summaries and biographical information
 * Follows CLAUDE.MD rules for real data only
 */

interface WikipediaSearchPage {
  key: string;
  title: string;
  excerpt?: string;
  description?: string;
  matched_title?: string;
}

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

import {
  hasEnhancedWikipediaMapping,
  getEnhancedWikipediaPageName,
} from '../data/enhanced-wikipedia-mappings';

// Legacy mappings (now supplemented by enhanced mappings)
const BIOGUIDE_TO_WIKIPEDIA: Record<string, string> = {
  S000033: 'Bernie_Sanders',
  P000197: 'Nancy_Pelosi',
  T000488: 'Shri_Thanedar',
  // Add more mappings as needed
};

/**
 * Normalize name for better Wikipedia matching
 */
function normalizeNameForSearch(name: string): string[] {
  const normalized = name
    .replace(/[""'']/g, '') // Remove quotes
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  const variants = [normalized];

  // Handle common name transformations
  if (normalized.includes(' ')) {
    const parts = normalized.split(' ');

    // Try "First Last" format
    if (parts.length >= 2) {
      variants.push(`${parts[0]} ${parts[parts.length - 1]}`);
    }

    // Try with middle names/initials removed
    if (parts.length > 2) {
      variants.push(`${parts[0]} ${parts[parts.length - 1]}`);
    }

    // Try nickname variations
    const commonNicknames: Record<string, string[]> = {
      Alexander: ['Alex'],
      Andrew: ['Andy'],
      Anthony: ['Tony'],
      Bernard: ['Bernie'],
      Charles: ['Chuck', 'Charlie'],
      Christopher: ['Chris'],
      Daniel: ['Dan', 'Danny'],
      David: ['Dave'],
      Donald: ['Don'],
      Edward: ['Ed', 'Eddie'],
      Elizabeth: ['Liz', 'Beth'],
      Gregory: ['Greg'],
      James: ['Jim', 'Jimmy'],
      Jeffrey: ['Jeff'],
      John: ['Johnny'],
      Joseph: ['Joe'],
      Katherine: ['Kate', 'Katie'],
      Kenneth: ['Ken'],
      Margaret: ['Maggie', 'Meg'],
      Michael: ['Mike'],
      Nicholas: ['Nick'],
      Patricia: ['Pat', 'Patty'],
      Richard: ['Rick', 'Dick'],
      Robert: ['Bob', 'Bobby'],
      Steven: ['Steve'],
      Theodore: ['Ted'],
      Thomas: ['Tom', 'Tommy'],
      William: ['Bill', 'Billy'],
    };

    const firstName = parts[0];
    if (firstName && commonNicknames[firstName]) {
      commonNicknames[firstName].forEach((nickname: string) => {
        variants.push(`${nickname} ${parts[parts.length - 1]}`);
      });
    }
  }

  return [...new Set(variants)]; // Remove duplicates
}

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
    // Check enhanced mappings first
    if (hasEnhancedWikipediaMapping(bioguideId)) {
      return getEnhancedWikipediaPageName(bioguideId);
    }

    // Check legacy mapping as fallback
    if (BIOGUIDE_TO_WIKIPEDIA[bioguideId]) {
      return BIOGUIDE_TO_WIKIPEDIA[bioguideId];
    }

    const nameVariants = normalizeNameForSearch(representativeName);

    // Try different search strategies for each name variant
    for (const nameVariant of nameVariants) {
      const searchStrategies = [
        // Direct Wikipedia page format
        nameVariant.replace(/\s+/g, '_'),

        // Quoted searches with context
        `"${nameVariant}"`,
        `"${nameVariant}" United States`,
        `"${nameVariant}" Congress`,
        `"${nameVariant}" Senator`,
        `"${nameVariant}" Representative`,
        `"${nameVariant}" politician`,

        // Unquoted searches
        `${nameVariant} United States Congress`,
        `${nameVariant} US Senator`,
        `${nameVariant} US Representative`,
        `${nameVariant} politician American`,
      ];

      for (const searchQuery of searchStrategies) {
        try {
          // First try direct page access
          if (searchQuery.includes('_') && !searchQuery.includes('"')) {
            const directUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(searchQuery)}`;
            const directResponse = await fetch(directUrl, {
              headers: {
                Accept: 'application/json',
                'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
              },
            });

            if (directResponse.ok) {
              const directResult = await directResponse.json();
              if (directResult.title && !directResult.title.includes('may refer to')) {
                // Cache the mapping
                BIOGUIDE_TO_WIKIPEDIA[bioguideId] = searchQuery;
                return searchQuery;
              }
            }
          }

          // Try search API
          const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/search/${encodeURIComponent(searchQuery)}`;
          const response = await fetch(searchUrl, {
            headers: {
              Accept: 'application/json',
              'User-Agent': 'CivicIntelHub/1.0 (https://civ.iq) Government Data Portal',
            },
          });

          if (!response.ok) continue;

          const searchResults = await response.json();
          if (!searchResults.pages?.length) continue;

          // Score and rank results
          const scoredResults = searchResults.pages.map((page: WikipediaSearchPage) => {
            const title = page.title?.toLowerCase() || '';
            const excerpt = page.excerpt?.toLowerCase() || '';
            const description = page.description?.toLowerCase() || '';
            const nameL = nameVariant.toLowerCase();

            let score = 0;

            // Exact title match gets highest score
            if (title === nameL) score += 100;

            // Name components in title
            const nameWords = nameL.split(' ');
            const titleWords = title.split(' ');
            const matchingWords = nameWords.filter(word => titleWords.includes(word));
            score += (matchingWords.length / nameWords.length) * 50;

            // Political keywords boost score
            const politicalKeywords = [
              'senator',
              'representative',
              'congress',
              'politician',
              'house',
              'senate',
            ];
            politicalKeywords.forEach(keyword => {
              if (
                title.includes(keyword) ||
                excerpt.includes(keyword) ||
                description.includes(keyword)
              ) {
                score += 20;
              }
            });

            // Exact name in excerpt or description
            if (excerpt.includes(nameL) || description.includes(nameL)) {
              score += 15;
            }

            // Avoid disambiguation pages
            if (title.includes('disambiguation') || title.includes('may refer to')) {
              score -= 30;
            }

            return { page, score };
          });

          // Sort by score and get best match
          scoredResults.sort((a: { score: number }, b: { score: number }) => b.score - a.score);
          const bestMatch = scoredResults[0];

          if (bestMatch && bestMatch.score > 30) {
            // Cache the mapping
            BIOGUIDE_TO_WIKIPEDIA[bioguideId] = bestMatch.page.key;
            return bestMatch.page.key;
          }
        } catch {
          // Continue to next search strategy
          continue;
        }
      }
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

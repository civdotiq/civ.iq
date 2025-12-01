/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * NewsAPI.org Service
 *
 * Official NewsAPI.org integration for fetching news articles
 * https://newsapi.org/docs
 *
 * Rate Limits:
 * - Free/Developer: 100 requests/day, 1 month history
 * - Business: 250,000 requests/month, 5 years history
 * - Enterprise: Unlimited
 */

import logger from '@/lib/logging/simple-logger';

/**
 * Common nicknames for representatives to improve search results
 * Example: "William Timmons" is often referred to as "Will Timmons"
 */
const REPRESENTATIVE_NICKNAMES: Record<string, string[]> = {
  'William Timmons': ['Will Timmons'],
  'Robert Wittman': ['Rob Wittman'],
  'Christopher Smith': ['Chris Smith'],
  'Michael McCaul': ['Mike McCaul'],
  'Michael Turner': ['Mike Turner'],
  'Michael Rogers': ['Mike Rogers'],
  'Michael Waltz': ['Mike Waltz'],
  'Robert Aderholt': ['Rob Aderholt'],
  'Richard Hudson': ['Rick Hudson'],
  'Patrick McHenry': ['Pat McHenry'],
  'Thomas Massie': ['Tom Massie'],
  'Gregory Steube': ['Greg Steube'],
  'Charles Fleischmann': ['Chuck Fleischmann'],
  'Andrew Clyde': ['Drew Clyde'],
  'Nicholas Langworthy': ['Nick Langworthy'],
  'Timothy Burchett': ['Tim Burchett'],
  'Donald Beyer': ['Don Beyer'],
  'Gerald Connolly': ['Gerry Connolly'],
  'Joseph Morelle': ['Joe Morelle'],
  'Joseph Courtney': ['Joe Courtney'],
  'David Scott': ['David Scott'],
  'James Clyburn': ['Jim Clyburn'],
  'James McGovern': ['Jim McGovern'],
  'James Himes': ['Jim Himes'],
  'James Costa': ['Jim Costa'],
  'Bradley Schneider': ['Brad Schneider'],
  'Edward Markey': ['Ed Markey'],
  'Bernard Sanders': ['Bernie Sanders'],
  'Catherine Cortez Masto': ['Catherine Masto'],
  'Margaret Hassan': ['Maggie Hassan'],
  'Angus King': ['Angus King Jr.'],
  'Christopher Murphy': ['Chris Murphy'],
  'Christopher Coons': ['Chris Coons'],
};

/**
 * NewsAPI Article Response Interface
 * Based on official NewsAPI.org response structure
 */
export interface NewsAPIArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string; // ISO 8601 format
  content: string | null;
}

/**
 * NewsAPI Response Interface
 */
export interface NewsAPIResponse {
  status: 'ok' | 'error';
  totalResults: number;
  articles: NewsAPIArticle[];
  code?: string; // Error code
  message?: string; // Error message
}

/**
 * NewsAPI Query Options
 */
export interface NewsAPIOptions {
  /** Search query (max 500 chars, supports AND/OR/NOT operators) */
  q?: string;
  /** Search in specific fields: title, description, content */
  searchIn?: 'title' | 'description' | 'content' | 'title,description' | 'title,content';
  /** Comma-separated source IDs (max 20) */
  sources?: string;
  /** Comma-separated domains to restrict search */
  domains?: string;
  /** Comma-separated domains to exclude */
  excludeDomains?: string;
  /** Start date (ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS) */
  from?: string;
  /** End date (ISO 8601: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS) */
  to?: string;
  /** Language code (en, es, fr, de, it, etc.) */
  language?: string;
  /** Sort by: relevancy, popularity, publishedAt */
  sortBy?: 'relevancy' | 'popularity' | 'publishedAt';
  /** Results per page (max 100) */
  pageSize?: number;
  /** Page number for pagination */
  page?: number;
}

/**
 * Normalized article interface matching our internal structure
 */
export interface NormalizedNewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
  author?: string;
}

/**
 * Fetch news from NewsAPI.org /everything endpoint
 *
 * @param options - Query parameters for NewsAPI
 * @returns Promise<NewsAPIResponse>
 * @throws Error if API key is missing or request fails
 */
export async function fetchNewsAPI(options: NewsAPIOptions): Promise<NewsAPIResponse> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    throw new Error('NEWSAPI_KEY environment variable is not set');
  }

  // Build query parameters
  const params = new URLSearchParams();

  if (options.q) params.append('q', options.q);
  if (options.searchIn) params.append('searchIn', options.searchIn);
  if (options.sources) params.append('sources', options.sources);
  if (options.domains) params.append('domains', options.domains);
  if (options.excludeDomains) params.append('excludeDomains', options.excludeDomains);
  if (options.from) params.append('from', options.from);
  if (options.to) params.append('to', options.to);
  if (options.language) params.append('language', options.language);
  if (options.sortBy) params.append('sortBy', options.sortBy);
  if (options.pageSize) params.append('pageSize', options.pageSize.toString());
  if (options.page) params.append('page', options.page.toString());

  const url = `https://newsapi.org/v2/everything?${params.toString()}`;

  logger.info('Fetching from NewsAPI.org', {
    query: options.q?.substring(0, 100),
    pageSize: options.pageSize,
    sortBy: options.sortBy,
    operation: 'newsapi_fetch',
  });

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (fail fast)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Api-Key': apiKey,
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data: NewsAPIResponse = await response.json();

    if (!response.ok) {
      logger.error('NewsAPI request failed', new Error(data.message || 'Unknown error'), {
        status: response.status,
        code: data.code,
        message: data.message,
        operation: 'newsapi_error',
      });
      throw new Error(data.message || `NewsAPI error: ${response.status}`);
    }

    if (data.status === 'error') {
      throw new Error(data.message || 'NewsAPI returned error status');
    }

    logger.info('NewsAPI fetch successful', {
      totalResults: data.totalResults,
      articlesReturned: data.articles.length,
      operation: 'newsapi_success',
    });

    return data;
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('NewsAPI request timeout after 5 seconds');
      }
      throw error;
    }
    throw new Error('Unknown error fetching from NewsAPI');
  }
}

/**
 * Fetch news for a representative using NewsAPI.org
 *
 * @param name - Representative's full name
 * @param state - State abbreviation (optional)
 * @param chamber - House or Senate (optional)
 * @param options - Additional NewsAPI options
 * @returns Promise<NormalizedNewsArticle[]>
 */
export async function fetchRepresentativeNewsAPI(
  name: string,
  state?: string,
  chamber?: 'House' | 'Senate',
  options: Partial<NewsAPIOptions> = {}
): Promise<NormalizedNewsArticle[]> {
  try {
    // Build simple, targeted search query
    // Extract last name for simpler queries
    const nameParts = name.split(' ').filter(part => part.length > 0);
    const lastName = nameParts[nameParts.length - 1] || name;
    const firstName = nameParts[0] || '';

    // Get nicknames for this representative
    const nicknames = REPRESENTATIVE_NICKNAMES[name] || [];

    // Use the simplest query that will work with NewsAPI
    // For prominent politicians, use full name first for better coverage
    let combinedQuery: string;

    // For well-known politicians (2-word names), try full name first
    if (nameParts.length === 2 && firstName && lastName) {
      combinedQuery = `"${firstName} ${lastName}"`;
    } else if (nicknames.length > 0 && chamber) {
      // If nickname exists, use it with title (e.g., "Rep. Will Timmons")
      const nickname = nicknames[0];
      const title = chamber === 'House' ? 'Rep.' : 'Senator';
      combinedQuery = `"${title} ${nickname}"`;
    } else if (chamber) {
      // Use last name with title (e.g., "Rep. Timmons")
      const title = chamber === 'House' ? 'Rep.' : 'Senator';
      combinedQuery = `"${title} ${lastName}"`;
    } else {
      // Fallback to last name with state
      combinedQuery = state ? `"${lastName}" AND ${state}` : `"${lastName}"`;
    }

    // Calculate date range (last 30 days for better relevance)
    const to = new Date().toISOString().split('T')[0]; // Today
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 30 days ago

    logger.info('Fetching representative news from NewsAPI', {
      name,
      state,
      chamber,
      query: combinedQuery.substring(0, 150),
      from,
      to,
    });

    // Fetch from NewsAPI
    const response = await fetchNewsAPI({
      q: combinedQuery,
      language: 'en',
      sortBy: 'publishedAt',
      pageSize: options.pageSize || 50, // Fetch more for better filtering
      from,
      to,
      ...options,
    });

    // Filter and normalize articles
    const normalizedArticles: NormalizedNewsArticle[] = response.articles
      .filter(article => {
        // Quality filters only - trust NewsAPI's relevance algorithm
        if (!article.title || article.title.includes('[Removed]')) return false;
        if (!article.url || article.url.includes('removed')) return false;
        if (article.title.length < 10 || article.title.length > 300) return false;

        return true;
      })
      .map(article => normalizeNewsAPIArticle(article));

    logger.info('NewsAPI articles filtered and normalized', {
      name,
      totalResults: response.totalResults,
      articlesReturned: response.articles.length,
      afterFiltering: normalizedArticles.length,
      operation: 'newsapi_representative_fetch',
    });

    return normalizedArticles;
  } catch (error) {
    logger.error('Failed to fetch representative news from NewsAPI', error as Error, {
      name,
      state,
      chamber,
      operation: 'newsapi_representative_error',
    });
    throw error;
  }
}

/**
 * Normalize NewsAPI article to our internal structure
 *
 * @param article - NewsAPI article
 * @returns NormalizedNewsArticle
 */
export function normalizeNewsAPIArticle(article: NewsAPIArticle): NormalizedNewsArticle {
  let domain = 'Unknown';
  try {
    const url = new URL(article.url);
    domain = url.hostname.replace(/^www\./, '');
  } catch {
    // Keep default "Unknown"
  }

  return {
    title: article.title,
    url: article.url,
    source: article.source.name,
    publishedDate: article.publishedAt,
    language: 'English',
    summary: article.description || undefined,
    imageUrl: article.urlToImage || undefined,
    domain,
    author: article.author || undefined,
  };
}

/**
 * Search news by topic/keywords using NewsAPI
 *
 * @param query - Search query
 * @param options - Additional NewsAPI options
 * @returns Promise<NormalizedNewsArticle[]>
 */
export async function searchNewsAPI(
  query: string,
  options: Partial<NewsAPIOptions> = {}
): Promise<NormalizedNewsArticle[]> {
  try {
    const response = await fetchNewsAPI({
      q: query,
      language: 'en',
      sortBy: 'relevancy',
      pageSize: 20,
      ...options,
    });

    const normalizedArticles = response.articles
      .filter(article => article.title && article.url && !article.title.includes('[Removed]'))
      .map(article => normalizeNewsAPIArticle(article));

    return normalizedArticles;
  } catch (error) {
    logger.error('NewsAPI search failed', error as Error, {
      query,
      operation: 'newsapi_search_error',
    });
    throw error;
  }
}

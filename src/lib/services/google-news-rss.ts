/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Google News RSS Feed Service
 *
 * Fetches news articles from Google News RSS feeds for representatives
 * Google News RSS URL format: https://news.google.com/rss/search?q={query}
 */

import logger from '@/lib/logging/simple-logger';

export interface GoogleNewsArticle {
  title: string;
  url: string;
  domain: string;
  seendate: string;
  socialimage?: string | null;
  description?: string;
  source: string;
}

interface GoogleNewsRSSOptions {
  limit?: number;
  language?: string;
  country?: string;
}

/**
 * Fetch news from Google News RSS feed
 */
export async function fetchGoogleNewsRSS(
  query: string,
  options: GoogleNewsRSSOptions = {}
): Promise<GoogleNewsArticle[]> {
  const { limit = 15, language = 'en', country = 'US' } = options;

  try {
    // Encode query for URL
    const encodedQuery = encodeURIComponent(query);

    // Google News RSS URL with language and region parameters
    const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${language}&gl=${country}&ceid=${country}:${language}`;

    logger.info('Fetching Google News RSS', {
      query,
      rssUrl: rssUrl.substring(0, 100),
      limit,
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'CivIQ-Hub/1.0 (civic-engagement-tool)',
        Accept: 'application/rss+xml, application/xml, text/xml',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();
    const articles = parseGoogleNewsRSS(xmlText, limit);

    logger.info('Google News RSS fetched successfully', {
      query,
      articlesFound: articles.length,
    });

    return articles;
  } catch (error) {
    logger.error('Failed to fetch Google News RSS', error as Error, {
      query,
      operation: 'google_news_rss_fetch',
    });
    return [];
  }
}

/**
 * Parse Google News RSS XML
 */
function parseGoogleNewsRSS(xmlText: string, limit: number): GoogleNewsArticle[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'application/xml');

    // Check for parsing errors
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      throw new Error('XML parsing error');
    }

    const items = Array.from(doc.querySelectorAll('item'));
    const articles: GoogleNewsArticle[] = [];

    for (const item of items.slice(0, limit)) {
      const title = item.querySelector('title')?.textContent?.trim();
      const link = item.querySelector('link')?.textContent?.trim();
      const pubDate = item.querySelector('pubDate')?.textContent?.trim();
      const description = item.querySelector('description')?.textContent?.trim();
      const source = item.querySelector('source')?.textContent?.trim();

      if (!title || !link) continue;

      // Extract domain from URL
      let domain = 'Unknown';
      try {
        const url = new URL(link);
        domain = url.hostname.replace(/^www\./, '');
      } catch {
        // Keep default "Unknown"
      }

      // Parse and normalize date
      let normalizedDate = new Date().toISOString();
      if (pubDate) {
        try {
          const parsedDate = new Date(pubDate);
          if (!isNaN(parsedDate.getTime())) {
            normalizedDate = parsedDate.toISOString();
          }
        } catch {
          // Keep default current date
        }
      }

      articles.push({
        title: cleanText(title),
        url: link,
        domain,
        seendate: normalizedDate,
        description: description ? cleanText(description) : undefined,
        source: source || domain,
        socialimage: null, // Google News RSS doesn't provide images
      });
    }

    return articles;
  } catch (error) {
    logger.error('Failed to parse Google News RSS XML', error as Error);
    return [];
  }
}

/**
 * Clean text by removing HTML tags and normalizing whitespace
 */
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/&quot;/g, '"')
    .replace(/'/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

/**
 * Build search query for representative
 */
export function buildRepresentativeQuery(
  name: string,
  state?: string,
  chamber?: 'House' | 'Senate'
): string {
  let query = `"${name}"`;

  // Add title for better precision
  if (chamber === 'Senate') {
    query = `Senator ${query}`;
  } else if (chamber === 'House') {
    query = `Representative ${query}`;
  }

  // Add state context if available
  if (state) {
    query += ` ${state}`;
  }

  return query;
}

/**
 * Fetch news for a representative with multiple search strategies
 */
export async function fetchRepresentativeGoogleNews(
  name: string,
  state?: string,
  chamber?: 'House' | 'Senate',
  options: GoogleNewsRSSOptions = {}
): Promise<GoogleNewsArticle[]> {
  const { limit = 15 } = options;

  // Strategy 1: Full name with title and state
  const query1 = buildRepresentativeQuery(name, state, chamber);

  // Strategy 2: Full name in quotes with state
  const query2 = `"${name}" ${state || ''}`.trim();

  // Strategy 3: Last name with title (for common names)
  const lastName = name.split(' ').pop() || name;
  const query3 = chamber === 'Senate' ? `Senator ${lastName}` : `Representative ${lastName}`;

  logger.info('Fetching representative news with multiple strategies', {
    name,
    state,
    chamber,
    queries: [query1, query2, query3],
  });

  // Fetch from all strategies in parallel
  const results = await Promise.allSettled([
    fetchGoogleNewsRSS(query1, { ...options, limit: Math.ceil(limit / 2) }),
    fetchGoogleNewsRSS(query2, { ...options, limit: Math.ceil(limit / 3) }),
    fetchGoogleNewsRSS(query3, { ...options, limit: Math.ceil(limit / 3) }),
  ]);

  // Combine results
  const allArticles: GoogleNewsArticle[] = [];
  results.forEach(result => {
    if (result.status === 'fulfilled') {
      allArticles.push(...result.value);
    }
  });

  // Deduplicate by URL
  const uniqueArticles = deduplicateArticles(allArticles);

  // Sort by date (newest first) and limit
  return uniqueArticles
    .sort((a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime())
    .slice(0, limit);
}

/**
 * Deduplicate articles by URL and title similarity
 */
function deduplicateArticles(articles: GoogleNewsArticle[]): GoogleNewsArticle[] {
  const seen = new Set<string>();
  const unique: GoogleNewsArticle[] = [];

  for (const article of articles) {
    // Create a unique key based on URL
    const urlKey = article.url.toLowerCase();

    if (!seen.has(urlKey)) {
      seen.add(urlKey);
      unique.push(article);
    }
  }

  return unique;
}

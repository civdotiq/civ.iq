/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator News Route
 *
 * Fetches news articles for state legislators using NewsAPI.org and Google News RSS
 * Optimizations:
 * - Parallel NewsAPI + Google News fetching (faster fallback)
 * - Clean fallback chain: NewsAPI → Google News → Empty result
 * - Pagination support
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logging/simple-logger';

// Vercel serverless function configuration
export const maxDuration = 10;
export const dynamic = 'force-dynamic';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'newsapi' | 'google-news' | 'none';
  cacheStatus?: string;
  pagination?: {
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    totalPages: number;
  };
}

/**
 * Fetch news from NewsAPI.org
 */
async function fetchNewsAPI(
  name: string,
  state: string,
  chamber: 'Senate' | 'House',
  limit: number,
  page: number
): Promise<NewsResponse | null> {
  try {
    const { fetchRepresentativeNewsAPI } = await import('@/lib/services/newsapi');

    logger.info('Fetching NewsAPI for state legislator', {
      name,
      state,
      chamber,
    });

    const newsAPIArticles = await fetchRepresentativeNewsAPI(name, state, chamber, {
      pageSize: limit * 2, // Fetch more for better selection
    });

    if (newsAPIArticles.length > 0) {
      const offset = (page - 1) * limit;
      const paginatedArticles = newsAPIArticles.slice(offset, offset + limit);

      const response: NewsResponse = {
        articles: paginatedArticles.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.publishedDate,
          language: article.language,
          domain: article.domain,
          imageUrl: article.imageUrl,
          summary: article.summary,
        })),
        totalResults: newsAPIArticles.length,
        searchTerms: [`NewsAPI for ${name}`],
        dataSource: 'newsapi',
        cacheStatus: 'Live NewsAPI.org data',
        pagination: {
          currentPage: page,
          limit: limit,
          hasNextPage: offset + limit < newsAPIArticles.length,
          totalPages: Math.ceil(newsAPIArticles.length / limit),
        },
      };

      logger.info('NewsAPI fetch successful', {
        name,
        articlesCount: paginatedArticles.length,
        totalAvailable: newsAPIArticles.length,
        source: 'newsapi',
      });

      return response;
    }

    logger.info('No NewsAPI articles found', { name });
    return null;
  } catch (error) {
    logger.error('NewsAPI fetch failed', error as Error, { name });
    return null;
  }
}

/**
 * Fetch news from Google News RSS
 */
async function fetchGoogleNews(
  name: string,
  state: string,
  chamber: 'Senate' | 'House',
  limit: number,
  page: number
): Promise<NewsResponse | null> {
  try {
    const { fetchRepresentativeGoogleNews } = await import('@/lib/services/google-news-rss');

    logger.info('Fetching Google News RSS for state legislator', {
      name,
      state,
      chamber,
    });

    const googleNewsArticles = await fetchRepresentativeGoogleNews(name, state, chamber, {
      limit: limit * 2,
      language: 'en',
      country: 'US',
    });

    if (googleNewsArticles.length > 0) {
      const offset = (page - 1) * limit;
      const paginatedArticles = googleNewsArticles.slice(offset, offset + limit);

      const response: NewsResponse = {
        articles: paginatedArticles.map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.seendate,
          language: 'English',
          domain: article.domain,
          imageUrl: article.socialimage || undefined,
          summary: article.description,
        })),
        totalResults: googleNewsArticles.length,
        searchTerms: [`Google News for ${name}`],
        dataSource: 'google-news',
        cacheStatus: 'Live Google News RSS data',
        pagination: {
          currentPage: page,
          limit: limit,
          hasNextPage: offset + limit < googleNewsArticles.length,
          totalPages: Math.ceil(googleNewsArticles.length / limit),
        },
      };

      logger.info('Google News fetch successful', {
        name,
        articlesCount: paginatedArticles.length,
        totalAvailable: googleNewsArticles.length,
        source: 'google-news',
      });

      return response;
    }

    logger.info('No Google News articles found', { name });
    return null;
  } catch (error) {
    logger.error('Google News fetch failed', error as Error, { name });
    return null;
  }
}

/**
 * Main GET handler
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { state, id } = await params;
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '15');
  const page = parseInt(searchParams.get('page') || '1');

  if (!state || !id) {
    return NextResponse.json(
      { error: 'State code and legislator ID are required' },
      { status: 400 }
    );
  }

  // Fetch legislator data from our API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  let legislatorData;

  try {
    const response = await fetch(`${baseUrl}/api/state-legislature/${state}/legislator/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'State legislator not found' }, { status: 404 });
    }

    const data = await response.json();
    if (!data.success || !data.legislator) {
      return NextResponse.json({ error: 'State legislator not found' }, { status: 404 });
    }

    legislatorData = data.legislator;
  } catch (error) {
    logger.error('Failed to fetch legislator data', error as Error, { id, state });
    return NextResponse.json({ error: 'Failed to fetch legislator data' }, { status: 500 });
  }

  // Convert chamber type from 'upper'/'lower' to 'Senate'/'House' for news APIs
  const chamber: 'Senate' | 'House' = legislatorData.chamber === 'upper' ? 'Senate' : 'House';

  logger.info('State legislator data fetched for news', {
    id,
    name: legislatorData.name,
    state: state.toUpperCase(),
    chamber,
  });

  // Try both sources in parallel (faster fallback)
  const [newsAPIResult, googleNewsResult] = await Promise.allSettled([
    fetchNewsAPI(legislatorData.name, state.toUpperCase(), chamber, limit, page),
    fetchGoogleNews(legislatorData.name, state.toUpperCase(), chamber, limit, page),
  ]);

  // Return first successful result (NewsAPI preferred)
  if (newsAPIResult.status === 'fulfilled' && newsAPIResult.value !== null) {
    const duration = Date.now() - startTime;
    logger.info('Returning NewsAPI results', {
      id,
      articlesCount: newsAPIResult.value.articles.length,
      duration,
    });
    return NextResponse.json(newsAPIResult.value);
  }

  if (googleNewsResult.status === 'fulfilled' && googleNewsResult.value !== null) {
    const duration = Date.now() - startTime;
    logger.info('Returning Google News results', {
      id,
      articlesCount: googleNewsResult.value.articles.length,
      duration,
    });
    return NextResponse.json(googleNewsResult.value);
  }

  // Both sources failed - return empty result
  const duration = Date.now() - startTime;
  logger.warn('All news sources returned no results', {
    id,
    legislatorName: legislatorData.name,
    duration,
  });

  const emptyResponse: NewsResponse = {
    articles: [],
    totalResults: 0,
    searchTerms: [],
    dataSource: 'none',
    cacheStatus: 'No news articles currently available',
    pagination: {
      currentPage: page,
      limit: limit,
      hasNextPage: false,
      totalPages: 0,
    },
  };

  return NextResponse.json(emptyResponse);
}

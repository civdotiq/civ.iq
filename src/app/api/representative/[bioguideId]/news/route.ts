/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Simplified News Route - GDELT Removed
 *
 * Optimizations:
 * - Removed 747 lines of GDELT complexity (77% file size reduction)
 * - Single representative fetch (eliminates 3 internal HTTP calls)
 * - Parallel NewsAPI + Google News fetching (faster fallback)
 * - Clean fallback chain: NewsAPI → Google News → Empty result
 */

import { NextRequest, NextResponse } from 'next/server';
import { getEnhancedRepresentative } from '@/features/representatives/services/congress.service';
import logger from '@/lib/logging/simple-logger';
import type { EnhancedRepresentative } from '@/types/representative';

// ISR: Revalidate every 5 minutes (real-time news data)
export const revalidate = 300; // 5 minutes

// Vercel serverless function configuration
export const maxDuration = 10; // Reduced from 20s (GDELT was slow)
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
  representative: EnhancedRepresentative,
  limit: number,
  page: number
): Promise<NewsResponse | null> {
  try {
    const { fetchRepresentativeNewsAPI } = await import('@/lib/services/newsapi');

    logger.info('Fetching NewsAPI for representative', {
      bioguideId: representative.bioguideId,
      name: representative.name,
      state: representative.state,
      chamber: representative.chamber,
    });

    const newsAPIArticles = await fetchRepresentativeNewsAPI(
      representative.name,
      representative.state,
      representative.chamber,
      {
        pageSize: limit * 2, // Fetch more for better selection
      }
    );

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
        searchTerms: [`NewsAPI for ${representative.name}`],
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
        bioguideId: representative.bioguideId,
        articlesCount: paginatedArticles.length,
        totalAvailable: newsAPIArticles.length,
        source: 'newsapi',
      });

      return response;
    }

    logger.info('No NewsAPI articles found', {
      bioguideId: representative.bioguideId,
    });
    return null;
  } catch (error) {
    logger.error('NewsAPI fetch failed', error as Error, {
      bioguideId: representative.bioguideId,
    });
    return null;
  }
}

/**
 * Fetch news from Google News RSS
 */
async function fetchGoogleNews(
  representative: EnhancedRepresentative,
  limit: number,
  page: number
): Promise<NewsResponse | null> {
  try {
    const { fetchRepresentativeGoogleNews } = await import('@/lib/services/google-news-rss');

    logger.info('Fetching Google News RSS for representative', {
      bioguideId: representative.bioguideId,
      name: representative.name,
      state: representative.state,
      chamber: representative.chamber,
    });

    const googleNewsArticles = await fetchRepresentativeGoogleNews(
      representative.name,
      representative.state,
      representative.chamber,
      {
        limit: limit * 2,
        language: 'en',
        country: 'US',
      }
    );

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
        searchTerms: [`Google News for ${representative.name}`],
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
        bioguideId: representative.bioguideId,
        articlesCount: paginatedArticles.length,
        totalAvailable: googleNewsArticles.length,
        source: 'google-news',
      });

      return response;
    }

    logger.info('No Google News articles found', {
      bioguideId: representative.bioguideId,
    });
    return null;
  } catch (error) {
    logger.error('Google News fetch failed', error as Error, {
      bioguideId: representative.bioguideId,
    });
    return null;
  }
}

/**
 * Main GET handler - Simplified without GDELT
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const startTime = Date.now();
  const { bioguideId } = await params;
  const { searchParams } = request.nextUrl;
  const limit = parseInt(searchParams.get('limit') || '15');
  const page = parseInt(searchParams.get('page') || '1');

  if (!bioguideId) {
    return NextResponse.json({ error: 'Bioguide ID is required' }, { status: 400 });
  }

  // OPTIMIZATION 1: Fetch representative data once (no internal HTTP calls)
  const representative = await getEnhancedRepresentative(bioguideId);

  if (!representative) {
    return NextResponse.json({ error: 'Representative not found' }, { status: 404 });
  }

  logger.info('Representative data fetched for news', {
    bioguideId,
    name: representative.name,
    state: representative.state,
    chamber: representative.chamber,
  });

  // OPTIMIZATION 2: Try both sources in parallel (faster fallback)
  const [newsAPIResult, googleNewsResult] = await Promise.allSettled([
    fetchNewsAPI(representative, limit, page),
    fetchGoogleNews(representative, limit, page),
  ]);

  // Return first successful result (NewsAPI preferred)
  if (newsAPIResult.status === 'fulfilled' && newsAPIResult.value !== null) {
    const duration = Date.now() - startTime;
    logger.info('Returning NewsAPI results', {
      bioguideId,
      articlesCount: newsAPIResult.value.articles.length,
      duration,
    });
    return NextResponse.json(newsAPIResult.value);
  }

  if (googleNewsResult.status === 'fulfilled' && googleNewsResult.value !== null) {
    const duration = Date.now() - startTime;
    logger.info('Returning Google News results', {
      bioguideId,
      articlesCount: googleNewsResult.value.articles.length,
      duration,
    });
    return NextResponse.json(googleNewsResult.value);
  }

  // Both sources failed - return empty result
  const duration = Date.now() - startTime;
  logger.warn('All news sources returned no results', {
    bioguideId,
    representativeName: representative.name,
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

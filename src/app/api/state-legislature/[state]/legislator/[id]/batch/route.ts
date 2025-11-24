/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * State Legislator Batch API
 *
 * GET /api/state-legislature/[state]/legislator/[id]/batch
 * Returns legislator profile, bills, and news in a single request.
 *
 * Performance Benefits:
 * - Reduces 3 HTTP round trips to 1
 * - Parallel server-side execution of all data fetches
 * - Better error handling with partial success
 * - Reduced latency for initial page load
 *
 * Query Parameters:
 * - billsLimit: Number of bills to return (default: 20)
 * - newsLimit: Number of news articles to return (default: 15)
 * - session: Legislative session for bills (default: current)
 */

import { NextRequest, NextResponse } from 'next/server';
import { StateLegislatureCoreService } from '@/services/core/state-legislature-core.service';
import type { EnhancedStateLegislator, StateBill } from '@/types/state-legislature';
import logger from '@/lib/logging/simple-logger';
import { decodeBase64Url } from '@/lib/url-encoding';
import { getElectionAwareRevalidation } from '@/lib/election-aware-isr';

// ISR: Election-aware revalidation (3 days Oct-Dec, 30 days Jan-Sep)
export const revalidate = getElectionAwareRevalidation();

export const maxDuration = 15; // Increased for parallel operations

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
  dataSource: 'newsapi' | 'google-news' | 'none';
}

interface StateLegislatorBatchResponse {
  success: boolean;
  legislator: EnhancedStateLegislator | null;
  bills: {
    items: StateBill[];
    total: number;
  };
  news: {
    articles: NewsArticle[];
    total: number;
    dataSource: 'newsapi' | 'google-news' | 'none';
  };
  errors: {
    legislator?: string;
    bills?: string;
    news?: string;
  };
  responseTime: number;
}

/**
 * Fetch news from NewsAPI.org
 */
async function fetchNewsAPI(
  name: string,
  state: string,
  chamber: 'Senate' | 'House',
  limit: number
): Promise<NewsResponse | null> {
  try {
    const { fetchRepresentativeNewsAPI } = await import('@/lib/services/newsapi');
    const articles = await fetchRepresentativeNewsAPI(name, state, chamber, {
      pageSize: limit * 2,
    });

    if (articles.length > 0) {
      return {
        articles: articles.slice(0, limit).map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.publishedDate,
          language: article.language,
          domain: article.domain,
          imageUrl: article.imageUrl,
          summary: article.summary,
        })),
        totalResults: articles.length,
        dataSource: 'newsapi',
      };
    }
    return null;
  } catch (error) {
    logger.error('NewsAPI fetch failed in batch', error as Error, { name });
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
  limit: number
): Promise<NewsResponse | null> {
  try {
    const { fetchRepresentativeGoogleNews } = await import('@/lib/services/google-news-rss');
    const articles = await fetchRepresentativeGoogleNews(name, state, chamber, {
      limit: limit * 2,
      language: 'en',
      country: 'US',
    });

    if (articles.length > 0) {
      return {
        articles: articles.slice(0, limit).map(article => ({
          title: article.title,
          url: article.url,
          source: article.source,
          publishedDate: article.seendate,
          language: 'English',
          domain: article.domain,
          imageUrl: article.socialimage || undefined,
          summary: article.description,
        })),
        totalResults: articles.length,
        dataSource: 'google-news',
      };
    }
    return null;
  } catch (error) {
    logger.error('Google News fetch failed in batch', error as Error, { name });
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ state: string; id: string }> }
) {
  const startTime = Date.now();
  const { searchParams } = request.nextUrl;

  try {
    const { state, id } = await params;
    const legislatorId = decodeBase64Url(id);

    // Parse query parameters
    const billsLimit = parseInt(searchParams.get('billsLimit') || '20', 10);
    const newsLimit = parseInt(searchParams.get('newsLimit') || '15', 10);
    const session = searchParams.get('session') || undefined;

    if (!state || !legislatorId) {
      logger.warn('State legislator batch API request missing parameters', {
        state,
        id: legislatorId,
      });
      return NextResponse.json(
        {
          success: false,
          errors: { legislator: 'State and legislator ID are required' },
        } as Partial<StateLegislatorBatchResponse>,
        { status: 400 }
      );
    }

    logger.info('Fetching state legislator batch data', {
      state: state.toUpperCase(),
      legislatorId,
      billsLimit,
      newsLimit,
      session,
    });

    // Fetch legislator and bills in parallel
    // Note: News requires legislator name, so we fetch it separately after
    const [legislatorResult, billsResult] = await Promise.allSettled([
      // 1. Fetch legislator profile
      StateLegislatureCoreService.getStateLegislatorById(state.toUpperCase(), legislatorId),

      // 2. Fetch bills
      StateLegislatureCoreService.getStateLegislatorBills(
        state.toUpperCase(),
        legislatorId,
        session,
        billsLimit
      ),
    ]);

    // Process legislator result
    let legislator: EnhancedStateLegislator | null = null;
    const errors: StateLegislatorBatchResponse['errors'] = {};

    if (legislatorResult.status === 'fulfilled' && legislatorResult.value) {
      legislator = legislatorResult.value;
    } else {
      const error =
        legislatorResult.status === 'rejected'
          ? legislatorResult.reason instanceof Error
            ? legislatorResult.reason.message
            : 'Unknown error'
          : 'Legislator not found';
      errors.legislator = error;
      logger.error('Legislator fetch failed in batch', new Error(error), {
        state: state.toUpperCase(),
        legislatorId,
      });
    }

    // Process bills result
    let bills: StateBill[] = [];
    if (billsResult.status === 'fulfilled') {
      bills = billsResult.value;
    } else {
      const error =
        billsResult.reason instanceof Error ? billsResult.reason.message : 'Unknown error';
      errors.bills = error;
      logger.error('Bills fetch failed in batch', new Error(error), {
        state: state.toUpperCase(),
        legislatorId,
      });
    }

    // Fetch news if we have legislator data
    let newsResult: NewsResponse = {
      articles: [],
      totalResults: 0,
      dataSource: 'none',
    };

    if (legislator) {
      const chamber: 'Senate' | 'House' = legislator.chamber === 'upper' ? 'Senate' : 'House';

      // Fetch news sources in parallel
      const [newsAPIData, googleNewsData] = await Promise.allSettled([
        fetchNewsAPI(legislator.name, state.toUpperCase(), chamber, newsLimit),
        fetchGoogleNews(legislator.name, state.toUpperCase(), chamber, newsLimit),
      ]);

      // Use first successful result (NewsAPI preferred)
      if (newsAPIData.status === 'fulfilled' && newsAPIData.value) {
        newsResult = newsAPIData.value;
      } else if (googleNewsData.status === 'fulfilled' && googleNewsData.value) {
        newsResult = googleNewsData.value;
      } else {
        errors.news = 'No news sources available';
      }
    } else {
      errors.news = 'Cannot fetch news without legislator data';
    }

    const responseTime = Date.now() - startTime;

    const response: StateLegislatorBatchResponse = {
      success: !!legislator, // Success if we at least got legislator data
      legislator,
      bills: {
        items: bills,
        total: bills.length,
      },
      news: {
        articles: newsResult.articles,
        total: newsResult.totalResults,
        dataSource: newsResult.dataSource,
      },
      errors,
      responseTime,
    };

    logger.info('State legislator batch request completed', {
      state: state.toUpperCase(),
      legislatorId,
      hasLegislator: !!legislator,
      billsCount: bills.length,
      newsCount: newsResult.articles.length,
      newsSource: newsResult.dataSource,
      responseTime,
    });

    // Determine status code based on success
    const statusCode = legislator ? 200 : errors.legislator ? 404 : 500;

    return NextResponse.json(response, {
      status: statusCode,
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=900', // 30min cache, 15min stale
        'X-Response-Time': `${responseTime}ms`,
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('State legislator batch request failed', error as Error, {
      responseTime,
    });

    const response: Partial<StateLegislatorBatchResponse> = {
      success: false,
      legislator: null,
      bills: { items: [], total: 0 },
      news: { articles: [], total: 0, dataSource: 'none' },
      errors: {
        legislator: error instanceof Error ? error.message : 'Unknown error',
      },
      responseTime,
    };

    return NextResponse.json(response, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }
}

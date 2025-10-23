/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * News Orchestrator Service
 *
 * Coordinates fetching news from multiple sources (NewsAPI, Google News, GDELT)
 * with parallel execution, circuit breaker pattern, and intelligent fallback.
 *
 * Performance optimizations:
 * - Parallel source fetching (try all sources simultaneously)
 * - Circuit breaker to skip failing sources
 * - No internal HTTP calls (direct service access)
 * - Smart caching and pagination
 */

import type { EnhancedRepresentative } from '@/types/representative';
import logger from '@/lib/logging/simple-logger';

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
  seendate?: string;
  socialimage?: string | null;
  localImpact?: {
    score: number;
    localRelevance: 'high' | 'medium' | 'low';
    factors: string[];
  };
}

export interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource: 'newsapi' | 'gdelt' | 'google-news' | 'fallback';
  cacheStatus?: string;
  pagination?: {
    currentPage: number;
    limit: number;
    hasNextPage: boolean;
    totalPages: number;
  };
}

export interface NewsFetchOptions {
  limit: number;
  page: number;
  enableAdvanced?: boolean;
  includeTelevision?: boolean;
  includeTrending?: boolean;
}

/**
 * Circuit Breaker for external API calls
 * Tracks failure rates and temporarily skips failing services
 */
class CircuitBreaker {
  private failures = new Map<string, number>();
  private lastFailureTime = new Map<string, number>();
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 1 minute

  recordFailure(serviceName: string): void {
    const currentFailures = this.failures.get(serviceName) || 0;
    this.failures.set(serviceName, currentFailures + 1);
    this.lastFailureTime.set(serviceName, Date.now());

    logger.warn('Circuit breaker recorded failure', {
      serviceName,
      failures: currentFailures + 1,
      threshold: this.failureThreshold,
    });
  }

  recordSuccess(serviceName: string): void {
    this.failures.delete(serviceName);
    this.lastFailureTime.delete(serviceName);
  }

  isOpen(serviceName: string): boolean {
    const failures = this.failures.get(serviceName) || 0;
    const lastFailure = this.lastFailureTime.get(serviceName) || 0;
    const timeSinceLastFailure = Date.now() - lastFailure;

    // Reset if enough time has passed
    if (timeSinceLastFailure > this.resetTimeout) {
      this.failures.delete(serviceName);
      this.lastFailureTime.delete(serviceName);
      return false;
    }

    return failures >= this.failureThreshold;
  }

  getStatus(): Record<string, { failures: number; isOpen: boolean }> {
    const status: Record<string, { failures: number; isOpen: boolean }> = {};
    for (const [service, failures] of this.failures.entries()) {
      status[service] = {
        failures,
        isOpen: this.isOpen(service),
      };
    }
    return status;
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

/**
 * Fetch news from NewsAPI.org
 */
async function fetchFromNewsAPI(
  representative: EnhancedRepresentative,
  options: NewsFetchOptions
): Promise<NewsResponse | null> {
  const serviceName = 'newsapi';

  if (circuitBreaker.isOpen(serviceName)) {
    logger.info('Circuit breaker open, skipping NewsAPI', { serviceName });
    return null;
  }

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
        pageSize: options.limit * 2, // Fetch more for better selection
      }
    );

    if (newsAPIArticles.length > 0) {
      // Apply pagination
      const offset = (options.page - 1) * options.limit;
      const paginatedArticles = newsAPIArticles.slice(offset, offset + options.limit);

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
          currentPage: options.page,
          limit: options.limit,
          hasNextPage: offset + options.limit < newsAPIArticles.length,
          totalPages: Math.ceil(newsAPIArticles.length / options.limit),
        },
      };

      circuitBreaker.recordSuccess(serviceName);
      logger.info('NewsAPI fetch successful', {
        bioguideId: representative.bioguideId,
        articlesCount: paginatedArticles.length,
        source: 'newsapi',
      });

      return response;
    }

    return null;
  } catch (error) {
    circuitBreaker.recordFailure(serviceName);
    logger.error('NewsAPI fetch failed', error as Error, {
      bioguideId: representative.bioguideId,
      serviceName,
    });
    return null;
  }
}

/**
 * Fetch news from Google News RSS
 */
async function fetchFromGoogleNews(
  representative: EnhancedRepresentative,
  options: NewsFetchOptions
): Promise<NewsResponse | null> {
  const serviceName = 'google-news';

  if (circuitBreaker.isOpen(serviceName)) {
    logger.info('Circuit breaker open, skipping Google News', { serviceName });
    return null;
  }

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
        limit: options.limit * 2,
        language: 'en',
        country: 'US',
      }
    );

    if (googleNewsArticles.length > 0) {
      const offset = (options.page - 1) * options.limit;
      const paginatedArticles = googleNewsArticles.slice(offset, offset + options.limit);

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
          currentPage: options.page,
          limit: options.limit,
          hasNextPage: offset + options.limit < googleNewsArticles.length,
          totalPages: Math.ceil(googleNewsArticles.length / options.limit),
        },
      };

      circuitBreaker.recordSuccess(serviceName);
      logger.info('Google News fetch successful', {
        bioguideId: representative.bioguideId,
        articlesCount: paginatedArticles.length,
        source: 'google-news',
      });

      return response;
    }

    return null;
  } catch (error) {
    circuitBreaker.recordFailure(serviceName);
    logger.error('Google News fetch failed', error as Error, {
      bioguideId: representative.bioguideId,
      serviceName,
    });
    return null;
  }
}

/**
 * Fetch news from GDELT with full processing pipeline
 * (clustering, deduplication, quality filtering)
 */
async function fetchFromGDELT(
  representative: EnhancedRepresentative,
  options: NewsFetchOptions
): Promise<NewsResponse | null> {
  const serviceName = 'gdelt';

  if (circuitBreaker.isOpen(serviceName)) {
    logger.info('Circuit breaker open, skipping GDELT', { serviceName });
    return null;
  }

  try {
    // Import GDELT-specific functionality
    const { fetchGDELTNews, normalizeGDELTArticle } = await import(
      '@/features/news/services/gdelt-api'
    );

    // This will use the existing complex logic from the original route
    // We'll import it as a complete function to avoid duplication
    const { fetchGDELTNewsForRepresentative } = await import('./gdelt-fetcher');

    const response = await fetchGDELTNewsForRepresentative(representative, options);

    if (response && response.articles.length > 0) {
      circuitBreaker.recordSuccess(serviceName);
      return response;
    }

    return null;
  } catch (error) {
    circuitBreaker.recordFailure(serviceName);
    logger.error('GDELT fetch failed', error as Error, {
      bioguideId: representative.bioguideId,
      serviceName,
    });
    return null;
  }
}

/**
 * Orchestrate news fetching from multiple sources in parallel
 * Returns first successful result (racing pattern)
 */
export async function fetchNewsForRepresentative(
  representative: EnhancedRepresentative,
  options: NewsFetchOptions
): Promise<NewsResponse> {
  const startTime = Date.now();

  logger.info('Starting parallel news fetch', {
    bioguideId: representative.bioguideId,
    name: representative.name,
    options,
    circuitBreakerStatus: circuitBreaker.getStatus(),
  });

  // Try all sources in parallel
  const results = await Promise.allSettled([
    fetchFromNewsAPI(representative, options),
    fetchFromGoogleNews(representative, options),
    fetchFromGDELT(representative, options),
  ]);

  // Find first successful result
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value !== null) {
      const duration = Date.now() - startTime;
      logger.info('News fetch successful', {
        bioguideId: representative.bioguideId,
        dataSource: result.value.dataSource,
        articlesCount: result.value.articles.length,
        duration,
      });
      return result.value;
    }
  }

  // All sources failed, return empty result
  const duration = Date.now() - startTime;
  logger.warn('All news sources failed', {
    bioguideId: representative.bioguideId,
    duration,
    circuitBreakerStatus: circuitBreaker.getStatus(),
  });

  return {
    articles: [],
    totalResults: 0,
    searchTerms: [],
    dataSource: 'fallback',
    cacheStatus: 'No news data available',
    pagination: {
      currentPage: options.page,
      limit: options.limit,
      hasNextPage: false,
      totalPages: 0,
    },
  };
}

/**
 * Get circuit breaker status (for monitoring/debugging)
 */
export function getCircuitBreakerStatus() {
  return circuitBreaker.getStatus();
}

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { BaseService } from './base.service';
import {
  fetchGDELTNewsWithDeduplication,
  generateOptimizedSearchTerms,
  getGDELTRealTimeStream,
  monitorBreakingNews,
  fetchGDELTTrends,
  fetchGDELTRealTimeEvents,
  normalizeGDELTArticle,
  type GDELTEvent,
  type GDELTTrend,
  type GDELTRealTimeStream,
} from '@/features/news/services/gdelt-api';
import type {
  DuplicationStats,
  DeduplicationOptions,
} from '@/features/news/utils/news-deduplication';

export interface NewsArticle {
  url: string;
  title: string;
  source: string;
  publishedDate: string;
  language?: string;
  imageUrl?: string;
  domain: string;
}

export interface NewsSearchOptions {
  maxRecords?: number;
  timeframe?: '15min' | '1hour' | '6hour' | '24hour';
  deduplication?: Partial<DeduplicationOptions>;
  themes?: string[];
}

export interface BreakingNewsAlert {
  article: NewsArticle;
  urgency: 'low' | 'medium' | 'high';
  category: 'legislation' | 'scandal' | 'election' | 'policy' | 'other';
}

export interface NewsSearchResult {
  articles: NewsArticle[];
  stats: DuplicationStats;
  searchTerms: string[];
}

class NewsService extends BaseService {
  private static instance: NewsService;

  private constructor() {
    super('/api');
  }

  public static getInstance(): NewsService {
    if (!NewsService.instance) {
      NewsService.instance = new NewsService();
    }
    return NewsService.instance;
  }

  /**
   * Search for news articles about a representative
   */
  async searchRepresentativeNews(
    representativeName: string,
    state: string,
    district?: string,
    options: NewsSearchOptions = {}
  ): Promise<NewsSearchResult> {
    const { maxRecords = 10, deduplication } = options;

    // Generate optimized search terms
    const searchTerms = generateOptimizedSearchTerms(representativeName, state, district);

    try {
      // Fetch articles using GDELT with deduplication
      const results = await Promise.all(
        searchTerms.map(term =>
          fetchGDELTNewsWithDeduplication(
            term,
            Math.ceil(maxRecords / searchTerms.length),
            deduplication
          )
        )
      );

      // Combine all articles and stats
      const allArticles = results.flatMap(r => r.articles);
      const combinedStats = results.reduce(
        (acc, r) => ({
          originalCount: acc.originalCount + r.stats.originalCount,
          duplicatesRemoved: acc.duplicatesRemoved + r.stats.duplicatesRemoved,
          finalCount: acc.finalCount + r.stats.finalCount,
          duplicatesDetected: [...acc.duplicatesDetected, ...r.stats.duplicatesDetected],
        }),
        {
          originalCount: 0,
          duplicatesRemoved: 0,
          finalCount: 0,
          duplicatesDetected: [] as Array<{
            method: string;
            originalIndex: number;
            duplicateIndex: number;
            similarity: number;
          }>,
        }
      );

      // Normalize articles to consistent format
      const articles: NewsArticle[] = allArticles.slice(0, maxRecords).map(article => {
        const normalized = normalizeGDELTArticle(article);
        return {
          url: article.url,
          title: (normalized as { title: string }).title,
          source: (normalized as { source: string }).source,
          publishedDate: (normalized as { publishedDate: string }).publishedDate,
          language: article.language,
          imageUrl: (normalized as { imageUrl?: string }).imageUrl,
          domain: article.domain,
        };
      });

      return {
        articles,
        stats: combinedStats,
        searchTerms,
      };
    } catch (error) {
      throw this.createServiceError('Failed to search representative news', error);
    }
  }

  /**
   * Get real-time news stream for a representative
   */
  async getRealTimeStream(
    representativeName: string,
    state: string,
    district?: string
  ): Promise<GDELTRealTimeStream> {
    try {
      return await getGDELTRealTimeStream(representativeName, state, district);
    } catch (error) {
      throw this.createServiceError('Failed to get real-time news stream', error);
    }
  }

  /**
   * Monitor for breaking news about a representative
   */
  async monitorBreakingNews(
    representativeName: string,
    state: string,
    lastCheckTime: string
  ): Promise<BreakingNewsAlert[]> {
    try {
      const alerts = await monitorBreakingNews(representativeName, state, lastCheckTime);
      return alerts.map(alert => ({
        article: alert.article as NewsArticle,
        urgency: alert.urgency,
        category: alert.category,
      }));
    } catch (error) {
      throw this.createServiceError('Failed to monitor breaking news', error);
    }
  }

  /**
   * Get trending political topics
   */
  async getTrends(
    category: 'politics' | 'government' | 'congress' | 'elections' = 'politics',
    timeframe: '1hour' | '6hour' | '24hour' = '6hour'
  ): Promise<GDELTTrend[]> {
    try {
      return await fetchGDELTTrends(category, timeframe);
    } catch (error) {
      throw this.createServiceError('Failed to get news trends', error);
    }
  }

  /**
   * Get real-time political events
   */
  async getRealTimeEvents(
    keywords: string[],
    timeframe: '15min' | '1hour' | '6hour' | '24hour' = '1hour'
  ): Promise<GDELTEvent[]> {
    try {
      return await fetchGDELTRealTimeEvents(keywords, timeframe);
    } catch (error) {
      throw this.createServiceError('Failed to get real-time events', error);
    }
  }

  /**
   * Search news by general query
   */
  async searchNews(query: string, options: NewsSearchOptions = {}): Promise<NewsSearchResult> {
    const { maxRecords = 10, deduplication } = options;

    try {
      const result = await fetchGDELTNewsWithDeduplication(query, maxRecords, deduplication);

      const articles: NewsArticle[] = result.articles.map(article => {
        const normalized = normalizeGDELTArticle(article);
        return {
          url: article.url,
          title: (normalized as { title: string }).title,
          source: (normalized as { source: string }).source,
          publishedDate: (normalized as { publishedDate: string }).publishedDate,
          language: article.language,
          imageUrl: (normalized as { imageUrl?: string }).imageUrl,
          domain: article.domain,
        };
      });

      return {
        articles,
        stats: result.stats,
        searchTerms: [query],
      };
    } catch (error) {
      throw this.createServiceError('Failed to search news', error);
    }
  }

  /**
   * Get news from multiple representatives for comparison
   */
  async getComparativeNews(
    representatives: Array<{
      name: string;
      state: string;
      district?: string;
    }>,
    options: NewsSearchOptions = {}
  ): Promise<Record<string, NewsSearchResult>> {
    const { maxRecords = 5 } = options;

    try {
      const results = await Promise.all(
        representatives.map(async rep => {
          const result = await this.searchRepresentativeNews(rep.name, rep.state, rep.district, {
            ...options,
            maxRecords,
          });
          return { key: `${rep.name}-${rep.state}`, result };
        })
      );

      return results.reduce(
        (acc, { key, result }) => {
          acc[key] = result;
          return acc;
        },
        {} as Record<string, NewsSearchResult>
      );
    } catch (error) {
      throw this.createServiceError('Failed to get comparative news', error);
    }
  }

  /**
   * Get news summary statistics
   */
  async getNewsSummary(
    representativeName: string,
    state: string,
    district?: string,
    timeframe: '24hour' | '7days' | '30days' = '24hour'
  ): Promise<{
    totalArticles: number;
    sourceCount: number;
    topSources: Array<{ source: string; count: number }>;
    categories: Array<{ category: string; count: number }>;
    timeframe: string;
  }> {
    try {
      // Get extended timeframe for analysis
      const maxRecords = timeframe === '24hour' ? 50 : timeframe === '7days' ? 100 : 200;

      const result = await this.searchRepresentativeNews(representativeName, state, district, {
        maxRecords,
        deduplication: { maxArticlesPerDomain: 10 },
      });

      // Analyze articles
      const sourceMap = new Map<string, number>();
      const categoryMap = new Map<string, number>();

      result.articles.forEach(article => {
        // Count sources
        const source = article.source;
        sourceMap.set(source, (sourceMap.get(source) || 0) + 1);

        // Simple category detection based on title keywords
        const title = article.title.toLowerCase();
        let category = 'other';

        if (title.includes('bill') || title.includes('vote') || title.includes('legislation')) {
          category = 'legislation';
        } else if (title.includes('election') || title.includes('campaign')) {
          category = 'election';
        } else if (title.includes('scandal') || title.includes('investigation')) {
          category = 'scandal';
        } else if (title.includes('policy') || title.includes('budget')) {
          category = 'policy';
        }

        categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
      });

      const topSources = Array.from(sourceMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([source, count]) => ({ source, count }));

      const categories = Array.from(categoryMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, count }));

      return {
        totalArticles: result.articles.length,
        sourceCount: sourceMap.size,
        topSources,
        categories,
        timeframe,
      };
    } catch (error) {
      throw this.createServiceError('Failed to get news summary', error);
    }
  }

  /**
   * Create a standardized service error
   */
  private createServiceError(message: string, originalError: unknown): Error {
    const error = new Error(message);
    if (originalError instanceof Error) {
      error.stack = originalError.stack;
      // TypeScript doesn't support Error.cause in all targets, so we add it as a property
      (error as Error & { cause?: Error }).cause = originalError;
    }
    return error;
  }
}

// Export singleton instance
export const newsService = NewsService.getInstance();

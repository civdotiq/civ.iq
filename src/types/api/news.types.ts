/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import type { ApiResponse, PaginatedApiResponse } from './common.types';
import type {
  NewsArticle,
  NewsTheme,
  RepresentativeNews,
  BatchNewsResponse,
} from '../models/NewsArticle';

/**
 * News articles list API response
 */
export interface NewsListResponse extends PaginatedApiResponse<ReadonlyArray<NewsArticle>> {
  readonly metadata: PaginatedApiResponse<ReadonlyArray<NewsArticle>>['metadata'] & {
    readonly query?: string;
    readonly theme?: NewsTheme;
    readonly totalArticles: number;
    readonly duplicatesRemoved?: number;
  };
}

/**
 * Representative news API response
 */
export interface RepresentativeNewsResponse extends ApiResponse<RepresentativeNews> {
  readonly metadata: ApiResponse<RepresentativeNews>['metadata'] & {
    readonly bioguideId: string;
    readonly searchTerms?: ReadonlyArray<string>;
    readonly coverageAnalysis?: {
      readonly sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
      readonly volume: 'high' | 'medium' | 'low';
      readonly trending?: boolean;
    };
  };
}

/**
 * News search parameters for API calls
 */
export interface NewsApiSearchParams {
  readonly query: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly theme?: NewsTheme;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly sources?: ReadonlyArray<string>;
  readonly language?: string;
  readonly bioguideId?: string;
  readonly representativeName?: string;
  readonly state?: string;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * News themes aggregation response
 */
export interface NewsThemesResponse
  extends ApiResponse<
    ReadonlyArray<{
      readonly theme: NewsTheme;
      readonly count: number;
      readonly percentage: number;
      readonly trending?: boolean;
      readonly sample_articles?: ReadonlyArray<{
        readonly title: string;
        readonly url: string;
        readonly source: string;
        readonly publishedDate: string;
      }>;
    }>
  > {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly period: string;
    readonly totalArticles: number;
  };
}

/**
 * News trends analysis response
 */
export interface NewsTrendsResponse
  extends ApiResponse<{
    readonly trends: ReadonlyArray<{
      readonly keyword: string;
      readonly mentions: number;
      readonly growth: number; // percentage change
      readonly sentiment: 'positive' | 'negative' | 'neutral';
      readonly related_representatives?: ReadonlyArray<string>;
    }>;
    readonly timeframe: {
      readonly start: string;
      readonly end: string;
      readonly period: 'hourly' | 'daily' | 'weekly';
    };
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly analysisType: 'keyword' | 'sentiment' | 'volume';
    readonly sampleSize: number;
  };
}

/**
 * Batch news API response (extends base batch news response)
 */
export interface BatchNewsApiResponse extends ApiResponse<BatchNewsResponse> {
  readonly metadata: ApiResponse<BatchNewsResponse>['metadata'] & {
    readonly requestedBioguideIds: ReadonlyArray<string>;
    readonly concurrencyLimit: number;
  };
}

/**
 * News source analysis response
 */
export interface NewsSourcesResponse
  extends ApiResponse<
    ReadonlyArray<{
      readonly domain: string;
      readonly name: string;
      readonly articleCount: number;
      readonly reliability?: 'high' | 'medium' | 'low';
      readonly bias?: 'left' | 'center' | 'right';
      readonly averageTone?: number;
      readonly lastSeen: string;
    }>
  > {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly period: string;
    readonly totalSources: number;
    readonly totalArticles: number;
  };
}

/**
 * News sentiment analysis response
 */
export interface NewsSentimentResponse
  extends ApiResponse<{
    readonly bioguideId: string;
    readonly overall: {
      readonly positive: number;
      readonly negative: number;
      readonly neutral: number;
      readonly compound: number; // -1 to 1
    };
    readonly timeline: ReadonlyArray<{
      readonly date: string;
      readonly positive: number;
      readonly negative: number;
      readonly neutral: number;
      readonly volume: number;
    }>;
    readonly topics: ReadonlyArray<{
      readonly topic: string;
      readonly sentiment: number;
      readonly mentions: number;
    }>;
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly bioguideId: string;
    readonly analysisWindow: string;
    readonly sampleSize: number;
  };
}

/**
 * News clustering response (for duplicate detection)
 */
export interface NewsClusteringResponse
  extends ApiResponse<{
    readonly clusters: ReadonlyArray<{
      readonly id: string;
      readonly representative_article: NewsArticle;
      readonly similar_articles: ReadonlyArray<NewsArticle>;
      readonly similarity_score: number;
      readonly cluster_size: number;
    }>;
    readonly total_articles: number;
    readonly unique_stories: number;
    readonly deduplication_ratio: number;
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly algorithm: 'title_similarity' | 'content_similarity' | 'hybrid';
    readonly threshold: number;
  };
}

/**
 * Real-time news alerts configuration
 */
export interface NewsAlertsConfig {
  readonly bioguideId: string;
  readonly keywords?: ReadonlyArray<string>;
  readonly themes?: ReadonlyArray<NewsTheme>;
  readonly sources?: ReadonlyArray<string>;
  readonly sentiment_threshold?: number;
  readonly frequency: 'immediate' | 'hourly' | 'daily';
  readonly delivery_method: 'webhook' | 'email' | 'push';
}

/**
 * News alerts response
 */
export interface NewsAlertsResponse
  extends ApiResponse<{
    readonly alert_id: string;
    readonly config: NewsAlertsConfig;
    readonly status: 'active' | 'paused' | 'disabled';
    readonly last_triggered?: string;
    readonly trigger_count: number;
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly bioguideId: string;
  };
}

/**
 * News export parameters
 */
export interface NewsExportParams {
  readonly bioguideId?: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly format: 'json' | 'csv' | 'xlsx';
  readonly themes?: ReadonlyArray<NewsTheme>;
  readonly sources?: ReadonlyArray<string>;
  readonly includeContent?: boolean;
}

/**
 * News export response
 */
export interface NewsExportResponse
  extends ApiResponse<{
    readonly export_id: string;
    readonly download_url: string;
    readonly expires_at: string;
    readonly file_size: number;
    readonly record_count: number;
  }> {
  readonly metadata: ApiResponse<unknown>['metadata'] & {
    readonly format: string;
    readonly requested_params: NewsExportParams;
  };
}

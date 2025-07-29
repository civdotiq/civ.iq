/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * News article model with comprehensive type definitions
 */
export interface NewsArticle {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly source: string;
  readonly domain: string;
  readonly publishedDate: string;
  readonly seenDate?: string;
  readonly language: string;
  readonly summary?: string;
  readonly content?: string;
  readonly imageUrl?: string;
  readonly socialImage?: string;
  readonly author?: string;
  readonly theme?: NewsTheme;
  readonly tone?: 'positive' | 'negative' | 'neutral';
  readonly relevanceScore?: number;
  readonly metadata?: {
    readonly wordCount?: number;
    readonly readingTime?: number;
    readonly extractedAt: string;
  };
}

/**
 * News themes for categorization
 */
export type NewsTheme =
  | 'legislation'
  | 'voting'
  | 'committee'
  | 'campaign'
  | 'scandal'
  | 'policy'
  | 'endorsement'
  | 'healthcare'
  | 'economy'
  | 'environment';

/**
 * News search parameters
 */
export interface NewsSearchParams {
  readonly query: string;
  readonly limit?: number;
  readonly offset?: number;
  readonly theme?: NewsTheme;
  readonly startDate?: string;
  readonly endDate?: string;
  readonly sources?: ReadonlyArray<string>;
  readonly language?: string;
}

/**
 * News aggregation result
 */
export interface NewsAggregation {
  readonly articles: ReadonlyArray<NewsArticle>;
  readonly totalResults: number;
  readonly searchTerms: ReadonlyArray<string>;
  readonly dataSource: 'gdelt' | 'cached' | 'fallback';
  readonly duplicatesRemoved?: number;
  readonly qualityFiltered?: number;
  readonly themes?: ReadonlyArray<{
    readonly theme: NewsTheme;
    readonly count: number;
    readonly percentage: number;
  }>;
}

/**
 * Representative-specific news result
 */
export interface RepresentativeNews {
  readonly bioguideId: string;
  readonly representativeName?: string;
  readonly articles: ReadonlyArray<NewsArticle>;
  readonly totalResults: number;
  readonly searchTerms: ReadonlyArray<string>;
  readonly dataSource: 'gdelt' | 'cached' | 'fallback';
  readonly error?: string;
  readonly lastUpdated?: string;
  readonly coverage?: {
    readonly positive: number;
    readonly negative: number;
    readonly neutral: number;
  };
}

/**
 * Batch news request for multiple representatives
 */
export interface BatchNewsRequest {
  readonly bioguideIds: ReadonlyArray<string>;
  readonly limit?: number;
  readonly theme?: NewsTheme;
  readonly daysBack?: number;
}

/**
 * Batch news response
 */
export interface BatchNewsResponse {
  readonly results: Record<string, RepresentativeNews>;
  readonly metadata: {
    readonly totalRequested: number;
    readonly successCount: number;
    readonly errorCount: number;
    readonly totalArticles: number;
    readonly timestamp: string;
    readonly dataSource: string;
    readonly processingTime?: number;
  };
}

/**
 * News deduplication options
 */
export interface NewsDeduplicationOptions {
  readonly titleSimilarityThreshold?: number;
  readonly maxArticlesPerDomain?: number;
  readonly enableDomainClustering?: boolean;
  readonly enableContentSimilarity?: boolean;
}

/**
 * GDELT API specific types
 */
export interface GDELTArticle {
  readonly url: string;
  readonly urltone: string;
  readonly domain: string;
  readonly urlpubtimedate: string;
  readonly urlpubdate: string;
  readonly urltitle: string;
  readonly seendate: string;
  readonly socialimage?: string;
  readonly language: string;
  readonly sourcecountry: string;
}

/**
 * GDELT search response
 */
export interface GDELTResponse {
  readonly articles: ReadonlyArray<GDELTArticle>;
  readonly totalResults?: number;
  readonly next?: string;
}

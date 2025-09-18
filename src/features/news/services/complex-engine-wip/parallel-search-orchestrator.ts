/**
 * Parallel Search Orchestrator for Google News-Style GDELT Integration
 * Phase 1: Concurrent multi-dimensional search execution
 *
 * Orchestrates parallel GDELT API calls across different topic dimensions
 * with intelligent result merging, deduplication, and relevance scoring.
 */

import { EnhancedRepresentative } from '@/types/representative';
import {
  GDELTQueryBuilderV2,
  SearchDimension,
  QueryCluster,
  QueryPerformanceMetrics,
} from './gdelt-query-builder-v2';
import { GDELTArticle, GDELTResponse } from './gdelt-api';
import { EnhancedArticle, enhanceGdeltArticle } from '../types/news';
import { NewsDeduplicator } from '../utils/news-deduplication';
import logger from '@/lib/logging/simple-logger';

/**
 * Search result with dimensional context
 */
export interface DimensionalSearchResult {
  dimension: SearchDimension;
  articles: GDELTArticle[];
  performanceMetrics: QueryPerformanceMetrics;
  searchQuery: string;
}

/**
 * Merged search results with relevance scoring
 */
export interface MergedSearchResults {
  articles: EnhancedArticle[];
  totalResults: number;
  dimensionalBreakdown: Record<SearchDimension, number>;
  performanceMetrics: QueryPerformanceMetrics[];
  searchStrategy: {
    dimensionsSearched: number;
    totalQueries: number;
    totalTimeMs: number;
    cacheHitRate: number;
  };
}

// EnhancedArticle is now imported from ../types/news

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  maxConcurrentRequests: number;
  requestTimeoutMs: number;
  maxArticlesPerDimension: number;
  deduplicationThreshold: number;
  cacheEnabled: boolean;
}

/**
 * Parallel Search Orchestrator
 */
export class ParallelSearchOrchestrator {
  private static readonly DEFAULT_CONFIG: OrchestratorConfig = {
    maxConcurrentRequests: 5,
    requestTimeoutMs: 5000,
    maxArticlesPerDimension: 50,
    deduplicationThreshold: 0.8,
    cacheEnabled: true,
  };

  private config: OrchestratorConfig;
  private deduplicator: NewsDeduplicator;
  private activeRequests: Map<string, AbortController>;

  constructor(config: Partial<OrchestratorConfig> = {}) {
    this.config = { ...ParallelSearchOrchestrator.DEFAULT_CONFIG, ...config };
    this.deduplicator = new NewsDeduplicator();
    this.activeRequests = new Map();
  }

  /**
   * Execute parallel multi-dimensional search for a representative
   */
  public async executeParallelSearch(
    representative: EnhancedRepresentative,
    options: {
      timeframe?: 'realtime' | '24h' | '7d' | '30d';
      focusDimensions?: SearchDimension[];
      maxResults?: number;
    } = {}
  ): Promise<MergedSearchResults> {
    const startTime = Date.now();

    try {
      // Generate search strategy
      const strategy = GDELTQueryBuilderV2.generateSearchStrategy(representative, {
        timeframe: options.timeframe,
        focusDimensions: options.focusDimensions,
      });

      // Create query clusters
      const clusters = GDELTQueryBuilderV2.createQueryClusters(strategy);

      logger.info('Starting parallel search orchestration', {
        component: 'ParallelSearchOrchestrator',
        metadata: {
          representative: representative.bioguideId,
          clusterCount: clusters.length,
          dimensions: Object.keys(strategy.dimensions),
        },
      });

      // Execute parallel searches
      const dimensionalResults = await this.executeParallelQueries(clusters);

      // Merge and deduplicate results
      const mergedResults = await this.mergeAndDeduplicateResults(
        dimensionalResults,
        options.maxResults || 100
      );

      // Calculate performance metrics
      const totalTimeMs = Date.now() - startTime;
      const cacheHitRate = this.calculateCacheHitRate(dimensionalResults);

      // Prepare final results
      const results: MergedSearchResults = {
        articles: mergedResults,
        totalResults: mergedResults.length,
        dimensionalBreakdown: this.calculateDimensionalBreakdown(dimensionalResults),
        performanceMetrics: dimensionalResults.map(r => r.performanceMetrics),
        searchStrategy: {
          dimensionsSearched: Object.keys(strategy.dimensions).length,
          totalQueries: clusters.reduce((sum, c) => sum + 1 + c.supportingQueries.length, 0),
          totalTimeMs,
          cacheHitRate,
        },
      };

      logger.info('Parallel search completed', {
        component: 'ParallelSearchOrchestrator',
        metadata: {
          totalResults: results.totalResults,
          totalTimeMs,
          cacheHitRate,
        },
      });

      return results;
    } catch (error) {
      logger.error('Parallel search orchestration failed', {
        component: 'ParallelSearchOrchestrator',
        error: error as Error,
        metadata: { representative: representative.bioguideId },
      });
      throw error;
    }
  }

  /**
   * Execute queries in parallel with rate limiting
   */
  private async executeParallelQueries(
    clusters: QueryCluster[]
  ): Promise<DimensionalSearchResult[]> {
    const results: DimensionalSearchResult[] = [];

    // Group clusters by priority for batching
    const highPriority = clusters.filter(c => c.priority === 'high');
    const mediumPriority = clusters.filter(c => c.priority === 'medium');
    const lowPriority = clusters.filter(c => c.priority === 'low');

    // Execute in priority order with concurrency control
    const highResults = await this.executeBatch(highPriority);
    results.push(...highResults);

    const mediumResults = await this.executeBatch(mediumPriority);
    results.push(...mediumResults);

    const lowResults = await this.executeBatch(lowPriority);
    results.push(...lowResults);

    return results;
  }

  /**
   * Execute a batch of queries with concurrency control
   */
  private async executeBatch(clusters: QueryCluster[]): Promise<DimensionalSearchResult[]> {
    const results: DimensionalSearchResult[] = [];
    const batchSize = this.config.maxConcurrentRequests;

    for (let i = 0; i < clusters.length; i += batchSize) {
      const batch = clusters.slice(i, i + batchSize);
      const batchPromises = batch.map(cluster => this.executeCluster(cluster));

      try {
        const batchResults = await Promise.allSettled(batchPromises);

        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value) {
            results.push(result.value);
          } else if (result.status === 'rejected') {
            logger.error('Query cluster execution failed', {
              component: 'ParallelSearchOrchestrator',
              error: result.reason,
              metadata: { dimension: batch[index].primaryQuery.dimension },
            });
          }
        });
      } catch (error) {
        logger.error('Batch execution failed', {
          component: 'ParallelSearchOrchestrator',
          error: error as Error,
        });
      }
    }

    return results;
  }

  /**
   * Execute a single query cluster
   */
  private async executeCluster(cluster: QueryCluster): Promise<DimensionalSearchResult> {
    const startTime = Date.now();
    const dimension = cluster.primaryQuery.dimension;

    // Create abort controller for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.config.requestTimeoutMs);

    try {
      // Check cache first if enabled
      if (this.config.cacheEnabled) {
        const cached = await this.getCachedResult(cluster.primaryQuery.query);
        if (cached) {
          clearTimeout(timeoutId);
          return {
            dimension,
            articles: cached,
            performanceMetrics: GDELTQueryBuilderV2.measurePerformance(
              dimension,
              startTime,
              cached.length,
              true // cache hit
            ),
            searchQuery: cluster.primaryQuery.query,
          };
        }
      }

      // Execute GDELT API call
      const response = await this.fetchGDELTData(
        cluster.primaryQuery.query,
        abortController.signal
      );

      clearTimeout(timeoutId);

      // Cache the result if enabled - add null safety
      if (this.config.cacheEnabled && response.articles && response.articles.length > 0) {
        await this.cacheResult(cluster.primaryQuery.query, response.articles);
      }

      return {
        dimension,
        articles: (response.articles || []).slice(0, this.config.maxArticlesPerDimension),
        performanceMetrics: GDELTQueryBuilderV2.measurePerformance(
          dimension,
          startTime,
          (response.articles || []).length,
          false // cache miss
        ),
        searchQuery: cluster.primaryQuery.query,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      logger.error('Cluster execution failed', {
        component: 'ParallelSearchOrchestrator',
        error: error as Error,
        metadata: { dimension, query: cluster.primaryQuery.query },
      });

      // Return empty result on error
      return {
        dimension,
        articles: [],
        performanceMetrics: GDELTQueryBuilderV2.measurePerformance(dimension, startTime, 0, false),
        searchQuery: cluster.primaryQuery.query,
      };
    }
  }

  /**
   * Fetch data from GDELT API
   */
  private async fetchGDELTData(queryUrl: string, signal: AbortSignal): Promise<GDELTResponse> {
    try {
      const response = await fetch(queryUrl, {
        signal,
        headers: {
          Accept: 'application/json',
          'User-Agent': 'civic-intel-hub/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`GDELT API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        articles: data.articles || [],
        totalResults: data.totalResults || 0,
        searchTerms: data.searchTerms || [],
      };
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new Error('GDELT request timeout');
      }
      throw error;
    }
  }

  /**
   * Merge and deduplicate results from multiple dimensions
   */
  private async mergeAndDeduplicateResults(
    dimensionalResults: DimensionalSearchResult[],
    maxResults: number
  ): Promise<EnhancedArticle[]> {
    const allArticles: EnhancedArticle[] = [];
    const seenUrls = new Set<string>();

    // Process each dimensional result
    for (const result of dimensionalResults) {
      for (const article of result.articles) {
        // Check for URL duplicates first (fastest)
        const normalizedUrl = this.normalizeUrl(article.url);
        if (seenUrls.has(normalizedUrl)) {
          // Mark as duplicate but still track which dimensions found it
          const existingArticle = allArticles.find(a => this.normalizeUrl(a.url) === normalizedUrl);
          if (existingArticle) {
            existingArticle.dimensions.push(result.dimension);
            existingArticle.matchedQueries.push(result.searchQuery);
            // Boost relevance for multi-dimensional matches
            existingArticle.relevanceScore *= 1.2;
          }
          continue;
        }

        seenUrls.add(normalizedUrl);

        // Create enhanced article
        const enhancedArticle: EnhancedArticle = enhanceGdeltArticle(
          article,
          this.calculateArticleRelevance(article, result),
          [result.dimension],
          [result.searchQuery]
        );

        allArticles.push(enhancedArticle);
      }
    }

    // Advanced deduplication using content similarity
    const deduplicated = await this.performAdvancedDeduplication(allArticles);

    // Sort by relevance score
    deduplicated.sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Return top results
    return deduplicated.slice(0, maxResults);
  }

  /**
   * Perform advanced content-based deduplication
   */
  private async performAdvancedDeduplication(
    articles: EnhancedArticle[]
  ): Promise<EnhancedArticle[]> {
    const deduplicated: EnhancedArticle[] = [];
    const clusters = new Map<string, EnhancedArticle[]>();

    for (const article of articles) {
      let addedToCluster = false;

      // Check against existing clusters
      for (const [clusterId, clusterArticles] of clusters.entries()) {
        const representative = clusterArticles[0];
        if (!representative) continue;
        const similarity = this.calculateSimilarity(article, representative);

        if (similarity > this.config.deduplicationThreshold) {
          // Add to existing cluster
          article.clusterGroup = clusterId;
          article.isDuplicate = true;
          clusterArticles.push(article);
          addedToCluster = true;
          break;
        }
      }

      if (!addedToCluster) {
        // Create new cluster
        const clusterId = `cluster_${clusters.size}`;
        article.clusterGroup = clusterId;
        clusters.set(clusterId, [article]);
        deduplicated.push(article); // Only add cluster representative
      }
    }

    // Merge dimensions and queries for cluster representatives
    for (const [clusterId, clusterArticles] of clusters.entries()) {
      if (clusterArticles.length > 1) {
        const representative = deduplicated.find(a => a.clusterGroup === clusterId);
        if (representative) {
          // Merge all dimensions and queries from duplicates
          for (const duplicate of clusterArticles.slice(1)) {
            representative.dimensions.push(...duplicate.dimensions);
            representative.matchedQueries.push(...duplicate.matchedQueries);
          }
          // Remove duplicate dimensions and queries
          representative.dimensions = [...new Set(representative.dimensions)];
          representative.matchedQueries = [...new Set(representative.matchedQueries)];
          // Boost relevance for articles found across multiple searches
          representative.relevanceScore *= 1 + (clusterArticles.length - 1) * 0.1;
        }
      }
    }

    logger.info('Advanced deduplication completed', {
      component: 'ParallelSearchOrchestrator',
      metadata: {
        originalCount: articles.length,
        deduplicatedCount: deduplicated.length,
        clusterCount: clusters.size,
      },
    });

    return deduplicated;
  }

  /**
   * Calculate similarity between two articles
   */
  private calculateSimilarity(article1: EnhancedArticle, article2: EnhancedArticle): number {
    // URL similarity
    if (this.normalizeUrl(article1.url) === this.normalizeUrl(article2.url)) {
      return 1.0;
    }

    // Title similarity using Jaccard coefficient
    const titleSimilarity = this.jaccardSimilarity(
      article1.title.toLowerCase(),
      article2.title.toLowerCase()
    );

    // Source and date proximity
    const sourceSame = article1.source === article2.source ? 0.2 : 0;
    const timeDiff = Math.abs(
      new Date(article1.publishedDate).getTime() - new Date(article2.publishedDate).getTime()
    );
    const timeProximity = timeDiff < 3600000 ? 0.1 : 0; // Within 1 hour

    return titleSimilarity * 0.7 + sourceSame + timeProximity;
  }

  /**
   * Calculate Jaccard similarity between two strings
   */
  private jaccardSimilarity(str1: string, str2: string): number {
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;
    return intersection.size / union.size;
  }

  /**
   * Calculate article relevance score
   */
  private calculateArticleRelevance(
    article: GDELTArticle,
    result: DimensionalSearchResult
  ): number {
    const dimensionWeight = this.getDimensionWeight(result.dimension);
    const freshnessScore = this.calculateFreshnessScore(article.seendate); // Use seendate instead of publishedDate
    const sourceScore = this.calculateSourceScore(article.domain); // Use domain instead of source

    return dimensionWeight * 0.5 + freshnessScore * 0.3 + sourceScore * 0.2;
  }

  /**
   * Get weight for dimension
   */
  private getDimensionWeight(dimension: SearchDimension): number {
    const weights: Record<SearchDimension, number> = {
      [SearchDimension.IDENTITY]: 1.0,
      [SearchDimension.TEMPORAL]: 0.9,
      [SearchDimension.COMMITTEE]: 0.8,
      [SearchDimension.POLICY]: 0.7,
      [SearchDimension.GEOGRAPHIC]: 0.6,
      [SearchDimension.LEADERSHIP]: 0.6,
      [SearchDimension.PARTY]: 0.5,
      [SearchDimension.CROSS_REF]: 0.4,
    };
    return weights[dimension] || 0.5;
  }

  /**
   * Calculate freshness score based on publish date
   */
  private calculateFreshnessScore(publishedDate: string): number {
    const now = Date.now();
    const published = new Date(publishedDate).getTime();
    const hoursAgo = (now - published) / (1000 * 60 * 60);

    if (hoursAgo < 1) return 1.0;
    if (hoursAgo < 24) return 0.9;
    if (hoursAgo < 48) return 0.7;
    if (hoursAgo < 168) return 0.5; // 1 week
    return 0.3;
  }

  /**
   * Calculate source credibility score
   */
  private calculateSourceScore(source: string): number {
    const topTierSources = ['reuters', 'apnews', 'npr', 'bbc', 'wsj', 'nytimes', 'washingtonpost'];
    const midTierSources = ['cnn', 'foxnews', 'msnbc', 'politico', 'thehill', 'axios'];

    const sourceLower = source.toLowerCase();

    if (topTierSources.some(s => sourceLower.includes(s))) return 1.0;
    if (midTierSources.some(s => sourceLower.includes(s))) return 0.7;
    return 0.5;
  }

  /**
   * Calculate dimensional breakdown
   */
  private calculateDimensionalBreakdown(
    results: DimensionalSearchResult[]
  ): Record<SearchDimension, number> {
    const breakdown: Partial<Record<SearchDimension, number>> = {};

    for (const result of results) {
      breakdown[result.dimension] = result.articles.length;
    }

    return breakdown as Record<SearchDimension, number>;
  }

  /**
   * Calculate cache hit rate
   */
  private calculateCacheHitRate(results: DimensionalSearchResult[]): number {
    if (results.length === 0) return 0;

    const cacheHits = results.filter(r => r.performanceMetrics.cacheHit).length;
    return cacheHits / results.length;
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      // Remove common tracking parameters
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_medium');
      parsed.searchParams.delete('utm_campaign');
      // Remove fragment
      parsed.hash = '';
      return parsed.toString().toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  }

  /**
   * Get cached result (stub - implement with Redis)
   */
  private async getCachedResult(query: string): Promise<GDELTArticle[] | null> {
    // TODO: Implement Redis caching
    return null;
  }

  /**
   * Cache result (stub - implement with Redis)
   */
  private async cacheResult(query: string, articles: GDELTArticle[]): Promise<void> {
    // TODO: Implement Redis caching
  }

  /**
   * Cancel all active requests
   */
  public cancelAllRequests(): void {
    this.activeRequests.forEach(controller => controller.abort());
    this.activeRequests.clear();
  }
}

export default ParallelSearchOrchestrator;

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Enhanced News Deduplication System - Phase 2 Implementation
 *
 * This service combines and enhances the existing MinHash, URL normalization,
 * and Jaccard similarity implementations with improved algorithms and
 * additional features for better duplicate detection.
 */

import logger from '@/lib/logging/simple-logger';
import {
  URLNormalizer,
  TextSimilarity,
  NewsDeduplicator as GDELTDeduplicator,
  type GDELTArticle,
  type DeduplicationConfig,
} from '@/lib/gdelt/deduplication';

export interface EnhancedNewsArticle {
  url: string;
  title: string;
  seendate: string;
  domain: string;
  socialimage?: string;
  urlmobile?: string;
  language?: string;
  sourcecountry?: string;
  content?: string;
  summary?: string;
  tone?: number;
  urltone?: number;
}

export interface EnhancedDeduplicationStats {
  originalCount: number;
  duplicatesRemoved: number;
  finalCount: number;
  deduplicationRate: number;
  duplicatesDetected: Array<{
    method: DeduplicationMethod;
    originalIndex: number;
    duplicateIndex: number;
    similarity: number;
    details?: string;
  }>;
  performanceStats: {
    processingTimeMs: number;
    minHashComparisons: number;
    titleComparisons: number;
    urlComparisons: number;
  };
}

export type DeduplicationMethod =
  | 'exact_url'
  | 'normalized_url'
  | 'minhash_content'
  | 'jaccard_title'
  | 'levenshtein_title'
  | 'domain_clustering'
  | 'content_similarity';

export interface EnhancedDeduplicationConfig {
  // Core thresholds
  minHashSimilarityThreshold: number;
  titleSimilarityThreshold: number;
  contentSimilarityThreshold: number;
  urlSimilarityThreshold: number;

  // Algorithm controls
  enableMinHashDeduplication: boolean;
  enableAdvancedUrlNormalization: boolean;
  enableTitleSimilarity: boolean;
  enableContentSimilarity: boolean;
  enableDomainClustering: boolean;
  enableFuzzyTitleMatching: boolean;

  // Performance settings
  maxArticlesPerDomain: number;
  minHashPermutations: number;
  titleShingleSize: number;
  contentShingleSize: number;

  // Behavior settings
  preserveNewestArticles: boolean;
  enablePerformanceLogging: boolean;
  enableDetailedStats: boolean;
}

const DEFAULT_ENHANCED_CONFIG: EnhancedDeduplicationConfig = {
  // Thresholds
  minHashSimilarityThreshold: 0.8,
  titleSimilarityThreshold: 0.75,
  contentSimilarityThreshold: 0.85,
  urlSimilarityThreshold: 0.95,

  // Algorithm controls
  enableMinHashDeduplication: true,
  enableAdvancedUrlNormalization: true,
  enableTitleSimilarity: true,
  enableContentSimilarity: false, // Off by default as content often unavailable
  enableDomainClustering: true,
  enableFuzzyTitleMatching: true,

  // Performance settings
  maxArticlesPerDomain: 3,
  minHashPermutations: 128,
  titleShingleSize: 2,
  contentShingleSize: 3,

  // Behavior settings
  preserveNewestArticles: true,
  enablePerformanceLogging: true,
  enableDetailedStats: true,
};

/**
 * Enhanced news deduplication engine that combines multiple algorithms
 * for superior duplicate detection across diverse news sources.
 */
export class EnhancedNewsDeduplicator {
  private readonly config: EnhancedDeduplicationConfig;
  private stats: EnhancedDeduplicationStats;
  private startTime: number = 0;

  constructor(config: Partial<EnhancedDeduplicationConfig> = {}) {
    this.config = { ...DEFAULT_ENHANCED_CONFIG, ...config };
    this.stats = this.initializeStats();
  }

  /**
   * Main deduplication function with enhanced algorithms
   */
  deduplicate(articles: EnhancedNewsArticle[]): {
    articles: EnhancedNewsArticle[];
    stats: EnhancedDeduplicationStats;
  } {
    this.startTime = Date.now();
    this.stats = this.initializeStats();
    this.stats.originalCount = articles.length;

    if (articles.length === 0) {
      return { articles: [], stats: this.stats };
    }

    let deduplicatedArticles = [...articles];

    // Phase 1: Fast URL-based deduplication
    if (this.config.enableAdvancedUrlNormalization) {
      deduplicatedArticles = this.performAdvancedUrlDeduplication(deduplicatedArticles);
    }

    // Phase 2: MinHash content similarity (most effective for substantial duplicates)
    if (this.config.enableMinHashDeduplication) {
      deduplicatedArticles = this.performMinHashDeduplication(deduplicatedArticles);
    }

    // Phase 3: Advanced title similarity detection
    if (this.config.enableTitleSimilarity) {
      deduplicatedArticles = this.performAdvancedTitleDeduplication(deduplicatedArticles);
    }

    // Phase 4: Content similarity (if content available)
    if (this.config.enableContentSimilarity) {
      deduplicatedArticles = this.performContentDeduplication(deduplicatedArticles);
    }

    // Phase 5: Domain clustering
    if (this.config.enableDomainClustering) {
      deduplicatedArticles = this.performDomainClustering(deduplicatedArticles);
    }

    this.finalizeStats(deduplicatedArticles);
    return { articles: deduplicatedArticles, stats: this.stats };
  }

  /**
   * Advanced URL normalization and deduplication
   */
  private performAdvancedUrlDeduplication(articles: EnhancedNewsArticle[]): EnhancedNewsArticle[] {
    const urlMap = new Map<string, EnhancedNewsArticle>();
    const result: EnhancedNewsArticle[] = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article) continue;

      const normalizedUrl = URLNormalizer.normalize(article.url);
      const existing = urlMap.get(normalizedUrl);

      if (existing) {
        this.stats.duplicatesDetected.push({
          method: 'normalized_url',
          originalIndex: articles.indexOf(existing),
          duplicateIndex: i,
          similarity: this.config.urlSimilarityThreshold,
          details: `URLs normalized to: ${normalizedUrl}`,
        });

        // Keep newer article if configured
        if (
          this.config.preserveNewestArticles &&
          new Date(article.seendate) > new Date(existing.seendate)
        ) {
          urlMap.set(normalizedUrl, article);
        }
      } else {
        urlMap.set(normalizedUrl, article);
        result.push(article);
      }

      this.stats.performanceStats.urlComparisons++;
    }

    return result;
  }

  /**
   * MinHash-based content deduplication using the existing implementation
   */
  private performMinHashDeduplication(articles: EnhancedNewsArticle[]): EnhancedNewsArticle[] {
    if (articles.length === 0) return articles;

    // Convert to GDELT format for MinHash processing
    const gdeltArticles: GDELTArticle[] = articles.map(article => ({
      url: article.url,
      title: article.title,
      urltone: article.urltone || null,
      domain: article.domain,
      urlpubtimedate: null,
      urlpubtime: null,
      socialimage: article.socialimage || null,
      seendate: article.seendate,
      tone: article.tone || null,
      country: article.sourcecountry || null,
      lang: article.language || null,
    }));

    // Use existing GDELT deduplicator with MinHash
    const gdeltConfig: DeduplicationConfig = {
      similarityThreshold: this.config.minHashSimilarityThreshold,
      minHashPermutations: this.config.minHashPermutations,
      enableUrlNormalization: false, // Already done in Phase 1
      enableTitleSimilarity: false, // Will be done in Phase 3
    };

    const deduplicator = new GDELTDeduplicator(gdeltConfig);
    const result = deduplicator.deduplicate(gdeltArticles);

    // Track MinHash comparisons
    this.stats.performanceStats.minHashComparisons += result.duplicateCount;

    // Convert back to EnhancedNewsArticle format
    const uniqueUrls = new Set(result.unique.map(a => a.url));
    const filteredArticles = articles.filter(article => uniqueUrls.has(article.url));

    // Record duplicates found by MinHash
    const duplicatesFound = articles.length - filteredArticles.length;
    for (let i = 0; i < duplicatesFound; i++) {
      this.stats.duplicatesDetected.push({
        method: 'minhash_content',
        originalIndex: -1, // MinHash doesn't provide specific indices
        duplicateIndex: -1,
        similarity: this.config.minHashSimilarityThreshold,
        details: `MinHash similarity >= ${this.config.minHashSimilarityThreshold}`,
      });
    }

    return filteredArticles;
  }

  /**
   * Advanced title similarity with multiple algorithms
   */
  private performAdvancedTitleDeduplication(
    articles: EnhancedNewsArticle[]
  ): EnhancedNewsArticle[] {
    const result: EnhancedNewsArticle[] = [];

    for (let i = 0; i < articles.length; i++) {
      const currentArticle = articles[i];
      if (!currentArticle) continue;

      let isDuplicate = false;

      for (let j = 0; j < result.length; j++) {
        const existingArticle = result[j];
        if (!existingArticle) continue;

        // Jaccard similarity on word shingles
        const jaccardSimilarity = TextSimilarity.titleSimilarity(
          currentArticle.title,
          existingArticle.title
        );

        // Enhanced fuzzy matching if enabled
        let fuzzyScore = 0;
        if (this.config.enableFuzzyTitleMatching) {
          fuzzyScore = this.calculateFuzzyTitleSimilarity(
            currentArticle.title,
            existingArticle.title
          );
        }

        const maxSimilarity = Math.max(jaccardSimilarity, fuzzyScore);

        if (maxSimilarity >= this.config.titleSimilarityThreshold) {
          this.stats.duplicatesDetected.push({
            method: maxSimilarity === jaccardSimilarity ? 'jaccard_title' : 'levenshtein_title',
            originalIndex: articles.indexOf(existingArticle),
            duplicateIndex: i,
            similarity: maxSimilarity,
            details: `Title similarity: ${maxSimilarity.toFixed(3)} (Jaccard: ${jaccardSimilarity.toFixed(3)}, Fuzzy: ${fuzzyScore.toFixed(3)})`,
          });

          // Keep newer article if configured
          if (
            this.config.preserveNewestArticles &&
            new Date(currentArticle.seendate) > new Date(existingArticle.seendate)
          ) {
            result[j] = currentArticle;
          }

          isDuplicate = true;
          break;
        }

        this.stats.performanceStats.titleComparisons++;
      }

      if (!isDuplicate) {
        result.push(currentArticle);
      }
    }

    return result;
  }

  /**
   * Enhanced fuzzy title matching using Levenshtein distance
   */
  private calculateFuzzyTitleSimilarity(title1: string, title2: string): number {
    if (!title1 || !title2) return 0;
    if (title1 === title2) return 1;

    // Normalize titles for comparison
    const normalize = (title: string): string =>
      title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const normalized1 = normalize(title1);
    const normalized2 = normalize(title2);

    // Quick length check - if very different lengths, likely not duplicates
    const lengthDiff = Math.abs(normalized1.length - normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (lengthDiff > maxLength * 0.4) return 0;

    // Calculate Levenshtein distance
    const distance = this.calculateLevenshteinDistance(normalized1, normalized2);
    const similarity = 1 - distance / maxLength;

    // Only return high similarity scores to avoid false positives
    return similarity > 0.8 ? similarity : 0;
  }

  /**
   * Optimized Levenshtein distance calculation
   */
  private calculateLevenshteinDistance(str1: string, str2: string): number {
    if (str1.length === 0) return str2.length;
    if (str2.length === 0) return str1.length;

    // Use only two rows for space optimization
    let previousRow = Array(str2.length + 1)
      .fill(0)
      .map((_, i) => i);
    let currentRow = Array(str2.length + 1).fill(0);

    for (let i = 1; i <= str1.length; i++) {
      currentRow[0] = i;

      for (let j = 1; j <= str2.length; j++) {
        const insertCost = (currentRow[j - 1] ?? 0) + 1;
        const deleteCost = (previousRow[j] ?? 0) + 1;
        const replaceCost = (previousRow[j - 1] ?? 0) + (str1[i - 1] === str2[j - 1] ? 0 : 1);

        currentRow[j] = Math.min(insertCost, deleteCost, replaceCost);
      }

      // Swap rows
      [previousRow, currentRow] = [currentRow, previousRow];
    }

    return previousRow[str2.length] ?? 0;
  }

  /**
   * Content-based deduplication for articles with available content
   */
  private performContentDeduplication(articles: EnhancedNewsArticle[]): EnhancedNewsArticle[] {
    const result: EnhancedNewsArticle[] = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];
      if (!article) continue;

      const content = article.content || article.summary;
      if (!content) {
        result.push(article);
        continue;
      }

      let isDuplicate = false;

      for (let j = 0; j < result.length; j++) {
        const existingArticle = result[j];
        if (!existingArticle) continue;

        const existingContent = existingArticle.content || existingArticle.summary;
        if (!existingContent) continue;

        const similarity = this.calculateContentSimilarity(content, existingContent);

        if (similarity >= this.config.contentSimilarityThreshold) {
          this.stats.duplicatesDetected.push({
            method: 'content_similarity',
            originalIndex: articles.indexOf(existingArticle),
            duplicateIndex: i,
            similarity,
            details: `Content similarity: ${similarity.toFixed(3)}`,
          });

          if (
            this.config.preserveNewestArticles &&
            new Date(article.seendate) > new Date(existingArticle.seendate)
          ) {
            result[j] = article;
          }

          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        result.push(article);
      }
    }

    return result;
  }

  /**
   * Enhanced content similarity using shingles
   */
  private calculateContentSimilarity(content1: string, content2: string): number {
    const shingles1 = TextSimilarity.generateShingles(content1, this.config.contentShingleSize);
    const shingles2 = TextSimilarity.generateShingles(content2, this.config.contentShingleSize);

    return TextSimilarity.jaccardSimilarity(shingles1, shingles2);
  }

  /**
   * Domain clustering to limit articles per domain
   */
  private performDomainClustering(articles: EnhancedNewsArticle[]): EnhancedNewsArticle[] {
    const domainGroups = new Map<string, EnhancedNewsArticle[]>();

    // Group by canonical domain
    for (const article of articles) {
      const domain = URLNormalizer.getDomain(article.url);
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(article);
    }

    const result: EnhancedNewsArticle[] = [];

    for (const [domain, domainArticles] of domainGroups.entries()) {
      // Sort by date if preserveNewestArticles is enabled
      let sortedArticles = domainArticles;
      if (this.config.preserveNewestArticles) {
        sortedArticles = domainArticles.sort(
          (a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime()
        );
      }

      const articlesToKeep = sortedArticles.slice(0, this.config.maxArticlesPerDomain);
      const articlesToRemove = sortedArticles.slice(this.config.maxArticlesPerDomain);

      // Record removed articles
      articlesToRemove.forEach(() => {
        this.stats.duplicatesDetected.push({
          method: 'domain_clustering',
          originalIndex: -1,
          duplicateIndex: -1,
          similarity: 0,
          details: `Domain ${domain} exceeded limit of ${this.config.maxArticlesPerDomain} articles`,
        });
      });

      result.push(...articlesToKeep);
    }

    return result;
  }

  /**
   * Initialize statistics tracking
   */
  private initializeStats(): EnhancedDeduplicationStats {
    return {
      originalCount: 0,
      duplicatesRemoved: 0,
      finalCount: 0,
      deduplicationRate: 0,
      duplicatesDetected: [],
      performanceStats: {
        processingTimeMs: 0,
        minHashComparisons: 0,
        titleComparisons: 0,
        urlComparisons: 0,
      },
    };
  }

  /**
   * Finalize statistics and log results
   */
  private finalizeStats(finalArticles: EnhancedNewsArticle[]): void {
    this.stats.finalCount = finalArticles.length;
    this.stats.duplicatesRemoved = this.stats.originalCount - this.stats.finalCount;
    this.stats.deduplicationRate =
      this.stats.originalCount > 0 ? this.stats.duplicatesRemoved / this.stats.originalCount : 0;
    this.stats.performanceStats.processingTimeMs = Date.now() - this.startTime;

    if (this.config.enablePerformanceLogging && this.stats.duplicatesRemoved > 0) {
      logger.info('Enhanced news deduplication completed', {
        component: 'EnhancedNewsDeduplicator',
        stats: {
          originalCount: this.stats.originalCount,
          finalCount: this.stats.finalCount,
          duplicatesRemoved: this.stats.duplicatesRemoved,
          deduplicationRate: `${(this.stats.deduplicationRate * 100).toFixed(1)}%`,
          processingTimeMs: this.stats.performanceStats.processingTimeMs,
        },
        performance: this.stats.performanceStats,
        methodBreakdown: this.getMethodBreakdown(),
      });
    }
  }

  /**
   * Get breakdown of duplicates by detection method
   */
  private getMethodBreakdown(): Record<DeduplicationMethod, number> {
    const breakdown: Partial<Record<DeduplicationMethod, number>> = {};

    for (const duplicate of this.stats.duplicatesDetected) {
      breakdown[duplicate.method] = (breakdown[duplicate.method] || 0) + 1;
    }

    return breakdown as Record<DeduplicationMethod, number>;
  }

  /**
   * Get current statistics
   */
  getStats(): EnhancedDeduplicationStats {
    return { ...this.stats };
  }
}

/**
 * Convenience function for enhanced deduplication
 */
export function deduplicateEnhancedNews(
  articles: EnhancedNewsArticle[],
  config?: Partial<EnhancedDeduplicationConfig>
): { articles: EnhancedNewsArticle[]; stats: EnhancedDeduplicationStats } {
  const deduplicator = new EnhancedNewsDeduplicator(config);
  return deduplicator.deduplicate(articles);
}

/**
 * Utility function to convert GDELT articles to enhanced format
 */
export function convertGDELTToEnhanced(gdeltArticles: GDELTArticle[]): EnhancedNewsArticle[] {
  return gdeltArticles.map(article => ({
    url: article.url,
    title: article.title || '',
    seendate: article.seendate,
    domain: article.domain || URLNormalizer.getDomain(article.url),
    socialimage: article.socialimage || undefined,
    language: article.lang || undefined,
    sourcecountry: article.country || undefined,
    tone: article.tone || undefined,
    urltone: article.urltone || undefined,
  }));
}

/**
 * Performance benchmarking function
 */
export function benchmarkDeduplication(
  articles: EnhancedNewsArticle[],
  configs: Partial<EnhancedDeduplicationConfig>[]
): Array<{ config: string; stats: EnhancedDeduplicationStats }> {
  const results: Array<{ config: string; stats: EnhancedDeduplicationStats }> = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const configName = `Config_${i + 1}`;

    const deduplicator = new EnhancedNewsDeduplicator(config);
    const result = deduplicator.deduplicate([...articles]); // Clone to avoid mutation

    results.push({
      config: configName,
      stats: result.stats,
    });
  }

  return results;
}

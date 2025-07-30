/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Intelligent news deduplication system for GDELT and other news sources
 * Uses multiple algorithms to detect and remove duplicate articles
 */

import { structuredLogger } from '@/lib/logging/logger';

export interface NewsArticle {
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
}

export interface DuplicationStats {
  originalCount: number;
  duplicatesRemoved: number;
  finalCount: number;
  duplicatesDetected: Array<{
    method: string;
    originalIndex: number;
    duplicateIndex: number;
    similarity: number;
  }>;
}

export interface DeduplicationOptions {
  enableUrlDeduplication: boolean;
  enableTitleSimilarity: boolean;
  enableContentSimilarity: boolean;
  enableDomainClustering: boolean;
  titleSimilarityThreshold: number;
  contentSimilarityThreshold: number;
  maxArticlesPerDomain: number;
  preserveNewestArticles: boolean;
  logDuplicates: boolean;
}

const DEFAULT_OPTIONS: DeduplicationOptions = {
  enableUrlDeduplication: true,
  enableTitleSimilarity: true,
  enableContentSimilarity: false, // Disabled by default as content might not be available
  enableDomainClustering: true,
  titleSimilarityThreshold: 0.75,
  contentSimilarityThreshold: 0.85,
  maxArticlesPerDomain: 3,
  preserveNewestArticles: true,
  logDuplicates: true,
};

export class NewsDeduplicator {
  private options: DeduplicationOptions;
  private stats: DuplicationStats;

  constructor(options: Partial<DeduplicationOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.stats = {
      originalCount: 0,
      duplicatesRemoved: 0,
      finalCount: 0,
      duplicatesDetected: [],
    };
  }

  /**
   * Main deduplication function
   */
  deduplicate(articles: NewsArticle[]): { articles: NewsArticle[]; stats: DuplicationStats } {
    this.stats = {
      originalCount: articles.length,
      duplicatesRemoved: 0,
      finalCount: 0,
      duplicatesDetected: [],
    };

    if (articles.length === 0) {
      return { articles: [], stats: this.stats };
    }

    let deduplicatedArticles = [...articles];

    // Step 1: Remove exact URL duplicates
    if (this.options.enableUrlDeduplication) {
      deduplicatedArticles = this.removeUrlDuplicates(deduplicatedArticles);
    }

    // Step 2: Remove articles with similar titles
    if (this.options.enableTitleSimilarity) {
      deduplicatedArticles = this.removeTitleSimilarDuplicates(deduplicatedArticles);
    }

    // Step 3: Remove articles with similar content (if content is available)
    if (this.options.enableContentSimilarity) {
      deduplicatedArticles = this.removeContentSimilarDuplicates(deduplicatedArticles);
    }

    // Step 4: Limit articles per domain
    if (this.options.enableDomainClustering) {
      deduplicatedArticles = this.limitArticlesPerDomain(deduplicatedArticles);
    }

    this.stats.finalCount = deduplicatedArticles.length;
    this.stats.duplicatesRemoved = this.stats.originalCount - this.stats.finalCount;

    if (this.options.logDuplicates && this.stats.duplicatesRemoved > 0) {
      structuredLogger.info('News deduplication completed', {
        originalCount: this.stats.originalCount,
        duplicatesRemoved: this.stats.duplicatesRemoved,
        finalCount: this.stats.finalCount,
        deduplicationMethods: {
          urlDeduplication: this.options.enableUrlDeduplication,
          titleSimilarity: this.options.enableTitleSimilarity,
          contentSimilarity: this.options.enableContentSimilarity,
          domainClustering: this.options.enableDomainClustering,
        },
      });
    }

    return { articles: deduplicatedArticles, stats: this.stats };
  }

  /**
   * Remove articles with identical or very similar URLs
   */
  private removeUrlDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const urlMap = new Map<string, NewsArticle>();
    const normalizedUrlMap = new Map<string, NewsArticle>();

    for (const article of articles) {
      const normalizedUrl = this.normalizeUrl(article.url);

      // Check for exact URL match
      if (urlMap.has(article.url)) {
        this.stats.duplicatesDetected.push({
          method: 'exact_url',
          originalIndex: articles.indexOf(urlMap.get(article.url)!),
          duplicateIndex: articles.indexOf(article),
          similarity: 1.0,
        });
        continue;
      }

      // Check for normalized URL match
      if (normalizedUrlMap.has(normalizedUrl)) {
        this.stats.duplicatesDetected.push({
          method: 'normalized_url',
          originalIndex: articles.indexOf(normalizedUrlMap.get(normalizedUrl)!),
          duplicateIndex: articles.indexOf(article),
          similarity: 0.95,
        });
        continue;
      }

      // Keep the newest article if preserveNewestArticles is enabled
      const existingArticle = normalizedUrlMap.get(normalizedUrl);
      if (existingArticle && this.options.preserveNewestArticles) {
        if (new Date(article.seendate) > new Date(existingArticle.seendate)) {
          normalizedUrlMap.set(normalizedUrl, article);
          urlMap.set(article.url, article);
        }
      } else {
        normalizedUrlMap.set(normalizedUrl, article);
        urlMap.set(article.url, article);
      }
    }

    return Array.from(urlMap.values());
  }

  /**
   * Remove articles with similar titles using Jaccard similarity
   */
  private removeTitleSimilarDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const result: NewsArticle[] = [];

    for (let i = 0; i < articles.length; i++) {
      let isDuplicate = false;

      for (let j = 0; j < result.length; j++) {
        const jaccardSimilarity = this.calculateTitleSimilarity(articles[i].title, result[j].title);
        const editDistanceSimilarity = this.calculateEditDistanceSimilarity(
          articles[i].title,
          result[j].title
        );

        // Consider it a duplicate if either similarity check passes
        const maxSimilarity = Math.max(jaccardSimilarity, editDistanceSimilarity);

        if (maxSimilarity >= this.options.titleSimilarityThreshold) {
          this.stats.duplicatesDetected.push({
            method: 'title_similarity',
            originalIndex: articles.indexOf(result[j]),
            duplicateIndex: i,
            similarity: maxSimilarity,
          });

          // Keep the newer article if preserveNewestArticles is enabled
          if (
            this.options.preserveNewestArticles &&
            new Date(articles[i].seendate) > new Date(result[j].seendate)
          ) {
            result[j] = articles[i];
          }

          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        result.push(articles[i]);
      }
    }

    return result;
  }

  /**
   * Remove articles with similar content (if available)
   */
  private removeContentSimilarDuplicates(articles: NewsArticle[]): NewsArticle[] {
    const result: NewsArticle[] = [];

    for (let i = 0; i < articles.length; i++) {
      const article = articles[i];

      // Skip if no content available
      if (!article.content && !article.summary) {
        result.push(article);
        continue;
      }

      let isDuplicate = false;

      for (let j = 0; j < result.length; j++) {
        const existingArticle = result[j];

        // Skip if no content available for comparison
        if (!existingArticle.content && !existingArticle.summary) {
          continue;
        }

        const similarity = this.calculateContentSimilarity(article, existingArticle);

        if (similarity >= this.options.contentSimilarityThreshold) {
          this.stats.duplicatesDetected.push({
            method: 'content_similarity',
            originalIndex: articles.indexOf(existingArticle),
            duplicateIndex: i,
            similarity,
          });

          // Keep the newer article if preserveNewestArticles is enabled
          if (
            this.options.preserveNewestArticles &&
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
   * Limit the number of articles per domain to avoid overwhelming from single sources
   */
  private limitArticlesPerDomain(articles: NewsArticle[]): NewsArticle[] {
    const domainGroups = new Map<string, NewsArticle[]>();

    // Group articles by domain
    for (const article of articles) {
      const domain = article.domain.toLowerCase();
      if (!domainGroups.has(domain)) {
        domainGroups.set(domain, []);
      }
      domainGroups.get(domain)!.push(article);
    }

    const result: NewsArticle[] = [];

    // Limit articles per domain
    for (const [domain, domainArticles] of domainGroups.entries()) {
      // Sort by date (newest first) if preserveNewestArticles is enabled
      let sortedArticles = domainArticles;
      if (this.options.preserveNewestArticles) {
        sortedArticles = domainArticles.sort(
          (a, b) => new Date(b.seendate).getTime() - new Date(a.seendate).getTime()
        );
      }

      const articlesToKeep = sortedArticles.slice(0, this.options.maxArticlesPerDomain);
      const articlesToRemove = sortedArticles.slice(this.options.maxArticlesPerDomain);

      // Log removed articles
      for (const removedArticle of articlesToRemove) {
        this.stats.duplicatesDetected.push({
          method: 'domain_clustering',
          originalIndex: articles.indexOf(articlesToKeep[0]),
          duplicateIndex: articles.indexOf(removedArticle),
          similarity: 0.0, // Not based on similarity
        });
      }

      result.push(...articlesToKeep);
    }

    return result;
  }

  /**
   * Calculate edit distance similarity for near-identical titles
   */
  private calculateEditDistanceSimilarity(title1: string, title2: string): number {
    const normalized1 = title1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
    const normalized2 = title2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();

    // If titles are very similar in length and content, use edit distance
    const lengthDiff = Math.abs(normalized1.length - normalized2.length);
    const maxLength = Math.max(normalized1.length, normalized2.length);

    // Only use edit distance for titles that are similar in length
    if (lengthDiff > maxLength * 0.3) {
      return 0;
    }

    const editDistance = this.levenshteinDistance(normalized1, normalized2);
    const similarity = 1 - editDistance / maxLength;

    // Only consider high similarity scores from edit distance
    return similarity > 0.85 ? similarity : 0;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Calculate title similarity using Jaccard similarity with word sets
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = this.normalizeTitle(title1);
    const words2 = this.normalizeTitle(title2);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Calculate content similarity (simplified version)
   */
  private calculateContentSimilarity(article1: NewsArticle, article2: NewsArticle): number {
    const content1 = article1.content || article1.summary || '';
    const content2 = article2.content || article2.summary || '';

    if (!content1 || !content2) return 0;

    const words1 = content1
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);
    const words2 = content2
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3);

    const set1 = new Set(words1);
    const set2 = new Set(words2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    if (union.size === 0) return 0;

    return intersection.size / union.size;
  }

  /**
   * Normalize title for comparison with enhanced preprocessing
   */
  private normalizeTitle(title: string): string[] {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .replace(/\b(says?|said|reports?|reported|announces?|announced)\b/g, '') // Remove common news verbs
      .replace(/\b(rep|representative|sen|senator|congress|house|senate)\b/g, '') // Remove political titles
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 2) // Remove short words
      .filter(word => !this.isStopWord(word)) // Remove stop words
      .map(word => word.replace(/s$/, '')); // Simple stemming - remove plural 's'
  }

  /**
   * Check if word is a common stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the',
      'and',
      'for',
      'are',
      'but',
      'not',
      'you',
      'all',
      'can',
      'had',
      'her',
      'was',
      'one',
      'our',
      'out',
      'day',
      'get',
      'has',
      'him',
      'his',
      'how',
      'its',
      'may',
      'new',
      'now',
      'old',
      'see',
      'two',
      'who',
      'boy',
      'did',
      'man',
      'men',
      'put',
      'say',
      'she',
      'too',
      'use',
      'will',
      'with',
    ]);

    return stopWords.has(word.toLowerCase());
  }

  /**
   * Normalize URL for comparison
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      // Remove common tracking parameters
      const trackingParams = [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'ref',
        'referrer',
        'source',
        'fbclid',
        'gclid',
        'msclkid',
      ];

      trackingParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });

      // Remove trailing slashes
      let pathname = urlObj.pathname.replace(/\/+$/, '');
      if (pathname === '') pathname = '/';

      // Sort query parameters for consistent comparison
      urlObj.searchParams.sort();

      return `${urlObj.protocol}//${urlObj.hostname}${pathname}${urlObj.search}`;
    } catch {
      // If URL parsing fails, return original URL
      return url.toLowerCase().replace(/\/+$/, '');
    }
  }

  /**
   * Get deduplication statistics
   */
  getStats(): DuplicationStats {
    return { ...this.stats };
  }
}

/**
 * Convenience function for quick deduplication
 */
export function deduplicateNews(
  articles: NewsArticle[],
  options?: Partial<DeduplicationOptions>
): { articles: NewsArticle[]; stats: DuplicationStats } {
  const deduplicator = new NewsDeduplicator(options);
  return deduplicator.deduplicate(articles);
}

/**
 * Advanced deduplication with cross-source detection
 */
export function deduplicateMultiSourceNews(
  sourceGroups: { source: string; articles: NewsArticle[] }[],
  options?: Partial<DeduplicationOptions>
): {
  articles: NewsArticle[];
  stats: DuplicationStats;
  sourceDistribution: Record<string, number>;
} {
  // Combine all articles with source tracking
  const allArticles: (NewsArticle & { originalSource: string })[] = [];

  for (const group of sourceGroups) {
    for (const article of group.articles) {
      allArticles.push({ ...article, originalSource: group.source });
    }
  }

  // Deduplicate across all sources
  const deduplicator = new NewsDeduplicator(options);
  const { articles: deduplicatedArticles, stats } = deduplicator.deduplicate(allArticles);

  // Calculate source distribution
  const sourceDistribution: Record<string, number> = {};
  for (const article of deduplicatedArticles) {
    const typedArticle = article as NewsArticle & { originalSource: string };
    const source = typedArticle.originalSource || 'unknown';
    sourceDistribution[source] = (sourceDistribution[source] || 0) + 1;
  }

  // Remove the originalSource field from final results
  const cleanedArticles = deduplicatedArticles.map(article => {
    const { originalSource, ...cleanArticle } = article as NewsArticle & {
      originalSource?: string;
    };
    return cleanArticle;
  });

  return {
    articles: cleanedArticles,
    stats,
    sourceDistribution,
  };
}

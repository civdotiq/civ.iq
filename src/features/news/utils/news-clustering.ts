/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * Advanced news clustering and story grouping system
 * Groups related articles into stories and identifies the best representative article
 */

import logger from '@/lib/logging/simple-logger';
import { NewsArticle } from './news-deduplication';

export interface NewsCluster {
  id: string;
  title: string;
  primaryArticle: NewsArticle;
  relatedArticles: NewsArticle[];
  totalArticles: number;
  sources: string[];
  timespan: {
    earliest: string;
    latest: string;
  };
  keywords: string[];
  category: 'breaking' | 'developing' | 'standard' | 'feature';
  importance: number; // 0-1 score
}

export interface ClusteringResult {
  clusters: NewsCluster[];
  unclustered: NewsArticle[];
  totalArticles: number;
  clustersFound: number;
  averageClusterSize: number;
}

export class NewsClusteringService {
  private static instance: NewsClusteringService;

  public static getInstance(): NewsClusteringService {
    if (!NewsClusteringService.instance) {
      NewsClusteringService.instance = new NewsClusteringService();
    }
    return NewsClusteringService.instance;
  }

  /**
   * Main clustering function - groups articles into story clusters
   */
  clusterNews(
    articles: NewsArticle[],
    options?: {
      maxClusters?: number;
      minClusterSize?: number;
      titleSimilarityThreshold?: number;
      timespanHours?: number;
    }
  ): ClusteringResult {
    const {
      maxClusters = 10,
      minClusterSize = 2,
      titleSimilarityThreshold = 0.7,
      timespanHours = 48,
    } = options || {};

    logger.info('Starting news clustering', {
      totalArticles: articles.length,
      maxClusters,
      minClusterSize,
      threshold: titleSimilarityThreshold,
    });

    // Sort articles by recency and importance
    const sortedArticles = articles
      .filter(article => this.isValidArticle(article))
      .sort((a, b) => {
        const timeA = new Date(a.seendate).getTime();
        const timeB = new Date(b.seendate).getTime();
        return timeB - timeA; // Most recent first
      });

    const clusters: NewsCluster[] = [];
    const clustered = new Set<number>();

    // Group articles into clusters
    for (let i = 0; i < sortedArticles.length && clusters.length < maxClusters; i++) {
      if (clustered.has(i)) continue;

      const primaryArticle = sortedArticles[i];
      const relatedArticles: NewsArticle[] = [];

      // Find related articles
      for (let j = i + 1; j < sortedArticles.length; j++) {
        if (clustered.has(j)) continue;

        const article = sortedArticles[j];

        if (
          article &&
          primaryArticle &&
          this.areArticlesRelated(primaryArticle, article, {
            titleSimilarity: titleSimilarityThreshold,
            timespanHours,
          })
        ) {
          relatedArticles.push(article);
          clustered.add(j);
        }
      }

      // Create cluster if we have enough articles
      if (relatedArticles.length >= minClusterSize - 1 && primaryArticle) {
        const cluster = this.createCluster(primaryArticle, relatedArticles);
        clusters.push(cluster);
        clustered.add(i);
      }
    }

    // Get unclustered articles
    const unclustered = sortedArticles.filter((_, index) => !clustered.has(index));

    const result: ClusteringResult = {
      clusters: clusters.sort((a, b) => b.importance - a.importance),
      unclustered,
      totalArticles: articles.length,
      clustersFound: clusters.length,
      averageClusterSize:
        clusters.length > 0
          ? clusters.reduce((sum, c) => sum + c.totalArticles, 0) / clusters.length
          : 0,
    };

    logger.info('News clustering completed', {
      clustersFound: result.clustersFound,
      unclusteredArticles: result.unclustered.length,
      averageClusterSize: result.averageClusterSize,
    });

    return result;
  }

  /**
   * Check if two articles are related and should be in the same cluster
   */
  private areArticlesRelated(
    article1: NewsArticle,
    article2: NewsArticle,
    options: { titleSimilarity: number; timespanHours: number }
  ): boolean {
    // Check time proximity
    const time1 = new Date(article1.seendate).getTime();
    const time2 = new Date(article2.seendate).getTime();
    const timeDiff = Math.abs(time1 - time2);
    const maxTimeDiff = options.timespanHours * 60 * 60 * 1000;

    if (timeDiff > maxTimeDiff) return false;

    // Check title similarity
    const titleSimilarity = this.calculateTitleSimilarity(article1.title, article2.title);
    if (titleSimilarity < options.titleSimilarity) return false;

    // Check domain diversity (avoid clustering articles from same domain unless very similar)
    if (article1.domain === article2.domain) {
      return titleSimilarity > 0.85; // Higher threshold for same domain
    }

    return true;
  }

  /**
   * Calculate similarity between two titles using multiple methods
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    // Normalize titles
    const normalize = (title: string) =>
      title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(word => word.length > 2)
        .filter(word => !this.isStopWord(word));

    const words1 = normalize(title1);
    const words2 = normalize(title2);

    if (words1.length === 0 || words2.length === 0) return 0;

    // Jaccard similarity
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    const jaccardSimilarity = intersection.size / union.size;

    // Word order similarity (for breaking news updates)
    const orderSimilarity = this.calculateSequenceAlignment(words1, words2);

    // Combined score
    return Math.max(jaccardSimilarity, orderSimilarity * 0.8);
  }

  /**
   * Calculate sequence alignment similarity for word order
   */
  private calculateSequenceAlignment(words1: string[], words2: string[]): number {
    const shorter = words1.length < words2.length ? words1 : words2;
    const longer = words1.length >= words2.length ? words1 : words2;

    let matches = 0;
    let i = 0,
      j = 0;

    while (i < shorter.length && j < longer.length) {
      if (shorter[i] === longer[j]) {
        matches++;
        i++;
        j++;
      } else {
        j++;
      }
    }

    return matches / Math.max(words1.length, words2.length);
  }

  /**
   * Create a news cluster from primary article and related articles
   */
  private createCluster(primaryArticle: NewsArticle, relatedArticles: NewsArticle[]): NewsCluster {
    const allArticles = [primaryArticle, ...relatedArticles];

    // Extract common keywords
    const keywords = this.extractCommonKeywords(allArticles);

    // Determine timespan
    const dates = allArticles.map(a => new Date(a.seendate).getTime());
    const earliest = new Date(Math.min(...dates)).toISOString();
    const latest = new Date(Math.max(...dates)).toISOString();

    // Get unique sources
    const sources = [...new Set(allArticles.map(a => a.domain))];

    // Calculate importance score
    const importance = this.calculateImportance(allArticles, keywords);

    // Determine category
    const category = this.categorizeCluster(allArticles, keywords);

    // Generate cluster title (use the most representative title)
    const clusterTitle = this.generateClusterTitle(allArticles);

    return {
      id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: clusterTitle,
      primaryArticle,
      relatedArticles,
      totalArticles: allArticles.length,
      sources,
      timespan: { earliest, latest },
      keywords,
      category,
      importance,
    };
  }

  /**
   * Extract common keywords from clustered articles
   */
  private extractCommonKeywords(articles: NewsArticle[]): string[] {
    const wordFreq = new Map<string, number>();

    articles.forEach(article => {
      const words = article.title
        .toLowerCase()
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 3)
        .filter(word => !this.isStopWord(word));

      words.forEach(word => {
        wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
      });
    });

    // Return words that appear in multiple articles
    return Array.from(wordFreq.entries())
      .filter(([_, count]) => count >= Math.min(2, articles.length * 0.5))
      .sort(([_, a], [__, b]) => b - a)
      .slice(0, 5)
      .map(([word, _]) => word);
  }

  /**
   * Calculate importance score for a cluster
   */
  private calculateImportance(articles: NewsArticle[], keywords: string[]): number {
    let score = 0;

    // More articles = higher importance
    score += Math.min(articles.length * 0.1, 0.3);

    // Source diversity bonus
    const uniqueSources = new Set(articles.map(a => a.domain)).size;
    score += Math.min(uniqueSources * 0.05, 0.2);

    // Recent articles bonus
    const recentCount = articles.filter(a => {
      const age = Date.now() - new Date(a.seendate).getTime();
      return age < 6 * 60 * 60 * 1000; // Last 6 hours
    }).length;
    score += Math.min(recentCount * 0.1, 0.2);

    // Keyword relevance bonus
    const politicalKeywords = [
      'congress',
      'senate',
      'house',
      'bill',
      'vote',
      'election',
      'campaign',
    ];
    const relevantKeywords = keywords.filter(k => politicalKeywords.includes(k.toLowerCase()));
    score += Math.min(relevantKeywords.length * 0.1, 0.3);

    return Math.min(score, 1);
  }

  /**
   * Categorize cluster based on content and timing
   */
  private categorizeCluster(articles: NewsArticle[], keywords: string[]): NewsCluster['category'] {
    const titles = articles.map(a => a.title.toLowerCase()).join(' ');

    if (titles.includes('breaking') || titles.includes('urgent')) {
      return 'breaking';
    }

    if (titles.includes('developing') || titles.includes('update')) {
      return 'developing';
    }

    if (keywords.some(k => ['profile', 'interview', 'analysis'].includes(k))) {
      return 'feature';
    }

    return 'standard';
  }

  /**
   * Generate representative title for the cluster
   */
  private generateClusterTitle(articles: NewsArticle[]): string {
    // Find the title with the most keywords in common with others
    if (articles.length === 0) {
      return 'News Cluster';
    }
    const firstArticle = articles[0];
    if (!firstArticle) {
      return 'News Cluster';
    }
    let bestTitle = firstArticle.title;
    let bestScore = 0;

    articles.forEach(article => {
      const score = articles.reduce((sum, other) => {
        if (article === other) return sum;
        return sum + this.calculateTitleSimilarity(article.title, other.title);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestTitle = article.title;
      }
    });

    return bestTitle;
  }

  /**
   * Validate article for clustering
   */
  private isValidArticle(article: NewsArticle): boolean {
    return !!(
      article.title &&
      article.title.length > 10 &&
      article.seendate &&
      article.domain &&
      article.url
    );
  }

  /**
   * Check if word is a stop word
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
      'says',
      'said',
      'reports',
      'reported',
      'announces',
      'announced',
    ]);

    return stopWords.has(word.toLowerCase());
  }
}

// Export singleton instance
export const newsClusteringService = NewsClusteringService.getInstance();

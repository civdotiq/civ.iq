/**
 * Enhanced News Clustering Engine with Visual Metadata
 * Phase 3: UI/UX Transformation
 *
 * This engine extends the basic clustering to include visual priority,
 * layout hints, and Google News-style metadata for enhanced UI/UX.
 */

import { EnhancedArticle } from '../types/news';

/**
 * Visual priority levels for clusters
 */
export type VisualPriority = 'hero' | 'featured' | 'standard' | 'compact';

/**
 * Story types with visual implications
 */
export type StoryType = 'breaking' | 'developing' | 'ongoing' | 'background';

/**
 * Enhanced news cluster with visual metadata
 */
export interface NewsCluster {
  id: string;
  primaryArticle: EnhancedArticle;
  relatedArticles: EnhancedArticle[];

  // Content metadata
  topic: string;
  storyType: StoryType;
  timeSpan: number; // hours
  sourceCount: number;

  // Visual metadata
  visualPriority: VisualPriority;
  layoutHints: {
    preferredWidth: 'full' | 'half' | 'third';
    showImage: boolean;
    expandable: boolean;
    highlightBreaking: boolean;
  };

  // Quality metrics
  relevanceScore: number;
  diversityScore: number;
  freshness: number; // 0-1, how recent
  engagement: number; // predicted engagement score

  // Timing data
  createdAt: string;
  lastUpdated: string;
  nextUpdate?: string;
}

/**
 * Enhanced clustering configuration
 */
export interface ClusteringConfig {
  minClusterSize: number;
  maxClusterSize: number;
  similarityThreshold: number;
  timeWindowHours: number;
  visualPriorityWeights: {
    recency: number;
    sourceQuality: number;
    topicImportance: number;
    engagementPrediction: number;
  };
}

/**
 * Visual priority service
 */
export class VisualPriorityService {
  private static readonly HIGH_QUALITY_SOURCES = [
    'reuters.com',
    'apnews.com',
    'npr.org',
    'bbc.com',
    'wsj.com',
    'nytimes.com',
    'washingtonpost.com',
    'politico.com',
    'thehill.com',
    'rollcall.com',
  ];

  private static readonly BREAKING_KEYWORDS = [
    'breaking',
    'urgent',
    'just in',
    'developing',
    'update',
    'alert',
    'live',
  ];

  /**
   * Calculate visual priority for a cluster
   */
  static calculateVisualPriority(
    cluster: Omit<NewsCluster, 'visualPriority' | 'layoutHints'>,
    config: ClusteringConfig
  ): VisualPriority {
    let score = 0;
    const weights = config.visualPriorityWeights;

    // Recency score (0-1)
    const hoursOld =
      (Date.now() - new Date(cluster.primaryArticle.publishedDate).getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.max(0, 1 - hoursOld / 24); // Decay over 24 hours
    score += recencyScore * weights.recency;

    // Source quality score (0-1)
    const hasHighQualitySource = cluster.relatedArticles.some(article =>
      this.HIGH_QUALITY_SOURCES.some(source => article.domain.includes(source))
    );
    const sourceQualityScore = hasHighQualitySource ? 1 : 0.5;
    score += sourceQualityScore * weights.sourceQuality;

    // Topic importance score (0-1)
    const isBreaking = this.BREAKING_KEYWORDS.some(keyword =>
      cluster.primaryArticle.title.toLowerCase().includes(keyword)
    );
    const topicScore = isBreaking ? 1 : cluster.relevanceScore;
    score += topicScore * weights.topicImportance;

    // Engagement prediction (0-1)
    const engagementScore = this.predictEngagement(cluster);
    score += engagementScore * weights.engagementPrediction;

    // Normalize score
    const normalizedScore = score / Object.values(weights).reduce((sum, w) => sum + w, 0);

    // Map to visual priority
    if (normalizedScore >= 0.8) return 'hero';
    if (normalizedScore >= 0.6) return 'featured';
    if (normalizedScore >= 0.4) return 'standard';
    return 'compact';
  }

  /**
   * Predict engagement score based on article characteristics
   */
  private static predictEngagement(
    cluster: Omit<NewsCluster, 'visualPriority' | 'layoutHints'>
  ): number {
    let score = 0;

    // Multiple sources indicate broader interest
    score += Math.min(cluster.sourceCount / 5, 1) * 0.3;

    // Recent articles with multiple related stories
    score += Math.min(cluster.relatedArticles.length / 10, 1) * 0.3;

    // Title characteristics
    const title = cluster.primaryArticle.title.toLowerCase();
    if (title.includes('congress') || title.includes('senate') || title.includes('house')) {
      score += 0.2;
    }
    if (title.includes('bill') || title.includes('vote') || title.includes('legislation')) {
      score += 0.2;
    }

    return Math.min(score, 1);
  }

  /**
   * Generate layout hints based on visual priority and content
   */
  static generateLayoutHints(
    cluster: Omit<NewsCluster, 'visualPriority' | 'layoutHints'>,
    priority: VisualPriority
  ): NewsCluster['layoutHints'] {
    const hasImage = cluster.primaryArticle.imageUrl !== undefined;

    switch (priority) {
      case 'hero':
        return {
          preferredWidth: 'full',
          showImage: hasImage,
          expandable: true,
          highlightBreaking: cluster.storyType === 'breaking',
        };

      case 'featured':
        return {
          preferredWidth: 'half',
          showImage: hasImage,
          expandable: true,
          highlightBreaking: cluster.storyType === 'breaking',
        };

      case 'standard':
        return {
          preferredWidth: 'third',
          showImage: hasImage && cluster.relatedArticles.length > 2,
          expandable: cluster.relatedArticles.length > 1,
          highlightBreaking: false,
        };

      case 'compact':
        return {
          preferredWidth: 'third',
          showImage: false,
          expandable: false,
          highlightBreaking: false,
        };
    }
  }
}

/**
 * Enhanced clustering engine with visual metadata
 */
export class NewsClusteringEngine {
  private config: ClusteringConfig;

  constructor(config: Partial<ClusteringConfig> = {}) {
    this.config = {
      minClusterSize: 2,
      maxClusterSize: 25,
      similarityThreshold: 0.4,
      timeWindowHours: 48,
      visualPriorityWeights: {
        recency: 0.3,
        sourceQuality: 0.25,
        topicImportance: 0.25,
        engagementPrediction: 0.2,
      },
      ...config,
    };
  }

  /**
   * Cluster articles with enhanced visual metadata
   */
  async clusterArticles(
    articles: EnhancedArticle[],
    options: {
      maxClusters?: number;
      focusKeywords?: string[];
    } = {}
  ): Promise<NewsCluster[]> {
    const { maxClusters = 10, focusKeywords = [] } = options;

    // Filter articles within time window
    const now = Date.now();
    const timeWindowMs = this.config.timeWindowHours * 60 * 60 * 1000;
    const recentArticles = articles.filter(article => {
      const articleTime = new Date(article.publishedDate).getTime();
      return now - articleTime <= timeWindowMs;
    });

    if (recentArticles.length === 0) {
      return [];
    }

    // Simple clustering by similarity (for Phase 3, we'll use a straightforward approach)
    const clusters = this.performSimpleClustering(recentArticles, focusKeywords);

    // Enhance clusters with visual metadata
    const enhancedClusters = clusters.map(cluster => this.enhanceCluster(cluster));

    // Sort by visual priority and relevance
    enhancedClusters.sort((a, b) => {
      const priorityOrder = { hero: 4, featured: 3, standard: 2, compact: 1 };
      const aPriority = priorityOrder[a.visualPriority];
      const bPriority = priorityOrder[b.visualPriority];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return b.relevanceScore - a.relevanceScore;
    });

    return enhancedClusters.slice(0, maxClusters);
  }

  /**
   * Perform simple clustering based on title similarity and timing
   */
  private performSimpleClustering(
    articles: EnhancedArticle[],
    focusKeywords: string[]
  ): Array<Omit<NewsCluster, 'visualPriority' | 'layoutHints'>> {
    const clusters: Array<Omit<NewsCluster, 'visualPriority' | 'layoutHints'>> = [];
    const used = new Set<string>();

    for (const article of articles) {
      if (used.has(article.url)) continue;

      // Find related articles
      const relatedArticles = articles.filter(other => {
        if (used.has(other.url) || other.url === article.url) return false;

        // Simple similarity check
        const similarity = this.calculateTitleSimilarity(article.title, other.title);
        const timeDiff =
          Math.abs(
            new Date(article.publishedDate).getTime() - new Date(other.publishedDate).getTime()
          ) /
          (1000 * 60 * 60); // hours

        return similarity > this.config.similarityThreshold && timeDiff < 24;
      });

      // Only create cluster if we have enough articles or high relevance
      const totalArticles = [article, ...relatedArticles];
      const hasKeywordMatch = focusKeywords.some(keyword =>
        article.title.toLowerCase().includes(keyword.toLowerCase())
      );

      if (totalArticles.length >= this.config.minClusterSize || hasKeywordMatch) {
        // Mark articles as used
        [article, ...relatedArticles].forEach(a => used.add(a.url));

        // Determine story type
        const storyType = this.determineStoryType(article, relatedArticles);

        // Calculate metrics
        const uniqueSources = new Set([article.domain, ...relatedArticles.map(a => a.domain)]);
        const timeSpan = this.calculateTimeSpan([article, ...relatedArticles]);
        const relevanceScore = this.calculateRelevanceScore(
          article,
          relatedArticles,
          focusKeywords
        );
        const diversityScore = uniqueSources.size / totalArticles.length;
        const freshness = this.calculateFreshness(article);

        clusters.push({
          id: `cluster-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          primaryArticle: article,
          relatedArticles: relatedArticles.slice(0, this.config.maxClusterSize - 1),
          topic: this.extractTopic(article.title),
          storyType,
          timeSpan,
          sourceCount: uniqueSources.size,
          relevanceScore,
          diversityScore,
          freshness,
          engagement: 0.5, // Will be calculated by VisualPriorityService
          createdAt: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        });
      }
    }

    return clusters;
  }

  /**
   * Enhance cluster with visual metadata
   */
  private enhanceCluster(
    cluster: Omit<NewsCluster, 'visualPriority' | 'layoutHints'>
  ): NewsCluster {
    // Calculate visual priority
    const visualPriority = VisualPriorityService.calculateVisualPriority(cluster, this.config);

    // Generate layout hints
    const layoutHints = VisualPriorityService.generateLayoutHints(cluster, visualPriority);

    return {
      ...cluster,
      visualPriority,
      layoutHints,
    };
  }

  /**
   * Calculate simple title similarity using word overlap
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = new Set(
      title1
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    );
    const words2 = new Set(
      title2
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    const intersection = new Set([...words1].filter(w => words2.has(w)));
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Determine story type based on article characteristics
   */
  private determineStoryType(primary: EnhancedArticle, related: EnhancedArticle[]): StoryType {
    const title = primary.title.toLowerCase();
    const hoursOld = (Date.now() - new Date(primary.publishedDate).getTime()) / (1000 * 60 * 60);

    // Check for breaking news indicators
    if (title.includes('breaking') || title.includes('just in') || title.includes('urgent')) {
      return 'breaking';
    }

    // Recent with multiple sources suggests developing story
    if (hoursOld < 12 && related.length > 2) {
      return 'developing';
    }

    // Recent story
    if (hoursOld < 48) {
      return 'ongoing';
    }

    return 'background';
  }

  /**
   * Calculate time span of articles in cluster
   */
  private calculateTimeSpan(articles: EnhancedArticle[]): number {
    if (articles.length <= 1) return 0;

    const times = articles.map(a => new Date(a.publishedDate).getTime());
    const span = (Math.max(...times) - Math.min(...times)) / (1000 * 60 * 60);

    return Math.round(span);
  }

  /**
   * Calculate relevance score for cluster
   */
  private calculateRelevanceScore(
    primary: EnhancedArticle,
    related: EnhancedArticle[],
    focusKeywords: string[]
  ): number {
    let score = primary.relevanceScore || 0.5;

    // Boost for focus keywords
    const keywordMatches = focusKeywords.filter(keyword =>
      primary.title.toLowerCase().includes(keyword.toLowerCase())
    ).length;
    score += keywordMatches * 0.1;

    // Boost for multiple related articles
    score += Math.min(related.length * 0.05, 0.3);

    return Math.min(score, 1);
  }

  /**
   * Calculate freshness score (0-1, 1 being most fresh)
   */
  private calculateFreshness(article: EnhancedArticle): number {
    const hoursOld = (Date.now() - new Date(article.publishedDate).getTime()) / (1000 * 60 * 60);
    return Math.max(0, 1 - hoursOld / 48); // Decay over 48 hours
  }

  /**
   * Extract main topic from title
   */
  private extractTopic(title: string): string {
    // Simple topic extraction - take first part or most important words
    const words = title.split(/\s+/);
    if (words.length <= 8) return title;

    // Return first 8 words with ellipsis
    return words.slice(0, 8).join(' ') + '...';
  }
}

export default NewsClusteringEngine;

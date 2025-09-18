/**
 * Article Clustering Engine for Google News-Style Grouping
 * Phase 2: Hierarchical clustering and topic detection
 *
 * Groups related articles into clusters similar to Google News,
 * with story development tracking and relevance scoring.
 */

import { EnhancedArticle } from '../types/news';
import { SearchDimension } from './gdelt-query-builder-v2';
import logger from '@/lib/logging/simple-logger';

/**
 * News cluster representing a group of related articles
 */
export interface NewsCluster {
  id: string;
  primaryTopic: string;
  topicType: 'breaking' | 'developing' | 'ongoing' | 'background';
  articles: EnhancedArticle[];
  subClusters: NewsCluster[];
  metadata: ClusterMetadata;
  timeline: StoryTimeline;
  representativeArticle: EnhancedArticle;
}

/**
 * Cluster metadata for analysis
 */
export interface ClusterMetadata {
  createdAt: Date;
  updatedAt: Date;
  articleCount: number;
  uniqueSources: number;
  timeRange: {
    earliest: Date;
    latest: Date;
    span: number; // hours
  };
  geography: {
    scope: 'local' | 'state' | 'national' | 'international';
    locations: string[];
  };
  relevanceScore: number;
  coherenceScore: number;
  diversityScore: number;
  dimensions: SearchDimension[];
  keywords: KeywordWeight[];
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
}

/**
 * Story timeline for tracking development
 */
export interface StoryTimeline {
  firstMention: Date;
  lastUpdate: Date;
  keyEvents: TimelineEvent[];
  velocity: 'accelerating' | 'steady' | 'declining' | 'dormant';
  peakActivity: Date;
  totalDuration: number; // hours
}

/**
 * Timeline event in story development
 */
export interface TimelineEvent {
  timestamp: Date;
  type: 'initial' | 'update' | 'development' | 'resolution';
  description: string;
  articleCount: number;
  sources: string[];
}

/**
 * Keyword with weight for topic analysis
 */
export interface KeywordWeight {
  keyword: string;
  weight: number;
  frequency: number;
  tfidf: number;
}

/**
 * Clustering configuration
 */
export interface ClusteringConfig {
  minClusterSize: number;
  maxClusterSize: number;
  similarityThreshold: number;
  timeWindowHours: number;
  enableSubClustering: boolean;
  maxHierarchyDepth: number;
}

/**
 * Topic detection result
 */
export interface TopicDetectionResult {
  primaryTopic: string;
  confidence: number;
  relatedTopics: string[];
  entities: Entity[];
  themes: string[];
}

/**
 * Named entity in articles
 */
export interface Entity {
  name: string;
  type: 'person' | 'organization' | 'location' | 'event' | 'legislation';
  frequency: number;
  salience: number;
}

/**
 * Article Clustering Engine
 */
export class ArticleClusteringEngine {
  private static readonly DEFAULT_CONFIG: ClusteringConfig = {
    minClusterSize: 2,
    maxClusterSize: 50,
    similarityThreshold: 0.6,
    timeWindowHours: 72,
    enableSubClustering: true,
    maxHierarchyDepth: 3,
  };

  private config: ClusteringConfig;
  private stopWords: Set<string>;

  constructor(config: Partial<ClusteringConfig> = {}) {
    this.config = { ...ArticleClusteringEngine.DEFAULT_CONFIG, ...config };
    this.stopWords = new Set([
      'the',
      'a',
      'an',
      'and',
      'or',
      'but',
      'in',
      'on',
      'at',
      'to',
      'for',
      'of',
      'with',
      'by',
      'from',
      'as',
      'is',
      'was',
      'are',
      'were',
      'been',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'can',
      'shall',
      'about',
      'after',
      'before',
      'during',
      'through',
      'under',
      'over',
      'between',
      'into',
    ]);
  }

  /**
   * Cluster articles using hierarchical clustering
   */
  public async clusterArticles(
    articles: EnhancedArticle[],
    options: {
      clusteringMethod?: 'hierarchical' | 'density' | 'temporal';
      maxClusters?: number;
    } = {}
  ): Promise<NewsCluster[]> {
    const startTime = Date.now();

    logger.info('Starting article clustering', {
      component: 'ArticleClusteringEngine',
      metadata: {
        articleCount: articles.length,
        method: options.clusteringMethod || 'hierarchical',
      },
    });

    // Pre-process articles
    const processedArticles = this.preprocessArticles(articles);

    // Perform initial clustering
    let clusters: NewsCluster[];
    switch (options.clusteringMethod || 'hierarchical') {
      case 'hierarchical':
        clusters = await this.hierarchicalClustering(processedArticles);
        break;
      case 'density':
        clusters = await this.densityClustering(processedArticles);
        break;
      case 'temporal':
        clusters = await this.temporalClustering(processedArticles);
        break;
      default:
        clusters = await this.hierarchicalClustering(processedArticles);
    }

    // Apply sub-clustering if enabled
    if (this.config.enableSubClustering) {
      clusters = await this.applySubClustering(clusters);
    }

    // Score and rank clusters
    clusters = this.scoreAndRankClusters(clusters);

    // Limit number of clusters if specified
    if (options.maxClusters && clusters.length > options.maxClusters) {
      clusters = clusters.slice(0, options.maxClusters);
    }

    const duration = Date.now() - startTime;
    logger.info('Article clustering completed', {
      component: 'ArticleClusteringEngine',
      metadata: {
        clusterCount: clusters.length,
        duration,
        averageClusterSize:
          clusters.reduce((sum, c) => sum + c.articles.length, 0) / clusters.length,
      },
    });

    return clusters;
  }

  /**
   * Preprocess articles for clustering
   */
  private preprocessArticles(articles: EnhancedArticle[]): EnhancedArticle[] {
    return articles.map(
      article =>
        ({
          ...article,
          // Add normalized title for comparison
          normalizedTitle: this.normalizeText(article.title),
          // Extract keywords
          keywords: this.extractKeywords(article.title + ' ' + (article.summary || '')),
          // Parse date
          publishedDate: new Date(article.publishedDate),
        }) as any
    );
  }

  /**
   * Hierarchical clustering algorithm
   */
  private async hierarchicalClustering(articles: EnhancedArticle[]): Promise<NewsCluster[]> {
    const clusters: NewsCluster[] = [];
    const processed = new Set<string>();

    // Sort articles by relevance and date
    const sortedArticles = [...articles].sort((a, b) => {
      const scoreDiff = b.relevanceScore - a.relevanceScore;
      if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
      return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
    });

    for (const article of sortedArticles) {
      if (processed.has(article.url)) continue;

      // Find similar articles
      const similarArticles = this.findSimilarArticles(
        article,
        sortedArticles.filter(a => !processed.has(a.url)),
        this.config.similarityThreshold
      );

      if (similarArticles.length >= this.config.minClusterSize - 1) {
        // Create new cluster
        const clusterArticles = [article, ...similarArticles];
        const cluster = this.createCluster(clusterArticles);
        clusters.push(cluster);

        // Mark articles as processed
        clusterArticles.forEach(a => processed.add(a.url));
      } else if (similarArticles.length === 0) {
        // Try to add to existing cluster
        const existingCluster = this.findBestExistingCluster(article, clusters);
        if (existingCluster) {
          existingCluster.articles.push(article);
          this.updateClusterMetadata(existingCluster);
        } else {
          // Create singleton cluster if no match
          const cluster = this.createCluster([article]);
          clusters.push(cluster);
        }
        processed.add(article.url);
      }
    }

    return clusters;
  }

  /**
   * Density-based clustering (DBSCAN-like)
   */
  private async densityClustering(articles: EnhancedArticle[]): Promise<NewsCluster[]> {
    const clusters: NewsCluster[] = [];
    const visited = new Set<string>();
    const noise = new Set<string>();

    for (const article of articles) {
      if (visited.has(article.url)) continue;
      visited.add(article.url);

      const neighbors = this.findNeighbors(article, articles, this.config.similarityThreshold);

      if (neighbors.length < this.config.minClusterSize) {
        noise.add(article.url);
      } else {
        // Create new cluster
        const clusterArticles = this.expandCluster(article, neighbors, articles, visited);
        const cluster = this.createCluster(clusterArticles);
        clusters.push(cluster);
      }
    }

    // Handle noise points
    const noiseArticles = articles.filter(a => noise.has(a.url));
    if (noiseArticles.length > 0) {
      // Try to assign noise to nearest clusters
      for (const article of noiseArticles) {
        const nearestCluster = this.findBestExistingCluster(article, clusters);
        if (nearestCluster) {
          nearestCluster.articles.push(article);
          this.updateClusterMetadata(nearestCluster);
        }
      }
    }

    return clusters;
  }

  /**
   * Temporal clustering based on time windows
   */
  private async temporalClustering(articles: EnhancedArticle[]): Promise<NewsCluster[]> {
    const clusters: NewsCluster[] = [];

    // Sort by date
    const sortedArticles = [...articles].sort(
      (a, b) => new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime()
    );

    let currentWindow: EnhancedArticle[] = [];
    let windowStart = new Date(sortedArticles[0]?.publishedDate || Date.now());

    for (const article of sortedArticles) {
      const articleTime = new Date(article.publishedDate);
      const hoursDiff = (articleTime.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

      if (hoursDiff <= this.config.timeWindowHours) {
        currentWindow.push(article);
      } else {
        // Process current window
        if (currentWindow.length >= this.config.minClusterSize) {
          const windowClusters = await this.hierarchicalClustering(currentWindow);
          clusters.push(...windowClusters);
        }
        // Start new window
        currentWindow = [article];
        windowStart = articleTime;
      }
    }

    // Process final window
    if (currentWindow.length >= this.config.minClusterSize) {
      const windowClusters = await this.hierarchicalClustering(currentWindow);
      clusters.push(...windowClusters);
    }

    return clusters;
  }

  /**
   * Apply sub-clustering to create hierarchy
   */
  private async applySubClustering(
    clusters: NewsCluster[],
    depth: number = 0
  ): Promise<NewsCluster[]> {
    if (depth >= this.config.maxHierarchyDepth) return clusters;

    const processedClusters: NewsCluster[] = [];

    for (const cluster of clusters) {
      if (cluster.articles.length > this.config.maxClusterSize) {
        // Sub-cluster large clusters
        const subClusters = await this.hierarchicalClustering(cluster.articles);
        cluster.subClusters = await this.applySubClustering(subClusters, depth + 1);
        processedClusters.push(cluster);
      } else if (cluster.articles.length >= this.config.minClusterSize * 2) {
        // Try to find sub-topics in medium clusters
        const subTopics = this.detectSubTopics(cluster.articles);
        if (subTopics.length > 1) {
          cluster.subClusters = subTopics.map(articles => this.createCluster(articles));
        }
        processedClusters.push(cluster);
      } else {
        processedClusters.push(cluster);
      }
    }

    return processedClusters;
  }

  /**
   * Create a cluster from articles
   */
  private createCluster(articles: EnhancedArticle[]): NewsCluster {
    const clusterId = `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const topic = this.detectPrimaryTopic(articles);
    const timeline = this.buildStoryTimeline(articles);
    const metadata = this.buildClusterMetadata(articles);
    const representative = this.selectRepresentativeArticle(articles);

    return {
      id: clusterId,
      primaryTopic: topic.primaryTopic,
      topicType: this.determineTopicType(timeline, articles),
      articles,
      subClusters: [],
      metadata,
      timeline,
      representativeArticle: representative,
    };
  }

  /**
   * Detect primary topic from articles
   */
  private detectPrimaryTopic(articles: EnhancedArticle[]): TopicDetectionResult {
    // Extract all text
    const allText = articles.map(a => a.title + ' ' + (a.summary || '')).join(' ');

    // Extract keywords
    const keywords = this.extractKeywords(allText);

    // Find most common entities
    const entities = this.extractEntities(allText);

    // Determine primary topic
    const primaryTopic = this.generateTopicName(keywords, entities, articles);

    // Find related topics
    const relatedTopics = this.findRelatedTopics(keywords, articles);

    // Extract themes
    const themes = this.extractThemes(articles);

    return {
      primaryTopic,
      confidence: this.calculateTopicConfidence(keywords, articles),
      relatedTopics,
      entities,
      themes,
    };
  }

  /**
   * Build story timeline from articles
   */
  private buildStoryTimeline(articles: EnhancedArticle[]): StoryTimeline {
    const dates = articles
      .map(a => new Date(a.publishedDate))
      .sort((a, b) => a.getTime() - b.getTime());
    const firstMention = dates[0];
    const lastUpdate = dates[dates.length - 1];

    if (!firstMention || !lastUpdate) {
      // Return default timeline if dates are invalid
      const defaultDate = new Date();
      return {
        firstMention: defaultDate,
        lastUpdate: defaultDate,
        totalDuration: 0,
        keyEvents: [],
        velocity: 'dormant' as const,
        peakActivity: defaultDate,
      };
    }

    const totalDuration = (lastUpdate.getTime() - firstMention.getTime()) / (1000 * 60 * 60);

    // Group articles by time buckets
    const timeBuckets = this.groupByTimeBuckets(articles);
    const keyEvents = this.identifyKeyEvents(timeBuckets);

    // Calculate velocity
    const velocity = this.calculateStoryVelocity(timeBuckets);

    // Find peak activity
    const peakActivity = this.findPeakActivity(timeBuckets);

    return {
      firstMention,
      lastUpdate,
      keyEvents,
      velocity,
      peakActivity,
      totalDuration,
    };
  }

  /**
   * Build cluster metadata
   */
  private buildClusterMetadata(articles: EnhancedArticle[]): ClusterMetadata {
    const sources = new Set(articles.map(a => a.source));
    const dimensions = new Set(articles.flatMap(a => a.dimensions));
    const dates = articles.map(a => new Date(a.publishedDate));
    const keywords = this.extractKeywords(articles.map(a => a.title).join(' '));

    return {
      createdAt: new Date(),
      updatedAt: new Date(),
      articleCount: articles.length,
      uniqueSources: sources.size,
      timeRange: {
        earliest: new Date(Math.min(...dates.map(d => d.getTime()))),
        latest: new Date(Math.max(...dates.map(d => d.getTime()))),
        span:
          (Math.max(...dates.map(d => d.getTime())) - Math.min(...dates.map(d => d.getTime()))) /
          (1000 * 60 * 60),
      },
      geography: this.determineGeography(articles),
      relevanceScore: this.calculateClusterRelevance(articles),
      coherenceScore: this.calculateCoherence(articles),
      diversityScore: sources.size / articles.length,
      dimensions: Array.from(dimensions),
      keywords: keywords.slice(0, 10),
      sentiment: this.analyzeSentiment(articles),
    };
  }

  /**
   * Find similar articles using multiple similarity metrics
   */
  private findSimilarArticles(
    target: EnhancedArticle,
    candidates: EnhancedArticle[],
    threshold: number
  ): EnhancedArticle[] {
    const similar: EnhancedArticle[] = [];

    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(target, candidate);
      if (similarity >= threshold) {
        similar.push(candidate);
      }
    }

    return similar;
  }

  /**
   * Calculate similarity between articles
   */
  private calculateSimilarity(article1: EnhancedArticle, article2: EnhancedArticle): number {
    // Title similarity
    const titleSim = this.textSimilarity(article1.title, article2.title);

    // Time proximity (articles within same time window are more similar)
    const timeDiff = Math.abs(
      new Date(article1.publishedDate).getTime() - new Date(article2.publishedDate).getTime()
    );
    const timeProximity = Math.max(
      0,
      1 - timeDiff / (1000 * 60 * 60 * this.config.timeWindowHours)
    );

    // Dimension overlap
    const dimensions1 = new Set(article1.dimensions);
    const dimensions2 = new Set(article2.dimensions);
    const dimensionOverlap =
      [...dimensions1].filter(d => dimensions2.has(d)).length /
      Math.max(dimensions1.size, dimensions2.size);

    // Source diversity (different sources covering same story is interesting)
    const sourceDiversity = article1.source !== article2.source ? 0.1 : 0;

    // Weighted combination
    return titleSim * 0.5 + timeProximity * 0.2 + dimensionOverlap * 0.2 + sourceDiversity;
  }

  /**
   * Calculate text similarity using cosine similarity
   */
  private textSimilarity(text1: string, text2: string): number {
    const tokens1 = this.tokenize(text1.toLowerCase());
    const tokens2 = this.tokenize(text2.toLowerCase());

    // Create frequency vectors
    const allTokens = new Set([...tokens1, ...tokens2]);
    const vector1 = this.createVector(tokens1, allTokens);
    const vector2 = this.createVector(tokens2, allTokens);

    // Calculate cosine similarity
    return this.cosineSimilarity(vector1, vector2);
  }

  /**
   * Tokenize text
   */
  private tokenize(text: string): string[] {
    return text
      .split(/\W+/)
      .filter(token => token.length > 2 && !this.stopWords.has(token.toLowerCase()));
  }

  /**
   * Create frequency vector
   */
  private createVector(tokens: string[], vocabulary: Set<string>): number[] {
    const vector: number[] = [];
    const tokenCounts = new Map<string, number>();

    for (const token of tokens) {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    }

    for (const word of vocabulary) {
      vector.push(tokenCounts.get(word) || 0);
    }

    return vector;
  }

  /**
   * Calculate cosine similarity between vectors
   */
  private cosineSimilarity(vector1: number[], vector2: number[]): number {
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (let i = 0; i < Math.min(vector1.length, vector2.length); i++) {
      const v1 = vector1[i] || 0;
      const v2 = vector2[i] || 0;
      dotProduct += v1 * v2;
      magnitude1 += v1 * v1;
      magnitude2 += v2 * v2;
    }

    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Extract keywords using TF-IDF
   */
  private extractKeywords(text: string): KeywordWeight[] {
    const tokens = this.tokenize(text.toLowerCase());
    const termFreq = new Map<string, number>();

    // Calculate term frequency
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    // Convert to keyword weights (simplified TF-IDF)
    const keywords: KeywordWeight[] = [];
    for (const [keyword, frequency] of termFreq.entries()) {
      keywords.push({
        keyword,
        frequency,
        weight: frequency / tokens.length,
        tfidf: frequency * Math.log(100 / (frequency + 1)), // Simplified IDF
      });
    }

    // Sort by weight
    return keywords.sort((a, b) => b.weight - a.weight);
  }

  /**
   * Score and rank clusters
   */
  private scoreAndRankClusters(clusters: NewsCluster[]): NewsCluster[] {
    // Update scores for each cluster
    for (const cluster of clusters) {
      cluster.metadata.relevanceScore = this.calculateClusterRelevance(cluster.articles);
    }

    // Sort by relevance
    return clusters.sort((a, b) => b.metadata.relevanceScore - a.metadata.relevanceScore);
  }

  /**
   * Calculate cluster relevance score
   */
  private calculateClusterRelevance(articles: EnhancedArticle[]): number {
    const avgArticleRelevance =
      articles.reduce((sum, a) => sum + a.relevanceScore, 0) / articles.length;
    const sourceDiversity = new Set(articles.map(a => a.source)).size / articles.length;
    const recency = this.calculateRecency(articles);
    const size = Math.min(articles.length / 10, 1); // Normalize size factor

    return avgArticleRelevance * 0.4 + sourceDiversity * 0.2 + recency * 0.3 + size * 0.1;
  }

  /**
   * Helper methods
   */

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .trim();
  }

  private findNeighbors(
    article: EnhancedArticle,
    articles: EnhancedArticle[],
    threshold: number
  ): EnhancedArticle[] {
    return articles.filter(
      a => a.url !== article.url && this.calculateSimilarity(article, a) >= threshold
    );
  }

  private expandCluster(
    article: EnhancedArticle,
    neighbors: EnhancedArticle[],
    allArticles: EnhancedArticle[],
    visited: Set<string>
  ): EnhancedArticle[] {
    const cluster = [article, ...neighbors];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.url)) {
        visited.add(neighbor.url);
        const newNeighbors = this.findNeighbors(
          neighbor,
          allArticles,
          this.config.similarityThreshold
        );
        if (newNeighbors.length >= this.config.minClusterSize) {
          cluster.push(...this.expandCluster(neighbor, newNeighbors, allArticles, visited));
        }
      }
    }

    return cluster;
  }

  private findBestExistingCluster(
    article: EnhancedArticle,
    clusters: NewsCluster[]
  ): NewsCluster | null {
    let bestCluster: NewsCluster | null = null;
    let bestScore = 0;

    for (const cluster of clusters) {
      const avgSimilarity =
        cluster.articles.reduce((sum, a) => sum + this.calculateSimilarity(article, a), 0) /
        cluster.articles.length;

      if (avgSimilarity > bestScore && avgSimilarity >= this.config.similarityThreshold) {
        bestScore = avgSimilarity;
        bestCluster = cluster;
      }
    }

    return bestCluster;
  }

  private updateClusterMetadata(cluster: NewsCluster): void {
    cluster.metadata = this.buildClusterMetadata(cluster.articles);
    cluster.timeline = this.buildStoryTimeline(cluster.articles);
    const topic = this.detectPrimaryTopic(cluster.articles);
    cluster.primaryTopic = topic.primaryTopic;
  }

  private detectSubTopics(articles: EnhancedArticle[]): EnhancedArticle[][] {
    // Simple sub-topic detection based on keyword clustering
    const subTopics: EnhancedArticle[][] = [];
    const processed = new Set<string>();

    for (const article of articles) {
      if (processed.has(article.url)) continue;

      const similar = articles.filter(
        a =>
          !processed.has(a.url) &&
          this.calculateSimilarity(article, a) >= this.config.similarityThreshold * 1.2
      );

      if (similar.length >= this.config.minClusterSize - 1) {
        const subTopic = [article, ...similar];
        subTopics.push(subTopic);
        subTopic.forEach(a => processed.add(a.url));
      }
    }

    return subTopics;
  }

  private selectRepresentativeArticle(articles: EnhancedArticle[]): EnhancedArticle {
    // Select article with highest relevance and most central to cluster
    let bestArticle = articles[0];
    let bestScore = 0;

    for (const article of articles) {
      // Calculate centrality (average similarity to all other articles)
      const centrality =
        articles.reduce(
          (sum, a) => sum + (a.url !== article.url ? this.calculateSimilarity(article, a) : 0),
          0
        ) /
        (articles.length - 1);

      const score = article.relevanceScore * 0.6 + centrality * 0.4;

      if (score > bestScore) {
        bestScore = score;
        bestArticle = article;
      }
    }

    return bestArticle;
  }

  private determineTopicType(
    timeline: StoryTimeline,
    articles: EnhancedArticle[]
  ): 'breaking' | 'developing' | 'ongoing' | 'background' {
    const hoursSinceFirst = timeline.totalDuration;
    const hoursSinceLast = (Date.now() - timeline.lastUpdate.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLast < 3) return 'breaking';
    if (hoursSinceLast < 24 && timeline.velocity === 'accelerating') return 'developing';
    if (hoursSinceLast < 72 && articles.length > 5) return 'ongoing';
    return 'background';
  }

  private groupByTimeBuckets(articles: EnhancedArticle[]): Map<string, EnhancedArticle[]> {
    const buckets = new Map<string, EnhancedArticle[]>();

    for (const article of articles) {
      const date = new Date(article.publishedDate);
      const bucket = date.toISOString().substr(0, 13); // Hour bucket

      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket)!.push(article);
    }

    return buckets;
  }

  private identifyKeyEvents(timeBuckets: Map<string, EnhancedArticle[]>): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    for (const [bucket, articles] of timeBuckets.entries()) {
      if (articles.length >= 3) {
        // Significant activity
        events.push({
          timestamp: new Date(bucket + ':00:00Z'),
          type: events.length === 0 ? 'initial' : 'update',
          description: this.generateEventDescription(articles),
          articleCount: articles.length,
          sources: [...new Set(articles.map(a => a.source))],
        });
      }
    }

    return events;
  }

  private generateEventDescription(articles: EnhancedArticle[]): string {
    // Find most common keywords
    const keywords = this.extractKeywords(articles.map(a => a.title).join(' '));
    return keywords
      .slice(0, 3)
      .map(k => k.keyword)
      .join(', ');
  }

  private calculateStoryVelocity(
    timeBuckets: Map<string, EnhancedArticle[]>
  ): 'accelerating' | 'steady' | 'declining' | 'dormant' {
    const bucketCounts = Array.from(timeBuckets.values()).map(a => a.length);
    if (bucketCounts.length < 2) return 'dormant';

    const recentAvg = bucketCounts.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const overallAvg = bucketCounts.reduce((a, b) => a + b, 0) / bucketCounts.length;

    if (recentAvg > overallAvg * 1.5) return 'accelerating';
    if (recentAvg < overallAvg * 0.5) return 'declining';
    if (recentAvg === 0) return 'dormant';
    return 'steady';
  }

  private findPeakActivity(timeBuckets: Map<string, EnhancedArticle[]>): Date {
    let maxCount = 0;
    let peakBucket = '';

    for (const [bucket, articles] of timeBuckets.entries()) {
      if (articles.length > maxCount) {
        maxCount = articles.length;
        peakBucket = bucket;
      }
    }

    return new Date(peakBucket + ':00:00Z');
  }

  private generateTopicName(
    keywords: KeywordWeight[],
    entities: Entity[],
    articles: EnhancedArticle[]
  ): string {
    // Prioritize entities
    const topEntity = entities.find(e => e.type === 'person' || e.type === 'organization');
    const topKeywords = keywords.slice(0, 3).map(k => k.keyword);

    if (topEntity) {
      return `${topEntity.name} - ${topKeywords[0]}`;
    }

    return topKeywords.join(' ');
  }

  private findRelatedTopics(keywords: KeywordWeight[], articles: EnhancedArticle[]): string[] {
    const topics = new Set<string>();

    // Extract dimension-based topics
    const dimensions = new Set(articles.flatMap(a => a.dimensions));
    dimensions.forEach(d => topics.add(d.replace('_', ' ')));

    // Add keyword combinations
    const topKeywords = keywords.slice(0, 5).map(k => k.keyword);
    for (let i = 0; i < topKeywords.length - 1; i++) {
      topics.add(`${topKeywords[i]} ${topKeywords[i + 1]}`);
    }

    return Array.from(topics).slice(0, 5);
  }

  private calculateTopicConfidence(keywords: KeywordWeight[], articles: EnhancedArticle[]): number {
    const keywordDiversity = keywords.length / 100; // Normalized
    const articleCount = Math.min(articles.length / 10, 1);
    const sourceDiversity = new Set(articles.map(a => a.source)).size / articles.length;

    return (keywordDiversity + articleCount + sourceDiversity) / 3;
  }

  private extractEntities(text: string): Entity[] {
    // Simplified entity extraction (in production, use NLP library)
    const entities: Entity[] = [];
    const words = text.split(/\W+/).filter(word => word.length > 0);

    // Look for capitalized sequences (potential names)
    for (let i = 0; i < words.length - 1; i++) {
      if (
        words[i] &&
        words[i + 1] &&
        words[i].length > 0 &&
        words[i + 1].length > 0 &&
        words[i][0] === words[i][0].toUpperCase() &&
        words[i + 1][0] === words[i + 1][0].toUpperCase()
      ) {
        const name = `${words[i]} ${words[i + 1]}`;
        entities.push({
          name,
          type: 'person', // Simplified
          frequency: 1,
          salience: 0.5,
        });
      }
    }

    return entities;
  }

  private extractThemes(articles: EnhancedArticle[]): string[] {
    const themes = new Set<string>();

    // Extract from dimensions
    articles.forEach(a => {
      a.dimensions.forEach(d => {
        if (d === SearchDimension.POLICY || d === SearchDimension.COMMITTEE) {
          themes.add(d);
        }
      });
    });

    return Array.from(themes);
  }

  private determineGeography(articles: EnhancedArticle[]): {
    scope: 'local' | 'state' | 'national' | 'international';
    locations: string[];
  } {
    // Simplified geography detection
    const sources = articles.map(a => a.source.toLowerCase());
    let scope: 'local' | 'state' | 'national' | 'international' = 'national';

    if (sources.some(s => s.includes('local') || s.includes('gazette'))) {
      scope = 'local';
    } else if (sources.some(s => s.includes('times') || s.includes('post'))) {
      scope = 'state';
    } else if (sources.some(s => s.includes('bbc') || s.includes('reuters'))) {
      scope = 'international';
    }

    return {
      scope,
      locations: [], // Would extract from article content
    };
  }

  private calculateCoherence(articles: EnhancedArticle[]): number {
    // Calculate average pairwise similarity
    let totalSimilarity = 0;
    let comparisons = 0;

    for (let i = 0; i < articles.length; i++) {
      for (let j = i + 1; j < articles.length; j++) {
        totalSimilarity += this.calculateSimilarity(articles[i], articles[j]);
        comparisons++;
      }
    }

    return comparisons > 0 ? totalSimilarity / comparisons : 0;
  }

  private analyzeSentiment(articles: EnhancedArticle[]): {
    positive: number;
    negative: number;
    neutral: number;
  } {
    // Simplified sentiment (in production, use NLP library)
    const positiveWords = ['success', 'win', 'achieve', 'improve', 'support'];
    const negativeWords = ['fail', 'loss', 'defeat', 'oppose', 'crisis'];

    let positive = 0;
    let negative = 0;

    for (const article of articles) {
      const text = article.title.toLowerCase();
      positive += positiveWords.filter(w => text.includes(w)).length;
      negative += negativeWords.filter(w => text.includes(w)).length;
    }

    const total = positive + negative || 1;
    return {
      positive: positive / total,
      negative: negative / total,
      neutral: 1 - (positive + negative) / total,
    };
  }

  private calculateRecency(articles: EnhancedArticle[]): number {
    const now = Date.now();
    const avgAge =
      articles.reduce((sum, a) => {
        const age = (now - new Date(a.publishedDate).getTime()) / (1000 * 60 * 60); // hours
        return sum + age;
      }, 0) / articles.length;

    // Convert to 0-1 score (24 hours = 0.5)
    return Math.exp(-avgAge / 48);
  }
}

export default ArticleClusteringEngine;

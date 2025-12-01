/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

/**
 * News Types for NewsAPI and Google News Integration
 *
 * These types support the news aggregation system using NewsAPI and Google News RSS.
 */

/**
 * Base news article interface
 */
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

/**
 * Enhanced article interface for display
 */
export interface EnhancedArticle extends NewsArticle {
  // Core article properties (from NewsArticle)
  url: string;
  title: string;
  publishedDate: string; // Maps to seendate from NewsArticle
  source: string; // Derived from domain
  domain: string;
  language?: string;
  summary?: string;
  content?: string;
  imageUrl?: string; // Maps to socialimage from NewsArticle

  // Enhanced properties for display
  relevanceScore: number;
  dimensions: unknown[];
  matchedQueries: string[];
  isDuplicate: boolean;
  clusterGroup?: string;

  // Additional properties for enhanced features
  sentimentScore?: number;
  entityMentions?: string[];
  keywords?: string[];
  categories?: string[];
  representativeRelevance?: number;
  clusterAssignment?: string;
  localImpact?: {
    score: number;
    localRelevance: 'high' | 'medium' | 'low';
    factors: string[];
  };
}

/**
 * Convert NewsArticle to EnhancedArticle
 */
export function enhanceArticle(article: NewsArticle): EnhancedArticle {
  const source = extractSourceFromDomain(article.domain);
  return {
    ...article,
    publishedDate: article.seendate,
    source,
    imageUrl: article.socialimage,

    // Required fields for enhanced article
    relevanceScore: 0.5, // Default relevance score
    dimensions: [],
    matchedQueries: [],
    isDuplicate: false,

    // Optional enhanced features
    entityMentions: [],
    keywords: [],
    categories: [],
  };
}

/**
 * Extract source name from domain
 */
function extractSourceFromDomain(domain: string): string {
  if (!domain) return 'Unknown Source';

  // Remove common prefixes and suffixes
  const source = domain
    .replace(/^(www\.|m\.|mobile\.)/, '')
    .replace(/\.(com|org|net|gov|edu|co\.uk|co\.in)$/, '')
    .split('.')[0];

  // Capitalize first letter - add null safety
  return source ? source.charAt(0).toUpperCase() + source.slice(1) : 'Unknown';
}

/**
 * Extended representative interface for news services
 */
export interface EnhancedRepresentativeForNews {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: string;
  state: string;
  district?: string;
  chamber: 'House' | 'Senate';
  title: string;
  phone?: string;
  email?: string;
  website?: string;
  imageUrl?: string;

  // Optional fields that may be used by news services
  gender?: string;
  nickname?: string;
  leadershipRole?: string;

  // Arrays that may be empty
  terms: Array<{
    congress: string;
    startYear: string;
    endYear: string;
    chamber?: string;
    party?: string;
    state?: string;
    district?: string;
    office?: string;
    stateRank?: string;
    class?: number;
  }>;

  committees?: Array<{
    name: string;
    role?: string;
    title?: string; // Extended committee info
  }>;
}

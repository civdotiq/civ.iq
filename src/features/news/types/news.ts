/**
 * News Types for Phase 3: Google News-Style Interface
 *
 * These types extend the existing NewsArticle interface to support
 * enhanced clustering and Google News-style display features.
 */

import { NewsArticle } from '../utils/news-deduplication';
import { GDELTArticle } from '@/types/gdelt';
// import { SearchDimension } from '../services/gdelt-query-builder-v2'; // Temporarily disabled

/**
 * Enhanced article interface for Google News-style clustering
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

  // Enhanced properties for clustering and search
  relevanceScore: number;
  dimensions: unknown[]; // SearchDimension[] - temporarily unknown for type safety
  matchedQueries: string[];
  isDuplicate: boolean;
  clusterGroup?: string;

  // Additional properties for Google News-style features
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
 * Convert GDELTArticle to EnhancedArticle
 */
export function enhanceGdeltArticle(
  article: GDELTArticle,
  relevanceScore: number = 0.5,
  dimensions: unknown[] = [],
  matchedQueries: string[] = []
): EnhancedArticle {
  const source = extractSourceFromDomain(article.domain || '');
  return {
    // Map GDELTArticle fields to NewsArticle fields
    url: article.url,
    title: article.title || 'Untitled',
    seendate: article.seendate || new Date().toISOString(),
    domain: article.domain || 'unknown',
    language: article.language || undefined,
    sourcecountry: article.sourcecountry || undefined,
    socialimage: article.socialimage || undefined,
    urlmobile: article.urlmobile || undefined,

    // EnhancedArticle specific fields
    publishedDate: article.seendate || new Date().toISOString(),
    source,
    imageUrl: article.socialimage || undefined,

    // Required fields for enhanced article
    relevanceScore,
    dimensions,
    matchedQueries,
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

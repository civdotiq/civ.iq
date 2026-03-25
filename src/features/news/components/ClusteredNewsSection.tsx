/**
 * ClusteredNewsSection - News articles grouped by story
 *
 * Fetches news articles, groups them by title similarity,
 * and renders with mainstream source preference. No editorial judgment.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { EnhancedArticle, enhanceArticle, NewsArticle } from '../types/news';
import { ArticleCard } from './ArticleCard';

export interface ClusteredNewsSectionProps {
  representative: EnhancedRepresentative;
  initialLimit?: number;
  className?: string;
  apiEndpoint?: string;
}

/** Domains preferred as primary article source (order doesn't matter) */
const MAINSTREAM_DOMAINS = new Set([
  'apnews.com',
  'reuters.com',
  'nytimes.com',
  'washingtonpost.com',
  'theguardian.com',
  'politico.com',
  'bbc.com',
  'bbc.co.uk',
  'npr.org',
  'wsj.com',
  'thehill.com',
  'rollcall.com',
  'pbs.org',
  'cbsnews.com',
  'nbcnews.com',
  'abcnews.go.com',
  'cnn.com',
  'spiegel.de',
  'usatoday.com',
]);

interface StoryGroup {
  primary: EnhancedArticle;
  alsoCoveredBy: EnhancedArticle[];
}

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ALSO_COVERED_SHOWN = 5;
const SIMILARITY_THRESHOLD = 0.4;

/**
 * Extract significant words from a title for similarity comparison.
 * Strips common stop words and lowercases everything.
 */
function titleWords(title: string): Set<string> {
  const stop = new Set([
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
    'is',
    'are',
    'was',
    'were',
    'be',
    'been',
    'has',
    'have',
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
    'can',
    'this',
    'that',
    'it',
    'its',
    'not',
    'no',
    'as',
    'if',
    'so',
    'up',
    'out',
    'just',
    'than',
    'then',
    'into',
    'over',
    'after',
    'before',
    'about',
    'between',
    'through',
    'during',
    'each',
    'all',
    'both',
    'few',
    'more',
    'most',
    'other',
    'some',
    'such',
    'only',
    'own',
    'same',
    'also',
    'how',
    'what',
    'which',
    'who',
    'whom',
    'why',
    'where',
    'when',
    'new',
    'says',
    'said',
  ]);
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/);
  return new Set(words.filter(w => w.length > 2 && !stop.has(w)));
}

/**
 * Jaccard similarity between two title word sets.
 */
function titleSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const word of a) {
    if (b.has(word)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Normalize domain for mainstream matching.
 */
function normalizeDomain(domain: string): string {
  return (domain || '').replace(/^(www\.|m\.|mobile\.)/, '').toLowerCase();
}

/**
 * Group articles by title similarity, pick mainstream source as primary.
 */
function groupArticles(articles: EnhancedArticle[]): StoryGroup[] {
  // Sort by date descending (newest first)
  const sorted = [...articles].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
  );

  const grouped = new Set<number>();
  const groups: StoryGroup[] = [];

  // Precompute title words for each article
  const wordSets = sorted.map(a => titleWords(a.title));

  for (let i = 0; i < sorted.length; i++) {
    if (grouped.has(i)) continue;
    const anchor = sorted[i];
    const anchorWords = wordSets[i];
    if (!anchor || !anchorWords) continue;
    grouped.add(i);

    const members: EnhancedArticle[] = [anchor];

    // Find similar ungrouped articles
    for (let j = i + 1; j < sorted.length; j++) {
      if (grouped.has(j)) continue;
      const candidate = sorted[j];
      const candidateWords = wordSets[j];
      if (!candidate || !candidateWords) continue;
      if (titleSimilarity(anchorWords, candidateWords) >= SIMILARITY_THRESHOLD) {
        grouped.add(j);
        members.push(candidate);
      }
    }

    // Pick primary: prefer mainstream source, fallback to most recent (already sorted)
    const mainstream = members.find(m => MAINSTREAM_DOMAINS.has(normalizeDomain(m.domain)));
    const primary = mainstream ?? anchor;
    const alsoCoveredBy = members.filter(m => m !== primary);

    groups.push({ primary, alsoCoveredBy });
  }

  // Sort groups by primary article date (newest first)
  groups.sort(
    (a, b) =>
      new Date(b.primary.publishedDate).getTime() - new Date(a.primary.publishedDate).getTime()
  );

  return groups;
}

export function ClusteredNewsSection({
  representative,
  initialLimit = 20,
  className = '',
  apiEndpoint,
}: ClusteredNewsSectionProps) {
  const [storyGroups, setStoryGroups] = useState<StoryGroup[]>([]);
  const [articleCount, setArticleCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  const endpoint = apiEndpoint || `/api/representative/${representative.bioguideId}/news`;

  const fetchNews = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const url = `${endpoint}?limit=${initialLimit}&page=1`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const rawArticles: NewsArticle[] = data.articles || [];

      if (rawArticles.length === 0) {
        setStoryGroups([]);
        setArticleCount(0);
        setLoading(false);
        return;
      }

      const enhanced = rawArticles.map(enhanceArticle);
      setArticleCount(enhanced.length);
      setStoryGroups(groupArticles(enhanced));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
      setStoryGroups([]);
    } finally {
      setLoading(false);
    }
  }, [endpoint, initialLimit]);

  // Initial fetch
  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      fetchNews();
    }, REFRESH_INTERVAL_MS);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchNews]);

  const handleRefresh = useCallback(() => {
    fetchNews();
  }, [fetchNews]);

  // Loading state
  if (loading && storyGroups.length === 0) {
    return (
      <div className={className}>
        <div className="mb-4">
          <h2 className="aicher-heading type-xl text-gray-900 mb-4">Recent News Coverage</h2>
        </div>
        <div className="py-8 text-center text-sm text-gray-500">Loading articles...</div>
      </div>
    );
  }

  // Error state
  if (error && storyGroups.length === 0) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">!</div>
          <div className="aicher-heading type-lg text-gray-900 mb-2">Unable to load news</div>
          <div className="text-sm text-gray-600 mb-4">{error}</div>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 text-sm font-medium bg-[#3ea2d4] text-white border-2 border-[#3ea2d4] hover:bg-civiq-blue transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  if (storyGroups.length === 0 && !loading) {
    return (
      <div className={className}>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">--</div>
          <div className="aicher-heading type-lg text-gray-900 mb-2">No recent news coverage</div>
          <div className="text-sm text-gray-600">
            No recent articles found for {representative.firstName} {representative.lastName}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="mb-4">
        <h2 className="aicher-heading type-xl text-gray-900 mb-4">Recent News Coverage</h2>
      </div>

      {/* Simple controls: story count + refresh */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">
          {articleCount} {articleCount === 1 ? 'article' : 'articles'} in {storyGroups.length}{' '}
          {storyGroups.length === 1 ? 'story' : 'stories'}
        </span>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="px-3 py-1 text-sm font-medium border-2 border-gray-300 text-gray-700 hover:border-gray-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Story groups */}
      <div className="space-y-6">
        {storyGroups.map((group, index) => (
          <div
            key={group.primary.url || index}
            className="border-b border-gray-200 pb-6 last:border-b-0"
          >
            <ArticleCard article={group.primary} isPrimary showImage />

            {group.alsoCoveredBy.length > 0 && (
              <div className="mt-2 ml-3 text-sm text-gray-500">
                <span>Also covered by: </span>
                {group.alsoCoveredBy.slice(0, MAX_ALSO_COVERED_SHOWN).map((article, i) => (
                  <span key={article.url || i}>
                    {i > 0 && <span> · </span>}
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#3ea2d4] hover:underline"
                    >
                      {article.source || normalizeDomain(article.domain)}
                    </a>
                  </span>
                ))}
                {group.alsoCoveredBy.length > MAX_ALSO_COVERED_SHOWN && (
                  <span> + {group.alsoCoveredBy.length - MAX_ALSO_COVERED_SHOWN} more</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Attribution */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500">
        News data from{' '}
        <a
          href="https://news.google.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#3ea2d4] hover:underline"
        >
          Google News RSS
        </a>
      </div>
    </div>
  );
}

export default ClusteredNewsSection;

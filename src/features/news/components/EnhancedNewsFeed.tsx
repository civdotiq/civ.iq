'use client';

/**
 * Copyright (c) 2019-2025 Mark Sandford
 * Licensed under the MIT License. See LICENSE and NOTICE files.
 */

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import Image from 'next/image';
import { representativeApi } from '@/lib/api/representatives';
import logger from '@/lib/logging/simple-logger';
import { GDELTAttribution } from '@/components/shared/ui/DataSourceAttribution';

interface NewsArticle {
  title: string;
  url: string;
  source: string;
  publishedDate: string;
  language: string;
  summary?: string;
  imageUrl?: string;
  domain: string;
}

interface NewsResponse {
  articles: NewsArticle[];
  totalResults: number;
  searchTerms: string[];
  dataSource?: 'gdelt' | 'cached' | 'fallback';
  cacheStatus?: string;
}

interface EnhancedNewsFeedProps {
  bioguideId: string;
  representative: {
    name: string;
    party: string;
    state: string;
  };
}

export const EnhancedNewsFeed = memo(function EnhancedNewsFeed({
  bioguideId,
  representative,
}: EnhancedNewsFeedProps) {
  const [newsData, setNewsData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<'all' | string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'all' | '7days' | '30days'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNewsData = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setRefreshing(!showLoading);

      try {
        logger.info('Fetching news data for representative', {
          component: 'EnhancedNewsFeed',
          metadata: { bioguideId, showLoading },
        });

        // Use the optimized API client with caching
        const data = await representativeApi.getNews(bioguideId);
        setNewsData(data);

        logger.info('News data fetched successfully', {
          component: 'EnhancedNewsFeed',
          metadata: {
            bioguideId,
            articlesCount: data.articles?.length || 0,
            hasThemes: !!data.themes,
          },
        });
      } catch (error) {
        logger.error('Error fetching news data', {
          component: 'EnhancedNewsFeed',
          error: error as Error,
          metadata: { bioguideId },
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [bioguideId]
  );

  // Auto-refresh optimization using Page Visibility API
  useEffect(() => {
    fetchNewsData();

    let interval: NodeJS.Timeout;

    const startAutoRefresh = () => {
      // Only auto-refresh when page is visible
      if (!document.hidden) {
        interval = setInterval(
          () => {
            fetchNewsData(false);
          },
          5 * 60 * 1000
        ); // 5 minutes for more frequent news updates
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(interval);
      } else {
        // Refresh immediately when page becomes visible
        fetchNewsData(false);
        startAutoRefresh();
      }
    };

    startAutoRefresh();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [bioguideId, fetchNewsData]);

  const sources = useMemo(() => {
    if (!newsData) return ['all'];
    const uniqueSources = Array.from(new Set(newsData.articles.map(article => article.source)));
    return ['all', ...uniqueSources.sort()];
  }, [newsData]);

  const filteredArticles = useMemo(() => {
    if (!newsData) return [];

    let filtered = newsData.articles;

    // Source filter
    if (selectedSource !== 'all') {
      filtered = filtered.filter(article => article.source === selectedSource);
    }

    // Timeframe filter
    if (selectedTimeframe !== 'all') {
      const now = new Date();
      const days = selectedTimeframe === '7days' ? 7 : 30;
      const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(article => new Date(article.publishedDate) >= cutoffDate);
    }

    return filtered.sort(
      (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  }, [newsData, selectedSource, selectedTimeframe]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="flex gap-4">
              <div className="w-24 h-16 bg-gray-200 rounded"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Live News Coverage</h3>
            <p className="text-sm text-gray-600">
              Real-time news tracking for {representative.name}
            </p>
          </div>
          <button
            onClick={() => fetchNewsData(false)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <select
            value={selectedSource}
            onChange={e => setSelectedSource(e.target.value)}
            className="text-sm border border-gray-300 rounded px-3 py-1"
          >
            {sources.map(source => (
              <option key={source} value={source}>
                {source === 'all' ? 'All Sources' : source}
              </option>
            ))}
          </select>

          <select
            value={selectedTimeframe}
            onChange={e => setSelectedTimeframe(e.target.value as 'all' | '7days' | '30days')}
            className="text-sm border border-gray-300 rounded px-3 py-1"
          >
            <option value="all">All Time</option>
            <option value="7days">Past 7 Days</option>
            <option value="30days">Past 30 Days</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-civiq-blue">{filteredArticles.length}</div>
            <div className="text-sm text-gray-600">Articles</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{sources.length - 1}</div>
            <div className="text-sm text-gray-600">Sources</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {newsData?.dataSource === 'gdelt'
                ? 'Live'
                : newsData?.dataSource === 'cached'
                  ? 'Cached'
                  : 'Sample'}
            </div>
            <div className="text-sm text-gray-600">Data Status</div>
          </div>
        </div>

        {/* Search Terms - More readable display */}
        {newsData?.searchTerms && newsData.searchTerms.length > 0 && (
          <div className="mt-4">
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer hover:text-gray-800">
                Searching for news about {representative.name}
              </summary>
              <div className="mt-2 space-y-1">
                {newsData.searchTerms.map(term => {
                  // Make search terms more readable
                  const readableTerm = term
                    .replace(/AND/g, '&')
                    .replace(/OR/g, 'or')
                    .replace(/"/g, '')
                    .replace(/\(/g, '(')
                    .replace(/\)/g, ')');

                  return (
                    <div
                      key={`search-term-${term.slice(0, 50)}`}
                      className="text-xs bg-gray-50 px-2 py-1 rounded font-mono"
                    >
                      {readableTerm}
                    </div>
                  );
                })}
              </div>
            </details>
          </div>
        )}
      </div>

      {/* News Feed */}
      <div className="space-y-4">
        {filteredArticles.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
            No articles found matching the selected criteria.
          </div>
        ) : (
          filteredArticles.map((article, index) => (
            <article
              key={`${article.url}-${index}`}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-200"
            >
              <div className="p-6">
                <div className="flex items-start gap-4">
                  {article.imageUrl && (
                    <div className="flex-shrink-0 w-24 h-16 bg-gray-200 rounded overflow-hidden relative">
                      <Image
                        src={article.imageUrl}
                        alt="Article thumbnail"
                        fill
                        sizes="96px"
                        className="object-cover"
                        priority={index < 3} // Prioritize first 3 images
                        loading={index < 3 ? 'eager' : 'lazy'}
                        onError={() => {
                          // Handle error by hiding the image container
                        }}
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:text-civiq-blue transition-colors"
                        >
                          {article.title}
                        </a>
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      <span className="font-medium text-civiq-blue">{article.source}</span>
                      <span>•</span>
                      <span>{formatDate(article.publishedDate)}</span>
                      <span>•</span>
                      <span className="text-gray-500">{article.domain}</span>
                    </div>

                    {article.summary && (
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">{article.summary}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-sm text-civiq-blue hover:text-civiq-blue/80 font-medium transition-colors"
                      >
                        Read Full Article
                        <svg
                          className="ml-1 w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{article.language}</span>
                        <span>•</span>
                        <span>{article.domain}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      {/* Proper GDELT Attribution */}
      <div className="mt-6">
        <GDELTAttribution variant="compact" />
        {refreshing && (
          <div className="mt-2 text-center">
            <span className="text-sm text-gray-500 inline-flex items-center gap-1">
              <svg
                className="w-3 h-3 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Updating...
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

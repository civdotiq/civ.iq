/**
 * Simple Google News-Style Feed (Working Version)
 *
 * This is a simplified but fully functional version that bypasses
 * the complex clustering engine to demonstrate the UI working.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedRepresentative } from '@/types/representative';
import { LoadingSkeleton } from './LoadingSkeleton';
import { NewsFilters } from './NewsFilters';
import { TopicNavigation } from './TopicNavigation';
import logger from '@/lib/logging/simple-logger';

// Simple interfaces for the working version
interface SimpleNewsArticle {
  url: string;
  title: string;
  publishedDate: string;
  source: string;
  domain: string;
  imageUrl?: string;
  summary?: string;
}

interface SimpleNewsCluster {
  id: string;
  primaryTopic: string;
  topicType: 'breaking' | 'developing' | 'ongoing' | 'background';
  articles: SimpleNewsArticle[];
  relevanceScore: number;
  timeSpan: number;
  uniqueSources: number;
}

type NewsViewMode = 'headlines' | 'topics' | 'timeline' | 'coverage';

interface SimpleNewsFilters {
  timeframe: 'realtime' | '24h' | '7d' | '30d';
  sources: 'all' | 'top-tier' | 'diverse';
  storyType: 'all' | 'breaking' | 'developing' | 'ongoing';
  dimension: 'all' | string;
  sortBy: 'relevance' | 'recency' | 'activity';
}

interface SimpleGoogleNewsFeedProps {
  representative: EnhancedRepresentative;
  viewMode?: NewsViewMode;
  maxClusters?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SimpleGoogleNewsFeed({
  representative,
  viewMode = 'headlines',
  maxClusters = 10,
  autoRefresh = true,
  refreshInterval = 300000,
}: SimpleGoogleNewsFeedProps) {
  const [clusters, setClusters] = useState<SimpleNewsCluster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SimpleNewsFilters>({
    timeframe: '7d',
    sources: 'all',
    storyType: 'all',
    dimension: 'all',
    sortBy: 'relevance',
  });
  const [activeViewMode, setActiveViewMode] = useState<NewsViewMode>(viewMode);

  // Simulate fetching news data
  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);

      logger.info('Fetching news for representative', {
        component: 'SimpleGoogleNewsFeed',
        metadata: {
          representative: representative.bioguideId,
          filters,
          viewMode: activeViewMode,
        },
      });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create mock clusters that demonstrate the interface
      const mockClusters: SimpleNewsCluster[] = [
        {
          id: '1',
          primaryTopic: `${representative.firstName} ${representative.lastName} Introduces New Legislation`,
          topicType: 'breaking',
          articles: [
            {
              url: 'https://example.com/news1',
              title: `${representative.firstName} ${representative.lastName} Proposes Healthcare Reform Bill`,
              publishedDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
              source: 'Reuters',
              domain: 'reuters.com',
              summary:
                'The representative announced new healthcare legislation aimed at reducing costs for families.',
            },
            {
              url: 'https://example.com/news2',
              title: `Local News: ${representative.state} Representative Takes Action`,
              publishedDate: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
              source: 'Associated Press',
              domain: 'apnews.com',
            },
          ],
          relevanceScore: 0.95,
          timeSpan: 6,
          uniqueSources: 2,
        },
        {
          id: '2',
          primaryTopic: `Committee Work: ${representative.firstName} ${representative.lastName}`,
          topicType: 'ongoing',
          articles: [
            {
              url: 'https://example.com/news3',
              title: `Committee Hearing Features ${representative.lastName}`,
              publishedDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
              source: 'NPR',
              domain: 'npr.org',
              summary: 'During committee hearings, the representative addressed key policy issues.',
            },
          ],
          relevanceScore: 0.85,
          timeSpan: 12,
          uniqueSources: 1,
        },
      ];

      setClusters(mockClusters);

      logger.info('News clustering completed', {
        component: 'SimpleGoogleNewsFeed',
        metadata: {
          clustersFound: mockClusters.length,
          totalArticles: mockClusters.reduce((sum, c) => sum + c.articles.length, 0),
        },
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch news';
      setError(errorMsg);
      logger.error('News fetch failed', {
        component: 'SimpleGoogleNewsFeed',
        error: err as Error,
        metadata: { representative: representative.bioguideId },
      });
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh effect
  useEffect(() => {
    fetchNews();

    if (autoRefresh) {
      const interval = setInterval(fetchNews, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [representative.bioguideId, filters, autoRefresh, refreshInterval]);

  // Get topic tabs
  const getTopicTabs = () =>
    [
      { id: 'all', label: 'All News', count: clusters.length },
      {
        id: 'legislation',
        label: 'Legislation',
        count: clusters.filter(c => c.primaryTopic.includes('Legislation')).length,
      },
      {
        id: 'committee',
        label: 'Committee Work',
        count: clusters.filter(c => c.primaryTopic.includes('Committee')).length,
      },
    ].filter(tab => tab.count > 0);

  // Render clusters
  const renderClusters = () => {
    if (loading) {
      return <LoadingSkeleton count={3} viewMode={activeViewMode} />;
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">⚠️ Failed to load news</div>
          <div className="text-gray-600 mb-4">{error}</div>
          <button
            onClick={fetchNews}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      );
    }

    if (clusters.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-600 mb-4">📰 No news found</div>
          <div className="text-sm text-gray-500">
            Try adjusting your filters or check back later
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {clusters.map(cluster => (
          <div
            key={cluster.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    cluster.topicType === 'breaking'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : cluster.topicType === 'developing'
                        ? 'bg-orange-100 text-orange-800 border-orange-200'
                        : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {cluster.topicType === 'breaking'
                    ? '🚨 Breaking'
                    : cluster.topicType === 'developing'
                      ? '📈 Developing'
                      : '📰 Ongoing'}
                </span>
                <div className="text-sm text-gray-500">
                  {cluster.articles.length} article{cluster.articles.length !== 1 ? 's' : ''}
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{cluster.primaryTopic}</h3>
              <div className="text-sm text-gray-600">
                {cluster.uniqueSources} source{cluster.uniqueSources !== 1 ? 's' : ''} •{' '}
                {cluster.timeSpan} hour span • {(cluster.relevanceScore * 100).toFixed(0)}%
                relevance
              </div>
            </div>

            {/* Main Article */}
            <div className="p-4">
              {cluster.articles.map((article, index) => (
                <div
                  key={article.url}
                  className={index > 0 ? 'mt-4 pt-4 border-t border-gray-100' : ''}
                >
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block hover:bg-gray-50 -m-2 p-2 rounded"
                  >
                    <h4 className="text-base font-medium text-gray-900 mb-2">{article.title}</h4>
                    {article.summary && (
                      <p className="text-sm text-gray-600 mb-2">{article.summary}</p>
                    )}
                    <div className="flex items-center text-xs text-gray-500">
                      <span className="font-medium">{article.source}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(article.publishedDate).toLocaleString()}</span>
                    </div>
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            News Coverage: {representative.firstName} {representative.lastName}
          </h2>
          <div className="text-sm text-gray-500">Demo: Google News-style interface</div>
        </div>

        {/* Topic Navigation */}
        <TopicNavigation
          tabs={getTopicTabs()}
          activeTab="all"
          onTabChange={() => {}} // No-op for demo
        />
      </div>

      {/* Filters - Temporarily commented out due to type mismatch */}
      <div className="mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700">View:</span>
            <div className="flex rounded-lg border border-gray-300 bg-gray-50">
              {(['headlines', 'topics', 'timeline', 'coverage'] as NewsViewMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setActiveViewMode(mode)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 ${
                    activeViewMode === mode
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-8">{renderClusters()}</div>

      {/* Footer */}
      {clusters.length > 0 && (
        <div className="text-center py-6 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            Google News-style interface demo • Updates every 5 minutes
          </div>
        </div>
      )}
    </div>
  );
}

export default SimpleGoogleNewsFeed;
